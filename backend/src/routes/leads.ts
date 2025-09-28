import { Router, Request, Response } from 'express';
import { authenticateToken, requireAnalyst } from '../middleware/auth';
import { 
  validateLead, 
  validateBulkStatusUpdate, 
  validateBulkScoring, 
  validateBulkEnrichment, 
  validateBulkDelete 
} from '../middleware/validation';
import { prisma } from '../index';
import { ScoringService } from '../services/scoringService';
import { webSocketService } from '../services/websocketService';
import { webScrapingService } from '../services/webScrapingService';
import { PipelineService } from '../services/pipelineService';
import { Request as ExpressRequest } from 'express';

interface RequestWithFiles extends ExpressRequest {
  files?: any;
}

const router = Router();

// Get all leads
router.get('/', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { campaignId, status, limit = 50, offset = 0 } = req.query;

    const where: any = {};
    if (campaignId) where.campaignId = campaignId as string;
    if (status) where.status = status as string;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        campaign: true,
        assignedTo: true,
        assignedTeam: true,
        scoringDetails: true,
        enrichment: {
          include: {
            contacts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.lead.count({ where });

    res.json({ 
      leads,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create lead
router.post('/', authenticateToken, requireAnalyst, validateLead, async (req: Request, res: Response) => {
  try {
    const { url, companyName, domain, industry, campaignId, assignedToId, assignedTeamId } = req.body;

    const lead = await prisma.lead.create({
      data: {
        url,
        companyName,
        domain,
        industry,
        campaignId,
        assignedToId,
        assignedTeamId,
      },
      include: {
        campaign: true,
        assignedTo: true,
        assignedTeam: true,
      },
    });

    // Update campaign lead count
    if (campaignId) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          currentLeadCount: {
            increment: 1
          }
        }
      });
    }

    // Send WebSocket notification
    await webSocketService.sendLeadCreated(lead);

    // Send user activity notification
    await webSocketService.sendUserActivity(req.user!.id, 'created a new lead');

    res.status(201).json({ lead });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single lead by ID
router.get('/:id', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        campaign: true,
        assignedTo: true,
        assignedTeam: true,
        scoringDetails: {
          include: {
            criteriaScores: true,
          },
        },
        enrichment: {
          include: {
            contacts: true,
          },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ lead });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lead
router.put('/:id', authenticateToken, requireAnalyst, validateLead, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { url, companyName, domain, industry, campaignId, status, assignedToId, assignedTeamId } = req.body;

    // Get the lead before update to check for assignment changes
    const oldLead = await prisma.lead.findUnique({
      where: { id },
      include: { assignedTo: true, assignedTeam: true }
    });

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        url,
        companyName,
        domain,
        industry,
        campaignId,
        status,
        assignedToId,
        assignedTeamId,
      },
      include: {
        campaign: true,
        assignedTo: true,
        assignedTeam: true,
      },
    });

    // Send WebSocket notification for lead update
    await webSocketService.sendLeadUpdated(lead, req.user!.id);

    // Check if lead was assigned to a new user
    if (oldLead && lead.assignedToId && oldLead.assignedToId !== lead.assignedToId) {
      await webSocketService.sendLeadAssigned(lead, lead.assignedToId, req.user!.id);
    }

    // Send user activity notification
    await webSocketService.sendUserActivity(req.user!.id, 'updated a lead');

    res.json({ lead });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enrich lead (using real web scraping)
router.post('/:id/enrich', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get the lead
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { campaign: true }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Remove existing enrichment if any
    await prisma.leadEnrichment.deleteMany({ where: { leadId: id } });

    // Scrape the lead's website
    const scrapingResult = await webScrapingService.scrapeUrl(lead.url, lead.industry);

    if (!scrapingResult.success) {
      return res.status(400).json({ 
        error: 'Failed to scrape website',
        details: scrapingResult.error 
      });
    }

    // Create enrichment with comprehensive scraped data
    const enrichment = await prisma.leadEnrichment.create({
      data: {
        leadId: id,
        companySize: Math.floor(Math.random() * 1000) + 10, // Use random for now
        revenue: `$${(Math.floor(Math.random() * 100) + 1)}M`, // Use random for now
        industry: scrapingResult.structuredData.industry || lead.industry,
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

    res.json({ enrichment });
  } catch (error) {
    console.error('Enrich lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get enrichment details for a lead
router.get('/:id/enrichment', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const enrichment = await prisma.leadEnrichment.findUnique({
      where: { leadId: id },
      include: {
        contacts: true,
        lead: {
          include: {
            campaign: true
          }
        }
      }
    });

    if (!enrichment) {
      return res.status(404).json({ error: 'Enrichment data not found' });
    }

    // Parse JSON fields for easier consumption
    const parsedEnrichment = {
      ...enrichment,
      technologies: enrichment.technologies ? JSON.parse(enrichment.technologies) : [],
      pageKeywords: enrichment.pageKeywords ? JSON.parse(enrichment.pageKeywords) : [],
      services: enrichment.services ? JSON.parse(enrichment.services) : [],
      certifications: enrichment.certifications ? JSON.parse(enrichment.certifications) : [],
    };

    res.json({ enrichment: parsedEnrichment });
  } catch (error) {
    console.error('Get enrichment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk operations
router.post('/bulk/status', authenticateToken, requireAnalyst, validateBulkStatusUpdate, async (req: Request, res: Response) => {
  try {
    const { leadIds, status } = req.body;

    const result = await prisma.lead.updateMany({
      where: {
        id: { in: leadIds }
      },
      data: {
        status
      }
    });

    // Send WebSocket notification for bulk status update
    const notification = {
      type: 'lead_updated' as const,
      title: 'Bulk Status Update',
      message: `Updated ${result.count} leads to ${status} status`,
      data: { leadIds, status, updatedCount: result.count },
      timestamp: new Date()
    };
    webSocketService.sendToAll(notification);

    // Send user activity notification
    await webSocketService.sendUserActivity(req.user!.id, `updated ${result.count} leads to ${status} status`);

    res.json({ 
      success: true,
      updatedCount: result.count,
      message: `Updated ${result.count} leads to ${status} status`
    });
  } catch (error) {
    console.error('Bulk status update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bulk/score', authenticateToken, requireAnalyst, validateBulkScoring, async (req: Request, res: Response) => {
  try {
    const { leadIds, scoringModelId } = req.body;

    let scoredCount = 0;
    let qualifiedCount = 0;

    for (const leadId of leadIds) {
      try {
        const scoringResult = await ScoringService.scoreLead(leadId, scoringModelId);
        await ScoringService.saveScoringResult(leadId, scoringResult);
        scoredCount++;
        if (scoringResult.totalScore >= 70) {
          qualifiedCount++;
        }
      } catch (error) {
        console.error(`Failed to score lead ${leadId}:`, error);
      }
    }

    // Send WebSocket notification for bulk scoring
    const notification = {
      type: 'lead_scored' as const,
      title: 'Bulk Lead Scoring',
      message: `Scored ${scoredCount} leads, ${qualifiedCount} qualified`,
      data: { leadIds, scoringModelId, scoredCount, qualifiedCount },
      timestamp: new Date()
    };
    webSocketService.sendToAll(notification);

    // Send user activity notification
    await webSocketService.sendUserActivity(req.user!.id, `scored ${scoredCount} leads`);

    res.json({ 
      success: true,
      scoredCount,
      qualifiedCount,
      message: `Scored ${scoredCount} leads, ${qualifiedCount} qualified`
    });
  } catch (error) {
    console.error('Bulk scoring error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bulk/enrich', authenticateToken, requireAnalyst, validateBulkEnrichment, async (req: Request, res: Response) => {
  try {
    const { leadIds } = req.body;

    let enrichedCount = 0;

    for (const leadId of leadIds) {
      try {
        // Check if lead exists
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) {
          console.warn(`Lead not found for enrichment: ${leadId}`);
          continue;
        }
        
        // Remove existing enrichment if any
        await prisma.leadEnrichment.deleteMany({ where: { leadId } });

        // Scrape the lead's website
        const scrapingResult = await webScrapingService.scrapeUrl(lead.url, lead.industry);

        if (scrapingResult.success) {
          // Create enrichment with comprehensive scraped data
          await prisma.leadEnrichment.create({
            data: {
              leadId,
              companySize: Math.floor(Math.random() * 1000) + 10, // Use random for now
              revenue: `$${(Math.floor(Math.random() * 100) + 1)}M`, // Use random for now
              industry: scrapingResult.structuredData.industry || lead.industry,
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
            }
          });
          enrichedCount++;
        } else {
          console.warn(`Failed to scrape ${lead.url}: ${scrapingResult.error}`);
        }
      } catch (error) {
        console.error(`Failed to enrich lead ${leadId}:`, error);
      }
    }

    // Send WebSocket notification for bulk enrichment
    const notification = {
      type: 'lead_updated' as const,
      title: 'Bulk Lead Enrichment',
      message: `Enriched ${enrichedCount} leads with additional data`,
      data: { leadIds, enrichedCount },
      timestamp: new Date()
    };
    webSocketService.sendToAll(notification);

    // Send user activity notification
    await webSocketService.sendUserActivity(req.user!.id, `enriched ${enrichedCount} leads`);

    res.json({ 
      success: true,
      enrichedCount,
      message: `Enriched ${enrichedCount} leads`
    });
  } catch (error) {
    console.error('Bulk enrichment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/bulk', authenticateToken, requireAnalyst, validateBulkDelete, async (req: Request, res: Response) => {
  try {
    const { leadIds } = req.body;

    // Get leads with campaign info before deleting
    const leadsToDelete = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: { id: true, campaignId: true }
    });

    // Count leads per campaign
    const campaignCounts: Record<string, number> = {};
    leadsToDelete.forEach(lead => {
      if (lead.campaignId) {
        campaignCounts[lead.campaignId] = (campaignCounts[lead.campaignId] || 0) + 1;
      }
    });

    const result = await prisma.lead.deleteMany({
      where: {
        id: { in: leadIds }
      }
    });

    // Update campaign lead counts
    for (const [campaignId, count] of Object.entries(campaignCounts)) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          currentLeadCount: {
            decrement: count
          }
        }
      });
    }

    res.json({ 
      success: true,
      deletedCount: result.count,
      message: `Deleted ${result.count} leads`
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import leads from CSV
router.post('/import', authenticateToken, requireAnalyst, async (req: RequestWithFiles, res: Response) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file as any;
    const campaignId = req.body.campaignId;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      return res.status(400).json({ error: 'Campaign not found' });
    }

    const csvContent = file.data.toString();
    const lines = csvContent.split('\n');
    const headers = lines[0]?.split(',').map((h: string) => h.trim()) || [];
    
    const results = {
      total: 0,
      success: 0,
      errors: [] as Array<{ row: number; field: string; message: string }>
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      results.total++;
      const values = line.split(',').map((v: string) => v.trim());
      const row: any = {};
      
      headers.forEach((header: string, index: number) => {
        row[header] = values[index] || '';
      });

      try {
        // Validate required fields
        if (!row.url || !row.companyName || !row.domain) {
          results.errors.push({
            row: i + 1,
            field: 'required',
            message: 'Missing required fields: url, companyName, domain'
          });
          continue;
        }

        // Create lead
        await prisma.lead.create({
          data: {
            url: row.url,
            companyName: row.companyName,
            domain: row.domain,
            industry: row.industry || 'Unknown',
            campaignId: campaignId,
            status: 'RAW'
          }
        });

        results.success++;
      } catch (error) {
        results.errors.push({
          row: i + 1,
          field: 'general',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      ...results,
      success: true
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export leads
router.post('/export', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { format = 'csv', includeEnrichment = true, includeScoring = true, filters = {} } = req.body;

    // Build where clause from filters
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.assignedTeamId) where.assignedTeamId = filters.assignedTeamId;
    if (filters.industry) where.industry = filters.industry;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        campaign: true,
        assignedTo: true,
        assignedTeam: true,
        enrichment: includeEnrichment,
        scoringDetails: includeScoring ? {
          include: {
            criteriaScores: true
          }
        } : false
      },
      orderBy: { createdAt: 'desc' }
    });

    if (format === 'csv') {
      const csvHeaders = [
        'id', 'url', 'companyName', 'domain', 'industry', 'status', 'score',
        'campaignName', 'assignedTo', 'assignedTeam', 'createdAt', 'lastScoredAt'
      ];

      if (includeEnrichment) {
        csvHeaders.push('companySize', 'revenue', 'technologies');
      }

      if (includeScoring) {
        csvHeaders.push('totalScore', 'confidence', 'scoringModelVersion');
      }

      let csvContent = csvHeaders.join(',') + '\n';

      leads.forEach(lead => {
        const row = [
          lead.id,
          lead.url,
          lead.companyName,
          lead.domain,
          lead.industry,
          lead.status,
          lead.score || '',
          lead.campaign?.name || '',
          lead.assignedTo?.fullName || '',
          lead.assignedTeam?.name || '',
          lead.createdAt.toISOString(),
          lead.lastScoredAt?.toISOString() || ''
        ];

        if (includeEnrichment && lead.enrichment) {
          row.push(
            lead.enrichment.companySize?.toString() || '',
            lead.enrichment.revenue || '',
            lead.enrichment.technologies || ''
          );
        }

        if (includeScoring && lead.scoringDetails) {
          row.push(
            lead.scoringDetails.totalScore.toString(),
            lead.scoringDetails.confidence.toString(),
            lead.scoringDetails.scoringModelVersion
          );
        }

        csvContent += row.map(field => `"${field}"`).join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(leads);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Automated pipeline: Process URLs through complete workflow
router.post('/pipeline', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { urls, campaignId, industry } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs array is required and must not be empty' });
    }

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    // Validate campaign exists and has a scoring model
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { scoringModel: true }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!campaign.scoringModel) {
      return res.status(400).json({ 
        error: 'Campaign must have a scoring model assigned before running pipeline' 
      });
    }

    // Validate URLs
    const validUrls = urls.filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      return res.status(400).json({ error: 'No valid URLs provided' });
    }

    if (validUrls.length !== urls.length) {
      console.warn(`Filtered out ${urls.length - validUrls.length} invalid URLs`);
    }

    // Start the pipeline (this runs asynchronously)
    const pipelineJob = await PipelineService.processUrls(validUrls, campaignId, industry);

    // Send user activity notification
    await webSocketService.sendUserActivity(req.user!.id, `started pipeline for ${validUrls.length} URLs`);

    res.json({
      success: true,
      jobId: pipelineJob.id,
      message: `Pipeline started for ${validUrls.length} URLs`,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        scoringModel: {
          id: campaign.scoringModel.id,
          name: campaign.scoringModel.name
        }
      },
      urls: validUrls,
      industry: industry || 'Auto-detected'
    });

  } catch (error) {
    console.error('Pipeline error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pipeline job status
router.get('/pipeline/:jobId', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    const job = await PipelineService.getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Pipeline job not found' });
    }

    res.json({ job });
  } catch (error) {
    console.error('Get pipeline job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get campaign pipeline jobs
router.get('/campaign/:campaignId/pipeline', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const jobs = await PipelineService.getCampaignJobs(campaignId);
    
    res.json({ jobs });
  } catch (error) {
    console.error('Get campaign pipeline jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed pipeline results with scoring breakdown and ranking
router.get('/pipeline-results/:campaignId', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const results = await PipelineService.getDetailedPipelineResults(campaignId);
    
    res.json(results);
  } catch (error) {
    console.error('Pipeline results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
