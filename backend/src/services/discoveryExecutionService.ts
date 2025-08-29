import { PrismaClient } from '@prisma/client';
import { AuditLogService } from './auditLogService';

const prisma = new PrismaClient();

export interface DiscoveryExecutionConfig {
  targetProspectCount?: number;
  phases?: string[];
  budgetLimit?: number;
  timeLimit?: string;
  sources?: {
    directories?: boolean;
    searchEngines?: boolean;
    socialMedia?: boolean;
    trade?: boolean;
  };
  filters?: {
    minEmployees?: number;
    maxEmployees?: number;
    minRevenue?: number;
    maxRevenue?: number;
    excludeDomains?: string[];
  };
}

export interface DiscoveryProgress {
  phase: string;
  status: string;
  progress: number;
  prospectsFound: number;
  prospectsAnalyzed: number;
  leadsQualified: number;
  leadsCreated: number;
  estimatedCompletion?: Date;
  currentActivity?: string;
  errors?: string[];
}

export class DiscoveryExecutionService {
  constructor() {
    // Simplified constructor for now
  }

  /**
   * Create a new discovery model from the wizard data
   */
  async createDiscoveryModel(data: {
    name: string;
    industry: string;
    subIndustry: string;
    product: string;
    buyerProfile: any;
    searchStrategy: any;
    marketSize?: number;
    userId: string;
  }): Promise<any> {
    try {
      const discoveryModel = await prisma.discoveryModel.create({
        data: {
          name: data.name,
          industry: data.industry,
          subIndustry: data.subIndustry,
          product: data.product,
          marketSize: data.marketSize,
          buyerProfile: JSON.stringify(data.buyerProfile),
          searchStrategy: JSON.stringify(data.searchStrategy),
          targetCriteria: JSON.stringify({
            industry: data.industry,
            subIndustry: data.subIndustry,
            product: data.product
          }),
          createdById: data.userId,
          isActive: true,
          executionCount: 0
        }
      });

      // TODO: Implement audit logging
      console.log(`Audit: DISCOVERY_MODEL_CREATED - ${discoveryModel.id} by ${data.userId}`);

      return discoveryModel;
    } catch (error) {
      console.error('Error creating discovery model:', error);
      throw new Error('Failed to create discovery model');
    }
  }

  /**
   * Start a new discovery execution
   */
  async startDiscoveryExecution(
    discoveryModelId: string, 
    userId: string,
    config: DiscoveryExecutionConfig = {}
  ): Promise<any> {
    try {
      // Get the discovery model
      const discoveryModel = await prisma.discoveryModel.findUnique({
        where: { id: discoveryModelId },
        include: { createdBy: true }
      });

      if (!discoveryModel) {
        throw new Error('Discovery model not found');
      }

      // Create execution record
      const execution = await prisma.discoveryExecution.create({
        data: {
          name: `${discoveryModel.name} - Execution ${discoveryModel.executionCount + 1}`,
          status: 'planning',
          phase: 'initialization',
          prospectsFound: 0,
          prospectsAnalyzed: 0,
          leadsQualified: 0,
          leadsCreated: 0,
          executionConfig: JSON.stringify({
            targetProspectCount: config.targetProspectCount || 5000,
            phases: config.phases || ['market_research', 'web_scraping', 'content_analysis', 'lead_qualification'],
            budgetLimit: config.budgetLimit || 500,
            timeLimit: config.timeLimit || '14_days',
            ...config
          }),
          discoveryModelId: discoveryModelId,
          triggeredById: userId,
          startedAt: new Date()
        }
      });

      // Update discovery model execution count
      await prisma.discoveryModel.update({
        where: { id: discoveryModelId },
        data: { 
          executionCount: { increment: 1 },
          lastExecuted: new Date()
        }
      });

      // Start the execution process asynchronously
      this.executeDiscoveryPhases(execution.id, userId);

      // TODO: Implement audit logging
      console.log(`Audit: DISCOVERY_EXECUTION_STARTED - ${execution.id} by ${userId}`);

      return execution;
    } catch (error) {
      console.error('Error starting discovery execution:', error);
      throw new Error('Failed to start discovery execution');
    }
  }

