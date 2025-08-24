import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        { priority: 'asc' },
        { service: { priority: 'asc' } }
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
    return await prisma.serviceProvider.create({
      data
    });
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
    return await prisma.serviceProvider.update({
      where: { id },
      data
    });
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
}

export default ServiceConfigurationService;
