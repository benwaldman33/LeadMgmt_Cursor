import { prisma } from '../index';

// Use Prisma types instead of custom interfaces
import type { ServiceProvider, OperationServiceMapping, ServiceUsage } from '@prisma/client';

export class ServiceConfigurationService {
  /**
   * Get all available service providers
   */
  async getAllServiceProviders(): Promise<ServiceProvider[]> {
    return await prisma.serviceProvider.findMany({
      orderBy: { priority: 'asc' }
    });
  }

  /**
   * Get active service providers for a specific operation
   */
  async getAvailableServices(operation: string): Promise<ServiceProvider[]> {
    const mappings = await prisma.operationServiceMapping.findMany({
      where: {
        operation,
        isEnabled: true,
        service: {
          isActive: true
        }
      },
      include: {
        service: true
      },
      orderBy: [
        { service: { priority: 'asc' } }, // ServiceProvider priority FIRST
        { priority: 'asc' }               // OperationServiceMapping priority SECOND
      ]
    });

    return mappings.map(mapping => mapping.service);
  }

  /**
   * Select the best available service for an operation
   */
  async selectService(operation: string, userId?: string): Promise<ServiceProvider | null> {
    const availableServices = await this.getAvailableServices(operation);
    
    if (availableServices.length === 0) {
      return null;
    }

    // Try services in priority order
    for (const service of availableServices) {
      if (await this.checkServiceLimits(service.id, operation, userId)) {
        return service;
      }
    }

    return null;
  }

  /**
   * Check if a service is within its usage limits
   */
  async checkServiceLimits(serviceId: string, operation: string, userId?: string): Promise<boolean> {
    const service = await prisma.serviceProvider.findUnique({
      where: { id: serviceId }
    });

    if (!service) return false;

    try {
      const limits = JSON.parse(service.limits);
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      // Check monthly quota
      if (limits.monthlyQuota) {
        const monthlyUsage = await prisma.serviceUsage.count({
          where: {
            serviceId,
            operation,
            createdAt: {
              gte: currentMonth
            }
          }
        });

        if (monthlyUsage >= limits.monthlyQuota) {
          return false;
        }
      }

      // Check concurrent requests
      if (limits.concurrentRequests) {
        const activeRequests = await prisma.serviceUsage.count({
          where: {
            serviceId,
            operation,
            success: false, // Use false instead of null for in-progress
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            }
          }
        });

        if (activeRequests >= limits.concurrentRequests) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking service limits:', error);
      return false;
    }
  }

  /**
   * Record service usage for tracking
   */
  async recordUsage(usage: {
    serviceId: string;
    userId?: string | null;
    operation: string;
    tokensUsed?: number | null;
    cost?: number | null;
    duration?: number | null;
    success: boolean;
    errorMessage?: string | null;
    metadata?: string | null;
  }): Promise<ServiceUsage> {
    return await prisma.serviceUsage.create({
      data: usage
    });
  }

  /**
   * Create a new service provider
   */
  async createServiceProvider(data: {
    name: string;
    type: string;
    isActive: boolean;
    priority: number;
    capabilities: string;
    config: string;
    limits: string;
    scrapingConfig?: string | null;
  }): Promise<ServiceProvider> {
    // Create the service provider
    const provider = await prisma.serviceProvider.create({
      data
    });

    // Auto-create operation mappings based on capabilities
    await this.createDefaultOperationMappings(provider.id, data.capabilities, data.priority);

    return provider;
  }

  /**
   * Create default operation mappings for a new service provider
   */
  private async createDefaultOperationMappings(serviceId: string, capabilities: string, priority: number): Promise<void> {
    try {
      const capabilitiesArray = JSON.parse(capabilities);
      const availableOperations = this.getAvailableOperations();
      
      // Create mappings for operations that match the service capabilities
      const mappingPromises = availableOperations
        .filter(operation => capabilitiesArray.includes(operation))
        .map(operation => 
          prisma.operationServiceMapping.create({
            data: {
              operation,
              serviceId,
              isEnabled: true,
              priority,
              config: '{}'
            }
          })
        );

      if (mappingPromises.length > 0) {
        await Promise.all(mappingPromises);
        console.log(`[ServiceConfig] Created ${mappingPromises.length} default operation mappings for new service provider`);
      }

    } catch (error) {
      console.error('[ServiceConfig] Error creating default operation mappings:', error);
      // Don't throw error here as the service provider was already created
    }
  }

