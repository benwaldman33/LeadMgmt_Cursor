import axios from 'axios';
import { prisma } from '../index';
import { AuditLogService } from './auditLogService';
import { ServiceConfigurationService } from './serviceConfigurationService';
import crypto from 'crypto';

const serviceConfigService = new ServiceConfigurationService();

export interface ApifyActorConfig {
  id: string;
  name: string;
  description?: string;
  actorId: string;
  apiToken: string;
  isActive: boolean;
  defaultInput?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// New interface for ServiceProvider-based configuration
export interface ApifyServiceConfig {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  priority: number;
  capabilities: string[];
  config: {
    apiToken: string;
    baseUrl?: string;
    defaultActorId?: string;
    [key: string]: any;
  };
  limits: {
    monthlyQuota?: number;
    concurrentRequests?: number;
    costPerRequest?: number;
    [key: string]: any;
  };
  scrapingConfig?: {
    maxDepth?: number;
    maxPages?: number;
    requestDelay?: number;
    [key: string]: any;
  };
}

export interface ApifyRunResult {
  id: string;
  actorId: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED' | 'TIMED-OUT';
  startedAt: string;
  finishedAt?: string;
  output?: any;
  error?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
}

export interface ApifyScrapingResult {
  url: string;
  success: boolean;
  content: string;
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    language: string;
    lastModified?: string;
  };
  structuredData: {
    companyName?: string;
    industry?: string;
    services?: string[];
    technologies?: string[];
    certifications?: string[];
    contactInfo?: {
      email?: string;
      phone?: string;
      address?: string;
    };
  };
  error?: string;
  timestamp: Date;
  processingTime: number;
  source: 'apify';
  actorId: string;
}

export interface ApifyScrapingJob {
  id: string;
  actorId: string;
  urls: string[];
  industry: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: ApifyScrapingResult[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  apifyRunId?: string;
}

class ApifyService {
  private baseUrl = 'https://api.apify.com/v2';
  private encryptionKey = process.env.ENCRYPTION_KEY || 'your-encryption-key-change-in-production';

