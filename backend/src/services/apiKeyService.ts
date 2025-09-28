import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Encryption key - should be stored in environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars-long';

export interface APIKeyConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
  [key: string]: any;
}

export interface ServiceConfig {
  name: string;
  type: 'AI_ENGINE' | 'SCRAPER' | 'SITE_ANALYZER' | 'KEYWORD_EXTRACTOR' | 'CONTENT_ANALYZER';
  config: APIKeyConfig;
  capabilities: string[];
  limits?: {
    monthlyQuota?: number;
    concurrentRequests?: number;
    costPerRequest?: number;
  };
}

export class APIKeyService {
  private static instance: APIKeyService;
  private cache: Map<string, ServiceConfig> = new Map();

  private constructor() {}

  public static getInstance(): APIKeyService {
    if (!APIKeyService.instance) {
      APIKeyService.instance = new APIKeyService();
    }
    return APIKeyService.instance;
  }

  /**
   * Get API key from environment variables first, then database
   */
  public async getAPIKey(serviceName: string, serviceType: string): Promise<ServiceConfig | null> {
    // Check cache first
    const cacheKey = `${serviceName}_${serviceType}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Try environment variables first
    const envConfig = this.getFromEnvironment(serviceName, serviceType);
    if (envConfig) {
      this.cache.set(cacheKey, envConfig);
      return envConfig;
    }

    // Fallback to database
    const dbConfig = await this.getFromDatabase(serviceName, serviceType);
    if (dbConfig) {
      this.cache.set(cacheKey, dbConfig);
      return dbConfig;
    }

    return null;
  }

  /**
   * Get configuration from environment variables
   */
  private getFromEnvironment(serviceName: string, serviceType: string): ServiceConfig | null {
    const envKey = this.getEnvironmentKey(serviceName, serviceType);
    const apiKey = process.env[envKey];
    
    if (!apiKey) {
      return null;
    }

    // Build configuration based on service type
    const config: APIKeyConfig = {
      apiKey: apiKey
    };

    // Add type-specific configuration
    switch (serviceType) {
      case 'AI_ENGINE':
        config.model = process.env[`${envKey}_MODEL`] || 'claude-sonnet-4-20250514';
        config.maxTokens = parseInt(process.env[`${envKey}_MAX_TOKENS`] || '4096');
        config.temperature = parseFloat(process.env[`${envKey}_TEMPERATURE`] || '0.7');
        config.baseUrl = process.env[`${envKey}_BASE_URL`];
        break;
      
      case 'SCRAPER':
        config.baseUrl = process.env[`${envKey}_BASE_URL`];
        config.maxConcurrency = parseInt(process.env[`${envKey}_MAX_CONCURRENCY`] || '10');
        break;
      
      case 'SITE_ANALYZER':
        config.maxDepth = parseInt(process.env[`${envKey}_MAX_DEPTH`] || '3');
        config.maxPages = parseInt(process.env[`${envKey}_MAX_PAGES`] || '100');
        config.requestDelay = parseInt(process.env[`${envKey}_REQUEST_DELAY`] || '1000');
        break;
    }

    const capabilities = this.getCapabilitiesFromEnv(envKey);
    const limits = this.getLimitsFromEnv(envKey);

    return {
      name: serviceName,
      type: serviceType as any,
      config,
      capabilities,
      limits
    };
  }

  /**
   * Get configuration from database
   */
  private async getFromDatabase(serviceName: string, serviceType: string): Promise<ServiceConfig | null> {
    try {
      const serviceProvider = await prisma.serviceProvider.findFirst({
        where: {
          name: serviceName,
          type: serviceType,
          isActive: true
        }
      });

      if (!serviceProvider) {
        return null;
      }

      const config = JSON.parse(serviceProvider.config);
      const capabilities = JSON.parse(serviceProvider.capabilities);
      const limits = serviceProvider.limits ? JSON.parse(serviceProvider.limits) : undefined;

      // Decrypt API key if it's encrypted
      if (config.apiKey && config.apiKey.startsWith('encrypted:')) {
        config.apiKey = this.decrypt(config.apiKey.replace('encrypted:', ''));
      }

      return {
        name: serviceProvider.name,
        type: serviceProvider.type as any,
        config,
        capabilities,
        limits
      };
    } catch (error) {
      console.error('Error fetching API key from database:', error);
      return null;
    }
  }

  /**
   * Store API key in database with encryption
   */
  public async storeAPIKey(serviceName: string, serviceType: string, config: APIKeyConfig, capabilities: string[], limits?: any): Promise<void> {
    try {
      // Encrypt the API key
      const encryptedConfig = {
        ...config,
        apiKey: `encrypted:${this.encrypt(config.apiKey)}`
      };

      // Check if service provider already exists
      const existingProvider = await prisma.serviceProvider.findFirst({
        where: {
          name: serviceName,
          type: serviceType
        }
      });

      if (existingProvider) {
        // Update existing provider
        await prisma.serviceProvider.update({
          where: { id: existingProvider.id },
          data: {
            config: JSON.stringify(encryptedConfig),
            capabilities: JSON.stringify(capabilities),
            limits: limits ? JSON.stringify(limits) : '{}',
            updatedAt: new Date()
          }
        });
      } else {
        // Create new provider
        await prisma.serviceProvider.create({
          data: {
            name: serviceName,
            type: serviceType,
            config: JSON.stringify(encryptedConfig),
            capabilities: JSON.stringify(capabilities),
            limits: limits ? JSON.stringify(limits) : '{}',
            isActive: true,
            priority: 1
          }
        });
      }

      // Clear cache
      const cacheKey = `${serviceName}_${serviceType}`;
      this.cache.delete(cacheKey);
    } catch (error) {
      console.error('Error storing API key:', error);
      throw error;
    }
  }

  /**
   * Get environment variable key for a service
   */
  private getEnvironmentKey(serviceName: string, serviceType: string): string {
    const normalizedName = serviceName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const normalizedType = serviceType.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    return `${normalizedType}_${normalizedName}_API_KEY`;
  }

  /**
   * Get capabilities from environment variables
   */
  private getCapabilitiesFromEnv(envKey: string): string[] {
    const capabilitiesStr = process.env[`${envKey}_CAPABILITIES`];
    if (capabilitiesStr) {
      return JSON.parse(capabilitiesStr);
    }
    
    // Default capabilities based on common patterns
    if (envKey.includes('AI_ENGINE')) {
      return ['AI_DISCOVERY', 'MARKET_DISCOVERY', 'KEYWORD_EXTRACTION', 'CONTENT_ANALYSIS', 'LEAD_SCORING'];
    } else if (envKey.includes('SCRAPER')) {
      return ['WEB_SCRAPING', 'SITE_ANALYSIS'];
    } else if (envKey.includes('SITE_ANALYZER')) {
      return ['SITE_ANALYSIS', 'KEYWORD_EXTRACTION'];
    }
    
    return [];
  }

  /**
   * Get limits from environment variables
   */
  private getLimitsFromEnv(envKey: string): any {
    const limitsStr = process.env[`${envKey}_LIMITS`];
    if (limitsStr) {
      return JSON.parse(limitsStr);
    }
    
    return {
      monthlyQuota: parseInt(process.env[`${envKey}_MONTHLY_QUOTA`] || '1000'),
      concurrentRequests: parseInt(process.env[`${envKey}_CONCURRENT_REQUESTS`] || '5'),
      costPerRequest: parseFloat(process.env[`${envKey}_COST_PER_REQUEST`] || '0.03')
    };
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedText: string): string {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encrypted = textParts.join(':');
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get all available services
   */
  public async getAllServices(): Promise<ServiceConfig[]> {
    const services: ServiceConfig[] = [];
    
    // Get from environment variables
    const envServices = this.getAllFromEnvironment();
    services.push(...envServices);
    
    // Get from database
    const dbServices = await this.getAllFromDatabase();
    services.push(...dbServices);
    
    return services;
  }

  /**
   * Get all services from environment variables
   */
  private getAllFromEnvironment(): ServiceConfig[] {
    const services: ServiceConfig[] = [];
    const envVars = Object.keys(process.env);
    
    // Look for API key environment variables
    const apiKeyVars = envVars.filter(key => key.endsWith('_API_KEY'));
    
    for (const envVar of apiKeyVars) {
      const parts = envVar.split('_');
      if (parts.length >= 3) {
        const serviceType = parts[0];
        const serviceName = parts.slice(1, -2).join('_'); // Remove _API_KEY
        
        const config = this.getFromEnvironment(serviceName, serviceType);
        if (config) {
          services.push(config);
        }
      }
    }
    
    return services;
  }

  /**
   * Get all services from database
   */
  private async getAllFromDatabase(): Promise<ServiceConfig[]> {
    try {
      const serviceProviders = await prisma.serviceProvider.findMany({
        where: { isActive: true }
      });
      
      return serviceProviders.map(provider => {
        const config = JSON.parse(provider.config);
        const capabilities = JSON.parse(provider.capabilities);
        const limits = provider.limits ? JSON.parse(provider.limits) : undefined;
        
        // Decrypt API key if needed
        if (config.apiKey && config.apiKey.startsWith('encrypted:')) {
          config.apiKey = this.decrypt(config.apiKey.replace('encrypted:', ''));
        }
        
        return {
          name: provider.name,
          type: provider.type as any,
          config,
          capabilities,
          limits
        };
      });
    } catch (error) {
      console.error('Error fetching all services from database:', error);
      return [];
    }
  }
}

export default APIKeyService.getInstance();