  /**
   * Update a service provider
   */
  async updateServiceProvider(id: string, data: Partial<{
    name: string;
    type: string;
    isActive: boolean;
    priority: number;
    capabilities: string;
    config: string;
    limits: string;
    scrapingConfig?: string | null;
  }>): Promise<ServiceProvider> {
    // Get the current provider to check if priority is changing
    const currentProvider = await prisma.serviceProvider.findUnique({
      where: { id }
    });

    if (!currentProvider) {
      throw new Error('Service provider not found');
    }

    // Update the service provider
    const updatedProvider = await prisma.serviceProvider.update({
      where: { id },
      data
    });

    // If priority changed, sync OperationServiceMapping priorities
    if (data.priority !== undefined && data.priority !== currentProvider.priority) {
      console.log(`[ServiceConfig] Priority changed for ${updatedProvider.name} from ${currentProvider.priority} to ${data.priority}`);
      console.log(`[ServiceConfig] Syncing OperationServiceMapping priorities...`);
      
      await this.syncOperationMappingPriorities(id, data.priority);
    }

    return updatedProvider;
  }

  /**
   * Sync OperationServiceMapping priorities to match ServiceProvider priority
   */
  private async syncOperationMappingPriorities(serviceId: string, newPriority: number): Promise<void> {
    try {
      // Get all operation mappings for this service
      const mappings = await prisma.operationServiceMapping.findMany({
        where: { serviceId }
      });

      if (mappings.length === 0) {
        console.log(`[ServiceConfig] No operation mappings found for service ${serviceId}`);
        return;
      }

      // Update all operation mappings to use the new priority
      const updatePromises = mappings.map(mapping => 
        prisma.operationServiceMapping.update({
          where: { id: mapping.id },
          data: { priority: newPriority }
        })
      );

      await Promise.all(updatePromises);

      console.log(`[ServiceConfig] Updated ${mappings.length} operation mappings to priority ${newPriority}`);
      
      // Log the updated mappings for debugging
      const updatedMappings = await prisma.operationServiceMapping.findMany({
        where: { serviceId },
        include: { service: true }
      });

      updatedMappings.forEach(mapping => {
        console.log(`[ServiceConfig] - ${mapping.service.name} -> ${mapping.operation}: Priority ${mapping.priority}`);
      });

    } catch (error) {
      console.error('[ServiceConfig] Error syncing operation mapping priorities:', error);
      throw error;
    }
  }

  /**
   * Bulk sync all OperationServiceMapping priorities to match their ServiceProvider priorities
   */
  async syncAllOperationMappingPriorities(): Promise<{
    success: boolean;
    message: string;
    details: {
      totalProviders: number;
      totalMappings: number;
      updatedMappings: number;
      syncResults: Array<{
        providerName: string;
        providerPriority: number;
        mappingsCount: number;
        updatedCount: number;
      }>;
    };
  }> {
    try {
      console.log('[ServiceConfig] Starting bulk priority synchronization...');
      
      // Get all service providers with their operation mappings
      const providers = await prisma.serviceProvider.findMany({
        include: {
          operationMappings: true
        },
        orderBy: { priority: 'asc' }
      });

      let totalMappings = 0;
      let totalUpdated = 0;
      const syncResults = [];

      for (const provider of providers) {
        const mappingsCount = provider.operationMappings.length;
        totalMappings += mappingsCount;
        
        if (mappingsCount === 0) {
          syncResults.push({
            providerName: provider.name,
            providerPriority: provider.priority,
            mappingsCount: 0,
            updatedCount: 0
          });
          continue;
        }

        // Check which mappings need updating
        const mappingsToUpdate = provider.operationMappings.filter(
          mapping => mapping.priority !== provider.priority
        );

        if (mappingsToUpdate.length > 0) {
          // Update the mappings that don't match the provider priority
          const updatePromises = mappingsToUpdate.map(mapping =>
            prisma.operationServiceMapping.update({
              where: { id: mapping.id },
              data: { priority: provider.priority }
            })
          );

          await Promise.all(updatePromises);
          totalUpdated += mappingsToUpdate.length;

          console.log(`[ServiceConfig] Updated ${mappingsToUpdate.length} mappings for ${provider.name} to priority ${provider.priority}`);
        }

        syncResults.push({
          providerName: provider.name,
          providerPriority: provider.priority,
          mappingsCount,
          updatedCount: mappingsToUpdate.length
        });
      }

      const message = `Bulk synchronization completed. Updated ${totalUpdated} out of ${totalMappings} operation mappings across ${providers.length} service providers.`;

      console.log(`[ServiceConfig] ${message}`);

      return {
        success: true,
        message,
        details: {
          totalProviders: providers.length,
          totalMappings,
          updatedMappings: totalUpdated,
          syncResults
        }
      };

    } catch (error) {
      console.error('[ServiceConfig] Error during bulk priority synchronization:', error);
      return {
        success: false,
        message: 'Error during bulk synchronization',
        details: {
          totalProviders: 0,
          totalMappings: 0,
          updatedMappings: 0,
          syncResults: []
        }
      };
    }
  }

