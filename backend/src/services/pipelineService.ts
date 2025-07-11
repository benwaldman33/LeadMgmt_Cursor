import { prisma } from '../index';
import { webScrapingService } from './webScrapingService';
import { ScoringService } from './scoringService';
import { webSocketService } from './websocketService';

export interface PipelineJob {
  id: string;
  campaignId: string;
  urls: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    scraped: number;
    scored: number;
    qualified: number;
  };
  results: Array<{
    url: string;
    leadId?: string;
    status: 'success' | 'failed';
    error?: string;
    score?: number;
    qualified?: boolean;
  }>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export class PipelineService {
  /**
   * Process a list of URLs through the complete pipeline
   */
  static async processUrls(
    urls: string[], 
    campaignId: string, 
    industry?: string
  ): Promise<PipelineJob> {
    const jobId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: PipelineJob = {
      id: jobId,
      campaignId,
      urls,
      status: 'pending',
      progress: {
        total: urls.length,
        processed: 0,
        scraped: 0,
        scored: 0,
        qualified: 0
      },
      results: [],
      createdAt: new Date()
    };

    try {
      // Get campaign and scoring model
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { scoringModel: true }
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (!campaign.scoringModel) {
        throw new Error('Campaign must have a scoring model assigned');
      }

      job.status = 'running';
      job.startedAt = new Date();

      // Send initial notification
      await webSocketService.sendPipelineNotification(
        'pipeline_started',
        'Pipeline Started',
        `Processing ${urls.length} URLs for campaign: ${campaign.name}`,
        { jobId, campaignId, totalUrls: urls.length }
      );

      // Process each URL
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        
        try {
          // Step 1: Create lead
          const lead = await this.createLeadFromUrl(url, campaignId, industry);
          job.progress.processed++;
          
          // Step 2: Scrape and enrich
          const enrichment = await this.scrapeAndEnrich(lead.id, url, industry);
          if (enrichment) {
            job.progress.scraped++;
          }
          
          // Step 3: Score the lead
          const scoringResult = await ScoringService.scoreLead(lead.id, campaign.scoringModel!.id);
          await ScoringService.saveScoringResult(lead.id, scoringResult);
          job.progress.scored++;
          
          if (scoringResult.totalScore >= 70) {
            job.progress.qualified++;
          }
          
          // Add to results
          job.results.push({
            url,
            leadId: lead.id,
            status: 'success',
            score: scoringResult.totalScore,
            qualified: scoringResult.totalScore >= 70
          });

        } catch (error) {
          console.error(`Failed to process URL ${url}:`, error);
          job.results.push({
            url,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Update progress notification
        await webSocketService.sendPipelineNotification(
          'pipeline_progress',
          'Pipeline Progress',
          `Processed ${job.progress.processed}/${job.progress.total} URLs`,
          { 
            jobId, 
            progress: job.progress,
            currentUrl: url,
            currentIndex: i + 1
          }
        );
      }

      job.status = 'completed';
      job.completedAt = new Date();

      // Send completion notification
      await webSocketService.sendPipelineNotification(
        'pipeline_completed',
        'Pipeline Completed',
        `Successfully processed ${job.progress.processed} URLs. ${job.progress.qualified} leads qualified.`,
        { 
          jobId, 
          results: job.results,
          summary: job.progress
        }
      );

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();

      // Send failure notification
      await webSocketService.sendPipelineNotification(
        'pipeline_failed',
        'Pipeline Failed',
        `Pipeline failed: ${job.error}`,
        { jobId, error: job.error }
      );
    }

    return job;
  }

  /**
   * Create a lead from a URL
   */
  private static async createLeadFromUrl(url: string, campaignId: string, industry?: string): Promise<any> {
    // Extract domain from URL
    const domain = new URL(url).hostname;
    
    // Create basic lead
    const lead = await prisma.lead.create({
      data: {
        url,
        companyName: domain, // Will be updated during enrichment
        domain,
        industry: industry || 'Unknown',
        campaignId,
        status: 'RAW'
      }
    });

    return lead;
  }

  /**
   * Scrape and enrich a lead
   */
  private static async scrapeAndEnrich(leadId: string, url: string, industry?: string): Promise<any> {
    try {
      // Remove existing enrichment if any
      await prisma.leadEnrichment.deleteMany({ where: { leadId } });

      // Scrape the website
      const scrapingResult = await webScrapingService.scrapeUrl(url, industry);

      if (!scrapingResult.success) {
        throw new Error(`Failed to scrape ${url}: ${scrapingResult.error}`);
      }

      // Create enrichment with comprehensive scraped data
      const enrichment = await prisma.leadEnrichment.create({
        data: {
          leadId,
          companySize: Math.floor(Math.random() * 1000) + 10, // Use random for now
          revenue: `$${(Math.floor(Math.random() * 100) + 1)}M`, // Use random for now
          industry: scrapingResult.structuredData.industry || industry || 'Unknown',
          technologies: JSON.stringify(scrapingResult.structuredData.technologies || []),
          
          // Store full scraped content (truncated to fit database)
          scrapedContent: scrapingResult.content.substring(0, 10000), // Limit to 10KB
          pageTitle: scrapingResult.metadata.title,
          pageDescription: scrapingResult.metadata.description,
          pageKeywords: JSON.stringify(scrapingResult.metadata.keywords),
          pageLanguage: scrapingResult.metadata.language,
          lastModified: scrapingResult.metadata.lastModified,
          
          // Store structured data
          companyName: scrapingResult.structuredData.companyName,
          services: JSON.stringify(scrapingResult.structuredData.services || []),
          certifications: JSON.stringify(scrapingResult.structuredData.certifications || []),
          contactEmail: scrapingResult.structuredData.contactInfo?.email,
          contactPhone: scrapingResult.structuredData.contactInfo?.phone,
          contactAddress: scrapingResult.structuredData.contactInfo?.address,
          
          // Store scraping metadata
          processingTime: scrapingResult.processingTime,
          scrapingSuccess: scrapingResult.success,
          scrapingError: scrapingResult.error,
          source: 'WEB_SCRAPING',
          
          // Create contacts if contact info found
          contacts: {
            create: scrapingResult.structuredData.contactInfo?.email ? [
              {
                name: 'Contact from Website',
                email: scrapingResult.structuredData.contactInfo.email,
                title: 'Primary Contact',
                linkedinUrl: '',
                isPrimaryContact: true,
              }
            ] : []
          }
        },
        include: { contacts: true }
      });

      // Update lead with company name if found
      if (scrapingResult.structuredData.companyName) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { companyName: scrapingResult.structuredData.companyName }
        });
      }

      return enrichment;
    } catch (error) {
      console.error(`Failed to enrich lead ${leadId}:`, error);
      throw error;
    }
  }

  /**
   * Get pipeline job status
   */
  static async getJobStatus(jobId: string): Promise<PipelineJob | null> {
    // For now, we'll return null since we're not persisting jobs
    // In a production system, you'd want to store jobs in the database
    return null;
  }

  /**
   * Get all pipeline jobs for a campaign
   */
  static async getCampaignJobs(campaignId: string): Promise<PipelineJob[]> {
    // For now, return empty array since we're not persisting jobs
    // In a production system, you'd query the database
    return [];
  }
} 