  /**
   * Encrypt sensitive data
   */
  private encrypt(text: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Create a new Apify Actor configuration
   */
  async createActorConfig(config: Omit<ApifyActorConfig, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<ApifyActorConfig> {
    const encryptedToken = this.encrypt(config.apiToken);
    
    const actorConfig = await prisma.apifyActor.create({
      data: {
        name: config.name,
        description: config.description,
        actorId: config.actorId,
        apiToken: encryptedToken,
        isActive: config.isActive,
        defaultInput: config.defaultInput ? JSON.stringify(config.defaultInput) : null,
        createdById: userId
      }
    });

    return {
      ...actorConfig,
      description: actorConfig.description || undefined,
      apiToken: config.apiToken, // Return the original token for the response
      defaultInput: actorConfig.defaultInput ? JSON.parse(actorConfig.defaultInput) : undefined
    };
  }

  /**
   * Get all configured Apify Actors (legacy method for backward compatibility)
   */
  async getActorConfigs(): Promise<ApifyActorConfig[]> {
    const allActors: ApifyActorConfig[] = [];
    
    console.log('🔍 getActorConfigs: Starting to fetch Apify actors...');
    
    // First get ServiceProvider-based Apify services
    try {
      const apifyServices = await this.getApifyServices();
      console.log(`🔍 getActorConfigs: Found ${apifyServices.length} ServiceProvider-based Apify services`);
      
      if (apifyServices.length > 0) {
        // Convert ServiceProvider configs to legacy ApifyActorConfig format
        const serviceProviderActors = apifyServices.map(service => ({
          id: service.id,
          name: service.name,
          description: `Service Provider: ${service.name}`,
          actorId: service.config.defaultActorId || 'default',
          apiToken: service.config.apiToken,
          isActive: service.isActive,
          defaultInput: service.scrapingConfig || {},
          createdAt: new Date(), // ServiceProvider doesn't have these fields
          updatedAt: new Date()
        }));
        allActors.push(...serviceProviderActors);
        console.log(`🔍 getActorConfigs: Added ${serviceProviderActors.length} ServiceProvider actors`);
      }
    } catch (error) {
      console.warn('Failed to get Apify services from ServiceProvider:', error);
    }

    // Then get legacy ApifyActor configurations
    try {
      console.log('🔍 getActorConfigs: Fetching legacy ApifyActor configurations...');
      
      // First, let's see what's in the database without any filters
      const allActorsInDb = await prisma.apifyActor.findMany();
      console.log(`🔍 getActorConfigs: Total ApifyActor entries in database (unfiltered): ${allActorsInDb.length}`);
      
      if (allActorsInDb.length > 0) {
        console.log('🔍 getActorConfigs: Sample actor data:', allActorsInDb[0]);
      }
      
      const legacyActors = await prisma.apifyActor.findMany({
        where: { isActive: true },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`🔍 getActorConfigs: Found ${legacyActors.length} legacy ApifyActor entries in database (filtered by isActive: true)`);
      
      const legacyActorConfigs = legacyActors.map((actor) => ({
        id: actor.id,
        name: actor.name,
        description: actor.description || undefined,
        actorId: actor.actorId,
        apiToken: this.decrypt(actor.apiToken),
        isActive: actor.isActive,
        defaultInput: actor.defaultInput ? JSON.parse(actor.defaultInput) : undefined,
        createdAt: actor.createdAt,
        updatedAt: actor.updatedAt
      }));
      
      allActors.push(...legacyActorConfigs);
      console.log(`🔍 getActorConfigs: Added ${legacyActorConfigs.length} legacy actors`);
    } catch (error) {
      console.warn('Failed to get legacy ApifyActor configurations:', error);
    }

    console.log(`🔍 getActorConfigs: Total actors found: ${allActors.length}`);
    
    // Return combined list, sorted by creation date (newest first)
    return allActors.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get all Apify services from ServiceProvider system
   */
  async getApifyServices(): Promise<ApifyServiceConfig[]> {
    console.log('🔍 getApifyServices: Starting to fetch ServiceProvider services...');
    
    const services = await serviceConfigService.getAllServiceProviders();
    console.log(`🔍 getApifyServices: Found ${services.length} total ServiceProvider entries`);
    
    if (services.length > 0) {
      console.log('🔍 getApifyServices: Sample service:', {
        id: services[0].id,
        name: services[0].name,
        type: services[0].type,
        capabilities: services[0].capabilities
      });
    }
    
    const apifyServices = services
      .filter(service => service.type === 'SCRAPER' && 
                        JSON.parse(service.capabilities).includes('WEB_SCRAPING'));
    
    console.log(`🔍 getApifyServices: Found ${apifyServices.length} SCRAPER services with WEB_SCRAPING capability`);
    
    return apifyServices
      .map(service => ({
        id: service.id,
        name: service.name,
        type: service.type,
        isActive: service.isActive,
        priority: service.priority,
        capabilities: JSON.parse(service.capabilities),
        config: JSON.parse(service.config),
        limits: JSON.parse(service.limits),
        scrapingConfig: service.scrapingConfig ? JSON.parse(service.scrapingConfig) : undefined
      }))
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get the best available Apify service for web scraping
   */
  async getBestApifyService(): Promise<ApifyServiceConfig | null> {
    try {
      const availableServices = await serviceConfigService.getAvailableServices('WEB_SCRAPING');
      const apifyServices = availableServices.filter(service => 
        service.type === 'SCRAPER' && 
        JSON.parse(service.capabilities).includes('WEB_SCRAPING')
      );
      
      if (apifyServices.length === 0) return null;
      
      // Return the highest priority service
      const bestService = apifyServices.sort((a, b) => a.priority - b.priority)[0];
      
      return {
        id: bestService.id,
        name: bestService.name,
        type: bestService.type,
        isActive: bestService.isActive,
        priority: bestService.priority,
        capabilities: JSON.parse(bestService.capabilities),
        config: JSON.parse(bestService.config),
        limits: JSON.parse(bestService.limits),
        scrapingConfig: bestService.scrapingConfig ? JSON.parse(bestService.scrapingConfig) : undefined
      };
    } catch (error) {
      console.error('Error getting best Apify service:', error);
      return null;
    }
  }

  /**
   * Get actor configuration by ID (updated to work with both systems)
   */
  private async getActorConfig(actorId: string): Promise<ApifyActorConfig | null> {
    // First try to get from ServiceProvider system
    try {
      const apifyServices = await this.getApifyServices();
      const service = apifyServices.find(s => s.id === actorId);
      if (service) {
        return {
          id: service.id,
          name: service.name,
          description: `Service Provider: ${service.name}`,
          actorId: service.config.defaultActorId || 'default',
          apiToken: service.config.apiToken,
          isActive: service.isActive,
          defaultInput: service.scrapingConfig || {},
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    } catch (error) {
      console.warn('Failed to get Apify service from ServiceProvider, falling back to legacy system:', error);
    }

    // Fallback to legacy ApifyActor system
    const actor = await prisma.apifyActor.findUnique({
      where: { id: actorId },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    if (!actor) return null;

    return {
      id: actor.id,
      name: actor.name,
      description: actor.description || undefined,
      actorId: actor.actorId,
      apiToken: this.decrypt(actor.apiToken),
      isActive: actor.isActive,
      defaultInput: actor.defaultInput ? JSON.parse(actor.defaultInput) : undefined,
      createdAt: actor.createdAt,
      updatedAt: actor.updatedAt
    };
  }

  /**
   * Run an Apify Actor with the given input
   */
  async runActor(actorId: string, input: Record<string, any> = {}): Promise<ApifyRunResult> {
    try {
      // Get actor config
      const config = await this.getActorConfig(actorId);
      if (!config) {
        throw new Error(`Actor configuration not found for ID: ${actorId}`);
      }

      // Start the actor run
      const response = await axios.post(
        `${this.baseUrl}/acts/${config.actorId}/runs?token=${config.apiToken}`,
        {
          ...config.defaultInput,
          ...input
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const responseData = response.data as any;
      const runResult: ApifyRunResult = {
        id: responseData.data.id,
        actorId: config.actorId,
        status: responseData.data.status,
        startedAt: responseData.data.startedAt,
        progress: responseData.data.progress
      };

      // Log the activity
      await AuditLogService.logActivity({
        userId: 'system',
        action: 'apify_actor_run_started',
        entityType: 'apify_actor',
        entityId: actorId,
        description: `Started Apify Actor run: ${config.name}`,
        metadata: {
          runId: runResult.id,
          input,
          actorName: config.name
        }
      });

      return runResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await AuditLogService.logActivity({
        userId: 'system',
        action: 'apify_actor_run_failed',
        entityType: 'apify_actor',
        entityId: actorId,
        description: `Failed to run Apify Actor: ${errorMessage}`,
        metadata: {
          error: errorMessage,
          input
        }
      });

      throw new Error(`Failed to run Apify Actor: ${errorMessage}`);
    }
  }

  /**
   * Get the status and results of an Apify run
   */
  async getRunStatus(runId: string, actorId: string): Promise<ApifyRunResult> {
    try {
      const config = await this.getActorConfig(actorId);
      if (!config) {
        throw new Error(`Actor configuration not found for ID: ${actorId}`);
      }

      const response = await axios.get(
        `${this.baseUrl}/acts/${config.actorId}/runs/${runId}?token=${config.apiToken}`
      );

      const responseData = response.data as any;
      const runResult: ApifyRunResult = {
        id: responseData.id,
        actorId: config.actorId,
        status: responseData.status,
        startedAt: responseData.startedAt,
        finishedAt: responseData.finishedAt,
        output: responseData.output,
        error: responseData.error,
        progress: responseData.progress
      };

      return runResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get run status: ${errorMessage}`);
    }
  }

  /**
   * Scrape URLs using an Apify Actor
   */
  async scrapeWithActor(actorId: string, urls: string[], industry?: string): Promise<ApifyScrapingJob> {
    const jobId = `apify_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create job record in database
    const jobRecord = await prisma.apifyScrapingJob.create({
      data: {
        id: jobId,
        actorId,
        urls: JSON.stringify(urls),
        industry: industry || 'general',
        status: 'pending'
      }
    });

    const job: ApifyScrapingJob = {
      id: jobRecord.id,
      actorId,
      urls,
      industry: industry || 'general',
      status: 'pending',
      results: [],
      createdAt: jobRecord.createdAt
    };

    try {
      // Update job status to running
      await prisma.apifyScrapingJob.update({
        where: { id: jobId },
        data: { status: 'running' }
      });
      job.status = 'running';

      // Run the Apify Actor
      const runResult = await this.runActor(actorId, {
        urls,
        industry,
        maxRequestsPerCrawl: urls.length,
        maxConcurrency: 5
      });

      job.apifyRunId = runResult.id;

      // Update job with run ID
      await prisma.apifyScrapingJob.update({
        where: { id: jobId },
        data: { apifyRunId: runResult.id }
      });

      // Wait for completion and get results
      const finalResult = await this.waitForCompletion(runResult.id, actorId);
      
      if (finalResult.status === 'SUCCEEDED' && finalResult.output) {
        job.results = this.processApifyOutput(finalResult.output, urls, industry);
        job.status = 'completed';
        
        // Update job with results
        await prisma.apifyScrapingJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            results: JSON.stringify(job.results),
            completedAt: new Date()
          }
        });
      } else {
        job.status = 'failed';
        job.error = finalResult.error || 'Apify Actor failed to complete';
        
        // Update job with error
        await prisma.apifyScrapingJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            error: job.error,
            completedAt: new Date()
          }
        });
      }

      job.completedAt = new Date();

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      
      // Update job with error
      await prisma.apifyScrapingJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: job.error,
          completedAt: new Date()
        }
      });
    }

    return job;
  }

  /**
   * Get scraping job by ID
   */
  async getScrapingJob(jobId: string): Promise<ApifyScrapingJob | null> {
    const jobRecord = await prisma.apifyScrapingJob.findUnique({
      where: { id: jobId }
    });

    if (!jobRecord) return null;

    return {
      id: jobRecord.id,
      actorId: jobRecord.actorId,
      urls: JSON.parse(jobRecord.urls),
      industry: jobRecord.industry,
      status: jobRecord.status as 'pending' | 'running' | 'completed' | 'failed',
      results: jobRecord.results ? JSON.parse(jobRecord.results) as ApifyScrapingResult[] : [],
      createdAt: jobRecord.createdAt,
      completedAt: jobRecord.completedAt || undefined,
      error: jobRecord.error || undefined,
      apifyRunId: jobRecord.apifyRunId || undefined
    };
  }

  /**
   * Wait for an Apify run to complete
   */
  private async waitForCompletion(runId: string, actorId: string, maxWaitTime = 300000): Promise<ApifyRunResult> {
    const startTime = Date.now();
    const checkInterval = 5000; // Check every 5 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const result = await this.getRunStatus(runId, actorId);
      
      if (result.status === 'SUCCEEDED' || result.status === 'FAILED' || result.status === 'ABORTED' || result.status === 'TIMED-OUT') {
        return result;
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('Apify run timed out');
  }

  /**
   * Process Apify output into standardized scraping results
   */
  private processApifyOutput(output: any, urls: string[], industry?: string): ApifyScrapingResult[] {
    const results: ApifyScrapingResult[] = [];

    // Handle different output formats from Apify Actors
    if (Array.isArray(output)) {
      // If output is an array of results
      for (const item of output) {
        const result = this.transformApifyItem(item, industry);
        if (result) {
          results.push(result);
        }
      }
    } else if (output.results && Array.isArray(output.results)) {
      // If output has a results array
      for (const item of output.results) {
        const result = this.transformApifyItem(item, industry);
        if (result) {
          results.push(result);
        }
      }
    } else if (typeof output === 'object') {
      // If output is a single object
      const result = this.transformApifyItem(output, industry);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Transform a single Apify item into a standardized scraping result
   */
  private transformApifyItem(item: any, industry?: string): ApifyScrapingResult | null {
    try {
      const url = item.url || item.website || item.link || '';
      if (!url) return null;

      const content = item.content || item.text || item.body || item.html || '';
      const title = item.title || item.pageTitle || '';
      const description = item.description || item.metaDescription || '';
      
      // Extract keywords
      const keywords = item.keywords || item.metaKeywords || [];
      const keywordsArray = Array.isArray(keywords) ? keywords : keywords.split(',').map((k: string) => k.trim());

      // Extract contact information
      const contactInfo = {
        email: item.email || item.contactEmail || '',
        phone: item.phone || item.contactPhone || '',
        address: item.address || item.contactAddress || ''
      };

      // Extract structured data
      const structuredData = {
        companyName: item.companyName || item.company || item.businessName || '',
        industry: industry || item.industry || '',
        services: item.services || item.products || [],
        technologies: item.technologies || item.tech || [],
        certifications: item.certifications || item.certs || [],
        contactInfo
      };

      return {
        url,
        success: true,
        content: content.substring(0, 10000), // Limit content size
        metadata: {
          title,
          description,
          keywords: keywordsArray,
          language: item.language || 'en',
          lastModified: item.lastModified || item.updatedAt
        },
        structuredData,
        timestamp: new Date(),
        processingTime: item.processingTime || 0,
        source: 'apify',
        actorId: item.actorId || ''
      };

    } catch (error) {
      console.error('Error transforming Apify item:', error);
      return null;
    }
  }

  /**
   * Test if an Apify Actor configuration is valid
   */
  async testActorConfig(actorId: string, apiToken?: string): Promise<boolean> {
    try {
      // First try to get from ServiceProvider system
      try {
        const apifyServices = await this.getApifyServices();
        const service = apifyServices.find(s => s.id === actorId);
        if (service) {
          // Use the API token from the service configuration
          const tokenToTest = apiToken || service.config.apiToken;
          return await this.testApifyConnection(service.config.defaultActorId || 'default', tokenToTest);
        }
      } catch (error) {
        console.warn('Failed to test Apify service from ServiceProvider, falling back to legacy system:', error);
      }

      // Fallback to legacy ApifyActor system
      const actor = await prisma.apifyActor.findUnique({
        where: { id: actorId }
      });

      if (!actor) return false;

      const tokenToTest = apiToken || this.decrypt(actor.apiToken);
      return await this.testApifyConnection(actor.actorId, tokenToTest);
    } catch (error) {
      console.error('Error testing actor configuration:', error);
      return false;
    }
  }

  /**
   * Test Apify connection using a specific actor ID and API token
   */
  private async testApifyConnection(actorId: string, apiToken: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/acts/${actorId}?token=${apiToken}`
      );
      return response.status === 200;
    } catch (error) {
      console.error('Apify connection test failed:', error);
      return false;
    }
  }
}

export const apifyService = new ApifyService();