  /**
   * Get priority synchronization status for all providers
   */
  async getPrioritySyncStatus(): Promise<{
    providers: Array<{
      id: string;
      name: string;
      priority: number;
      mappingsCount: number;
      syncedMappingsCount: number;
      unsyncedMappingsCount: number;
      syncPercentage: number;
    }>;
    overallStatus: {
      totalProviders: number;
      totalMappings: number;
      syncedMappings: number;
      unsyncedMappings: number;
      overallSyncPercentage: number;
    };
  }> {
    try {
      const providers = await prisma.serviceProvider.findMany({
        include: {
          operationMappings: true
        },
        orderBy: { priority: 'asc' }
      });

      const providerStatuses = providers.map(provider => {
        const mappingsCount = provider.operationMappings.length;
        const syncedMappingsCount = provider.operationMappings.filter(
          mapping => mapping.priority === provider.priority
        ).length;
        const unsyncedMappingsCount = mappingsCount - syncedMappingsCount;
        const syncPercentage = mappingsCount > 0 ? (syncedMappingsCount / mappingsCount) * 100 : 100;

        return {
          id: provider.id,
          name: provider.name,
          priority: provider.priority,
          mappingsCount,
          syncedMappingsCount,
          unsyncedMappingsCount,
          syncPercentage
        };
      });

      const totalMappings = providerStatuses.reduce((sum, p) => sum + p.mappingsCount, 0);
      const totalSynced = providerStatuses.reduce((sum, p) => sum + p.syncedMappingsCount, 0);
      const totalUnsynced = totalMappings - totalSynced;
      const overallSyncPercentage = totalMappings > 0 ? (totalSynced / totalMappings) * 100 : 100;

      return {
        providers: providerStatuses,
        overallStatus: {
          totalProviders: providers.length,
          totalMappings,
          syncedMappings: totalSynced,
          unsyncedMappings: totalUnsynced,
          overallSyncPercentage
        }
      };

    } catch (error) {
      console.error('[ServiceConfig] Error getting priority sync status:', error);
      throw error;
    }
  }

  /**
   * Get service provider by ID
   */
  async getServiceProviderById(id: string): Promise<ServiceProvider | null> {
    return await prisma.serviceProvider.findUnique({
      where: { id }
    });
  }

  /**
   * Delete a service provider
   */
  async deleteServiceProvider(id: string): Promise<void> {
    console.log('Service: Deleting provider with ID:', id);
    
    // First, delete related operation mappings
    await prisma.operationServiceMapping.deleteMany({
      where: { serviceId: id }
    });
    console.log('Related operation mappings deleted');
    
    // Then, delete related usage records
    await prisma.serviceUsage.deleteMany({
      where: { serviceId: id }
    });
    console.log('Related usage records deleted');
    
    // Finally, delete the service provider
    await prisma.serviceProvider.delete({
      where: { id }
    });
    console.log('Service provider deleted');
  }