  /**
   * Execute the discovery phases asynchronously
   */
  private async executeDiscoveryPhases(executionId: string, userId: string): Promise<void> {
    try {
      // Get execution details
      const execution = await prisma.discoveryExecution.findUnique({
        where: { id: executionId },
        include: { 
          discoveryModel: true,
          triggeredBy: true
        }
      });

      if (!execution) {
        throw new Error('Execution not found');
      }

      const config = JSON.parse(execution.executionConfig);
      const buyerProfile = JSON.parse(execution.discoveryModel.buyerProfile);
      const searchStrategy = JSON.parse(execution.discoveryModel.searchStrategy);

      // Phase 1: Market Research
      await this.executeMarketResearchPhase(executionId, buyerProfile, searchStrategy, config);
      
      // Phase 2: Web Scraping  
      await this.executeWebScrapingPhase(executionId, config);
      
      // Phase 3: Content Analysis
      await this.executeContentAnalysisPhase(executionId, buyerProfile, config);
      
      // Phase 4: Lead Qualification
      await this.executeLeadQualificationPhase(executionId, buyerProfile, config);

      // Mark execution as completed
      await this.updateExecutionStatus(executionId, 'completed', 'completed', {
        currentActivity: 'Discovery process completed successfully'
      });

    } catch (error) {
      console.error('Error in discovery execution:', error);
      await this.updateExecutionStatus(executionId, 'failed', 'error', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: JSON.stringify(error)
      });
    }
  }

  /**
   * Phase 1: Market Research - Find target companies
   */
  private async executeMarketResearchPhase(
    executionId: string, 
    buyerProfile: any, 
    searchStrategy: any, 
    config: any
  ): Promise<void> {
    await this.updateExecutionStatus(executionId, 'running', 'market_research', {
      currentActivity: 'Searching business directories and databases...'
    });

    // Simulate market research with progressive updates
    const targetCount = config.targetProspectCount || 5000;
    const batches = 10;
    const batchSize = Math.floor(targetCount / batches);

    for (let i = 0; i < batches; i++) {
      // Simulate finding prospects
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay per batch
      
      const foundCount = (i + 1) * batchSize;
      const progress = Math.round((foundCount / targetCount) * 100);

      // Create mock prospect records
      await this.createMockProspects(executionId, batchSize, `batch_${i + 1}`);

      await this.updateExecutionProgress(executionId, {
        prospectsFound: foundCount,
        currentActivity: `Found ${foundCount.toLocaleString()} prospects from business directories...`
      });

      // Send real-time update via WebSocket
      this.broadcastProgress(executionId, {
        phase: 'market_research',
        progress: progress,
        prospectsFound: foundCount,
        currentActivity: `Scanning business directories... ${foundCount.toLocaleString()} prospects found`
      });
    }
  }

  /**
   * Phase 2: Web Scraping - Extract website content
   */
  private async executeWebScrapingPhase(executionId: string, config: any): Promise<void> {
    await this.updateExecutionStatus(executionId, 'running', 'web_scraping', {
      currentActivity: 'Configuring web scrapers...'
    });

    const execution = await prisma.discoveryExecution.findUnique({
      where: { id: executionId },
      include: { prospects: true }
    });

    if (!execution) return;

    const totalProspects = execution.prospects.length;
    const batches = 20;
    const batchSize = Math.floor(totalProspects / batches);

    for (let i = 0; i < batches; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay per batch
      
      const scrapedCount = (i + 1) * batchSize;
      const progress = Math.round((scrapedCount / totalProspects) * 100);

      // Update prospects with mock scraped content
      const startIdx = i * batchSize;
      const endIdx = Math.min(startIdx + batchSize, totalProspects);
      const batchProspects = execution.prospects.slice(startIdx, endIdx);

      for (const prospect of batchProspects) {
        await prisma.discoveredProspect.update({
          where: { id: prospect.id },
          data: {
            rawData: JSON.stringify({
              scrapedAt: new Date(),
              content: this.generateMockWebContent(prospect.companyName || 'Unknown Company'),
              metadata: { 
                pages: 5, 
                wordCount: 2847,
                lastUpdated: new Date()
              }
            })
          }
        });
      }

      await this.updateExecutionProgress(executionId, {
        currentActivity: `Scraping websites... ${scrapedCount.toLocaleString()} of ${totalProspects.toLocaleString()} completed`
      });

      this.broadcastProgress(executionId, {
        phase: 'web_scraping',
        progress: progress,
        prospectsFound: totalProspects,
        currentActivity: `Extracting website content... ${scrapedCount.toLocaleString()}/${totalProspects.toLocaleString()}`
      });
    }
  }

  /**
   * Phase 3: Content Analysis - AI analysis of scraped content
   */
  private async executeContentAnalysisPhase(
    executionId: string, 
    buyerProfile: any, 
    config: any
  ): Promise<void> {
    await this.updateExecutionStatus(executionId, 'running', 'content_analysis', {
      currentActivity: 'Analyzing website content with AI...'
    });

    const execution = await prisma.discoveryExecution.findUnique({
      where: { id: executionId },
      include: { prospects: true }
    });

    if (!execution) return;

    const totalProspects = execution.prospects.length;
    const batches = 25;
    const batchSize = Math.floor(totalProspects / batches);

    for (let i = 0; i < batches; i++) {
      await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2 second delay per batch
      
      const analyzedCount = (i + 1) * batchSize;
      const progress = Math.round((analyzedCount / totalProspects) * 100);

      // Update prospects with AI analysis
      const startIdx = i * batchSize;
      const endIdx = Math.min(startIdx + batchSize, totalProspects);
      const batchProspects = execution.prospects.slice(startIdx, endIdx);

      for (const prospect of batchProspects) {
        const analysisResult = this.generateMockAIAnalysis(prospect.companyName || 'Unknown Company');
        
        await prisma.discoveredProspect.update({
          where: { id: prospect.id },
          data: {
            contentAnalysis: JSON.stringify(analysisResult),
            relevanceScore: analysisResult.relevanceScore,
            qualityScore: analysisResult.qualityScore,
            confidenceScore: analysisResult.confidenceScore,
            analyzedAt: new Date()
          }
        });
      }

      await this.updateExecutionProgress(executionId, {
        prospectsAnalyzed: analyzedCount,
        currentActivity: `AI analyzing content... ${analyzedCount.toLocaleString()} of ${totalProspects.toLocaleString()} analyzed`
      });

      this.broadcastProgress(executionId, {
        phase: 'content_analysis',
        progress: progress,
        prospectsFound: totalProspects,
        prospectsAnalyzed: analyzedCount,
        currentActivity: `AI content analysis... ${analyzedCount.toLocaleString()}/${totalProspects.toLocaleString()}`
      });
    }
  }

  /**
   * Phase 4: Lead Qualification - Create qualified leads
   */
  private async executeLeadQualificationPhase(
    executionId: string, 
    buyerProfile: any, 
    config: any
  ): Promise<void> {
    await this.updateExecutionStatus(executionId, 'running', 'lead_qualification', {
      currentActivity: 'Qualifying prospects and creating leads...'
    });

    const execution = await prisma.discoveryExecution.findUnique({
      where: { id: executionId },
      include: { prospects: true }
    });

    if (!execution) return;

    // Filter prospects for qualification (relevanceScore > 0.7)
    const qualifiableProspects = execution.prospects.filter(p => 
      p.relevanceScore && p.relevanceScore > 0.7
    );

    const totalQualifiable = qualifiableProspects.length;
    let qualifiedCount = 0;
    let leadsCreated = 0;

    for (const prospect of qualifiableProspects) {
      await new Promise(resolve => setTimeout(resolve, 800)); // 0.8 second delay per prospect
      
      qualifiedCount++;
      const progress = Math.round((qualifiedCount / totalQualifiable) * 100);

      // Qualify prospect (80% qualification rate)
      const isQualified = Math.random() > 0.2;
      
      if (isQualified) {
        // Create lead
        const lead = await this.createLeadFromProspect(prospect, executionId);
        if (lead) {
          leadsCreated++;
          
          await prisma.discoveredProspect.update({
            where: { id: prospect.id },
            data: {
              isQualified: true,
              qualifiedAt: new Date(),
              leadCreated: true,
              leadCreatedAt: new Date(),
              leadId: lead.id
            }
          });
        }
      } else {
        await prisma.discoveredProspect.update({
          where: { id: prospect.id },
          data: {
            isQualified: false,
            disqualificationReason: 'Low relevance score or missing key criteria'
          }
        });
      }

      // Update progress every 10 prospects
      if (qualifiedCount % 10 === 0 || qualifiedCount === totalQualifiable) {
        await this.updateExecutionProgress(executionId, {
          leadsQualified: qualifiedCount,
          leadsCreated: leadsCreated,
          currentActivity: `Qualifying prospects... ${qualifiedCount}/${totalQualifiable} processed, ${leadsCreated} leads created`
        });

        this.broadcastProgress(executionId, {
          phase: 'lead_qualification',
          progress: progress,
          prospectsFound: execution.prospects.length,
          prospectsAnalyzed: execution.prospects.length,
          leadsQualified: qualifiedCount,
          leadsCreated: leadsCreated,
          currentActivity: `Creating qualified leads... ${leadsCreated} leads created`
        });
      }
    }
  }

  /**
   * Create mock prospect records
   */
  private async createMockProspects(executionId: string, count: number, batchId: string): Promise<void> {
    const prospects = [];
    
    for (let i = 0; i < count; i++) {
      const companyName = this.generateMockCompanyName();
      prospects.push({
        companyName: companyName,
        domain: `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        url: `https://${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        source: 'business_directory',
        sourceId: `${batchId}_${i}`,
        rawData: JSON.stringify({
          foundAt: new Date(),
          source: 'business_directory',
          batchId: batchId
        }),
        discoveryExecutionId: executionId,
        discoveredAt: new Date()
      });
    }

    await prisma.discoveredProspect.createMany({
      data: prospects
    });
  }

  /**
   * Generate mock company names
   */
  private generateMockCompanyName(): string {
    const prefixes = ['Advanced', 'Premier', 'Professional', 'Expert', 'Quality', 'Reliable', 'Superior', 'Elite'];
    const suffixes = ['Plumbing', 'Services', 'Solutions', 'Systems', 'Contractors', 'Specialists', 'Group', 'Corp'];
    const locations = ['Metro', 'City', 'Valley', 'North', 'South', 'East', 'West', 'Central'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    return Math.random() > 0.5 ? `${prefix} ${suffix}` : `${location} ${suffix}`;
  }

  /**
   * Generate mock web content
   */
  private generateMockWebContent(companyName: string): any {
    return {
      title: `${companyName} - Professional Plumbing Services`,
      description: `${companyName} provides commercial plumbing services including drain cleaning, pipe repair, and emergency services.`,
      services: ['Commercial Plumbing', 'Drain Cleaning', 'Pipe Repair', 'Emergency Services'],
      contact: {
        phone: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        email: `info@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
      },
      content: `We are a leading provider of commercial plumbing services with over 15 years of experience. Our team specializes in high-pressure water jetting, pipe inspection, and emergency repairs for commercial properties.`
    };
  }

  /**
   * Generate mock AI analysis
   */
  private generateMockAIAnalysis(companyName: string): any {
    const relevanceScore = Math.random() * 0.4 + 0.6; // 0.6 to 1.0
    const qualityScore = Math.random() * 0.3 + 0.7; // 0.7 to 1.0
    const confidenceScore = Math.random() * 0.25 + 0.75; // 0.75 to 1.0

    return {
      relevanceScore: Math.round(relevanceScore * 100) / 100,
      qualityScore: Math.round(qualityScore * 100) / 100,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      analysis: {
        businessType: 'Commercial Plumbing Services',
        serviceOfferings: ['Drain Cleaning', 'Pipe Repair', 'Emergency Services'],
        targetMarketFit: relevanceScore > 0.8 ? 'Excellent' : relevanceScore > 0.7 ? 'Good' : 'Fair',
        painPoints: ['Equipment maintenance', 'Emergency response time', 'Service reliability'],
        buyingSignals: relevanceScore > 0.8 ? ['Recent equipment upgrades', 'Service expansion'] : [],
        keyDecisionMakers: ['Owner', 'Operations Manager'],
        estimatedEmployees: Math.floor(Math.random() * 50) + 10,
        estimatedRevenue: `$${Math.floor(Math.random() * 5000000) + 500000}`
      },
      processedAt: new Date()
    };
  }

  /**
   * Create a lead from a qualified prospect
   */
  private async createLeadFromProspect(prospect: any, executionId: string): Promise<any | null> {
    try {
      const analysis = prospect.contentAnalysis ? JSON.parse(prospect.contentAnalysis) : {};
      const rawData = prospect.rawData ? JSON.parse(prospect.rawData) : {};
      
      const lead = await prisma.lead.create({
        data: {
          companyName: prospect.companyName || 'Unknown Company',
          url: prospect.url,
          domain: prospect.domain || new URL(prospect.url).hostname,
          industry: analysis.analysis?.businessType || 'Plumbing Services',
          score: Math.round((prospect.relevanceScore || 0.8) * 100),
          status: 'RAW',
          externalSource: 'AI Discovery',
          campaignId: 'default-campaign', // TODO: Get from execution context
          discoveryExecutionId: executionId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      return lead;
    } catch (error) {
      console.error('Error creating lead from prospect:', error);
      return null;
    }
  }

  /**
   * Update execution status and phase
   */
  private async updateExecutionStatus(
    executionId: string, 
    status: string, 
    phase: string, 
    updates: any = {}
  ): Promise<void> {
    await prisma.discoveryExecution.update({
      where: { id: executionId },
      data: {
        status,
        phase,
        ...updates,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Update execution progress metrics
   */
  private async updateExecutionProgress(executionId: string, updates: any): Promise<void> {
    await prisma.discoveryExecution.update({
      where: { id: executionId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Broadcast progress updates via WebSocket
   */
  private broadcastProgress(executionId: string, progress: Partial<DiscoveryProgress>): void {
    // TODO: Implement WebSocket broadcasting
    console.log(`Progress update for ${executionId}:`, progress);
  }

  /**
   * Get execution progress
   */
  async getExecutionProgress(executionId: string): Promise<DiscoveryProgress | null> {
    try {
      const execution = await prisma.discoveryExecution.findUnique({
        where: { id: executionId },
        include: {
          discoveryModel: true,
          prospects: true
        }
      });

      if (!execution) return null;

      return {
        phase: execution.phase,
        status: execution.status,
        progress: this.calculateProgress(execution),
        prospectsFound: execution.prospectsFound,
        prospectsAnalyzed: execution.prospectsAnalyzed,
        leadsQualified: execution.leadsQualified,
        leadsCreated: execution.leadsCreated,
        estimatedCompletion: this.calculateEstimatedCompletion(execution),
        currentActivity: execution.analysisResults ? JSON.parse(execution.analysisResults).currentActivity : undefined,
        errors: execution.errorMessage ? [execution.errorMessage] : []
      };
    } catch (error) {
      console.error('Error getting execution progress:', error);
      return null;
    }
  }

  /**
   * Calculate overall progress percentage
   */
  private calculateProgress(execution: any): number {
    const phases = ['initialization', 'market_research', 'web_scraping', 'content_analysis', 'lead_qualification', 'completed'];
    const currentPhaseIndex = phases.indexOf(execution.phase);
    
    if (currentPhaseIndex === -1) return 0;
    if (execution.phase === 'completed') return 100;
    
    const baseProgress = (currentPhaseIndex / (phases.length - 1)) * 100;
    return Math.round(baseProgress);
  }

  /**
   * Calculate estimated completion time
   */
  private calculateEstimatedCompletion(execution: any): Date | undefined {
    if (execution.status === 'completed') return execution.completedAt;
    
    const startTime = new Date(execution.startedAt);
    const now = new Date();
    const elapsed = now.getTime() - startTime.getTime();
    
    // Estimate based on current progress and typical execution time (2-4 hours for demo)
    const estimatedTotal = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    const estimatedCompletion = new Date(startTime.getTime() + estimatedTotal);
    
    return estimatedCompletion;
  }
}

export const discoveryExecutionService = new DiscoveryExecutionService();