  /**
   * Create operation-service mapping
   */
  async createOperationMapping(data: {
    operation: string;
    serviceId: string;
    isEnabled: boolean;
    priority: number;
    config: string;
  }): Promise<OperationServiceMapping & { service: ServiceProvider }> {
    return await prisma.operationServiceMapping.create({
      data,
      include: { service: true }
    });
  }

  /**
   * Update operation-service mapping
   */
  async updateOperationMapping(id: string, data: Partial<{
    operation: string;
    serviceId: string;
    isEnabled: boolean;
    priority: number;
    config: string;
  }>): Promise<OperationServiceMapping & { service: ServiceProvider }> {
    return await prisma.operationServiceMapping.update({
      where: { id },
      data,
      include: { service: true }
    });
  }

  /**
   * Delete operation-service mapping
   */
  async deleteOperationMapping(id: string): Promise<void> {
    await prisma.operationServiceMapping.delete({
      where: { id }
    });
  }

  /**
   * Get service usage statistics
   */
  async getServiceUsageStats(serviceId?: string, operation?: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = {
      createdAt: { gte: startDate }
    };

    if (serviceId) where.serviceId = serviceId;
    if (operation) where.operation = operation;

    const usage = await prisma.serviceUsage.findMany({
      where,
      include: {
        service: true,
        user: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate statistics
    const totalRequests = usage.length;
    const successfulRequests = usage.filter(u => u.success).length;
    const totalCost = usage.reduce((sum, u) => sum + (u.cost || 0), 0);
    const totalTokens = usage.reduce((sum, u) => sum + (u.tokensUsed || 0), 0);
    const averageDuration = usage.length > 0 
      ? usage.reduce((sum, u) => sum + (u.duration || 0), 0) / usage.length 
      : 0;

    return {
      totalRequests,
      successfulRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      totalCost,
      totalTokens,
      averageDuration,
      usage
    };
  }

  /**
   * Get available operations
   */
  getAvailableOperations(): string[] {
    return [
      'AI_DISCOVERY',
      'MARKET_DISCOVERY', 
      'WEB_SCRAPING',
      'SITE_ANALYSIS',
      'KEYWORD_EXTRACTION',
      'LEAD_SCORING',
      'CONTENT_ANALYSIS'
    ];
  }

  /**
   * Get available service types
   */
  getAvailableServiceTypes(): string[] {
    return [
      'AI_ENGINE',
      'SCRAPER',
      'SITE_ANALYZER',
      'KEYWORD_EXTRACTOR',
      'CONTENT_ANALYZER'
    ];
  }

  /**
   * Test service provider connectivity and basic functionality
   */
  async testServiceProvider(serviceId: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const provider = await prisma.serviceProvider.findUnique({
        where: { id: serviceId }
      });

      if (!provider) {
        return {
          success: false,
          message: 'Service provider not found'
        };
      }

      if (!provider.isActive) {
        return {
          success: false,
          message: 'Service provider is inactive'
        };
      }

      const config = JSON.parse(provider.config);
      const capabilities = JSON.parse(provider.capabilities);

      // Test based on service type
      switch (provider.type) {
        case 'AI_ENGINE':
          return await this.testAIEngine(provider, config, capabilities);
        
        case 'SCRAPER':
          return await this.testScraper(provider, config, capabilities);
        
        case 'SITE_ANALYZER':
          return await this.testSiteAnalyzer(provider, config, capabilities);
        
        case 'CONTENT_ANALYZER':
          return await this.testContentAnalyzer(provider, config, capabilities);
        
        default:
          return {
            success: false,
            message: `Unknown service type: ${provider.type}`
          };
      }
          } catch (error) {
        return {
          success: false,
          message: 'Error testing service provider',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
  }

  /**
   * Test AI Engine service
   */
  private async testAIEngine(provider: ServiceProvider, config: any, capabilities: string[]): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // Check if API key is configured
      if (!config.apiKey || config.apiKey === 'your-api-key') {
        return {
          success: false,
          message: 'API key not configured'
        };
      }

      // Test with a simple prompt based on capabilities
      let testPrompt = 'Hello, this is a connectivity test.';
      
      if (capabilities.includes('AI_DISCOVERY')) {
        testPrompt = 'Please respond with "AI Discovery test successful" if you can see this message.';
      } else if (capabilities.includes('LEAD_SCORING')) {
        testPrompt = 'Please respond with "Lead Scoring test successful" if you can see this message.';
      }

      // For now, we'll just validate the configuration
      // In a full implementation, you'd make an actual API call
      const hasValidConfig = config.apiKey && 
                           (config.model || config.endpoint) && 
                           config.apiKey.length > 10;

      if (hasValidConfig) {
        return {
          success: true,
          message: `${provider.name} configuration appears valid`,
          details: {
            type: 'AI_ENGINE',
            capabilities: capabilities,
            hasApiKey: !!config.apiKey,
            hasModel: !!config.model,
            hasEndpoint: !!config.endpoint
          }
        };
      } else {
        return {
          success: false,
          message: 'Invalid configuration - missing required fields',
          details: {
            hasApiKey: !!config.apiKey,
            hasModel: !!config.model,
            hasEndpoint: !!config.endpoint
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error testing AI engine',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test Scraper service
   */
  private async testScraper(provider: ServiceProvider, config: any, capabilities: string[]): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // Check if API token is configured
      if (!config.apiToken || config.apiToken === 'your-api-token') {
        return {
          success: false,
          message: 'API token not configured'
        };
      }

      // Validate scraper configuration
      const hasValidConfig = config.apiToken && 
                           (config.defaultActor || config.endpoint) && 
                           config.apiToken.length > 10;

      if (hasValidConfig) {
        return {
          success: true,
          message: `${provider.name} configuration appears valid`,
          details: {
            type: 'SCRAPER',
            capabilities: capabilities,
            hasApiToken: !!config.apiToken,
            hasDefaultActor: !!config.defaultActor,
            hasEndpoint: !!config.endpoint
          }
        };
      } else {
        return {
          success: false,
          message: 'Invalid configuration - missing required fields',
          details: {
            hasApiToken: !!config.apiToken,
            hasDefaultActor: !!config.defaultActor,
            hasEndpoint: !!config.endpoint
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error testing scraper',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test Site Analyzer service
   */
  private async testSiteAnalyzer(provider: ServiceProvider, config: any, capabilities: string[]): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // Site analyzers typically need less configuration
      const hasValidConfig = config.maxConcurrency || config.timeout || config.userAgent;

      if (hasValidConfig) {
        return {
          success: true,
          message: `${provider.name} configuration appears valid`,
          details: {
            type: 'SITE_ANALYZER',
            capabilities: capabilities,
            hasMaxConcurrency: !!config.maxConcurrency,
            hasTimeout: !!config.timeout,
            hasUserAgent: !!config.userAgent
          }
        };
      } else {
        return {
          success: false,
          message: 'Invalid configuration - missing required fields',
          details: {
            hasMaxConcurrency: !!config.maxConcurrency,
            hasTimeout: !!config.timeout,
            hasUserAgent: !!config.userAgent
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error testing site analyzer',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test Content Analyzer service
   */
  private async testContentAnalyzer(provider: ServiceProvider, config: any, capabilities: string[]): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // Content analyzers typically need scoring model configuration
      const hasValidConfig = config.scoringModel || config.confidenceThreshold;

      if (hasValidConfig) {
        return {
          success: true,
          message: `${provider.name} configuration appears valid`,
          details: {
            type: 'CONTENT_ANALYZER',
            capabilities: capabilities,
            hasScoringModel: !!config.scoringModel,
            hasConfidenceThreshold: !!config.confidenceThreshold,
            hasMaxAnalysisTime: !!config.maxAnalysisTime
          }
        };
      } else {
        return {
          success: false,
          message: 'Invalid configuration - missing required fields',
          details: {
            hasScoringModel: !!config.scoringModel,
            hasConfidenceThreshold: !!config.confidenceThreshold,
            hasMaxAnalysisTime: !!config.maxAnalysisTime
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error testing content analyzer',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default ServiceConfigurationService;
