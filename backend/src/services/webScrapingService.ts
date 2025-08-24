import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from '../index';
import { AuditLogService } from './auditLogService';
import { ServiceConfigurationService } from './serviceConfigurationService';

export interface ScrapingResult {
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
}

export interface ScrapingJob {
  id: string;
  urls: string[];
  industry: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: ScrapingResult[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ScrapingStats {
  totalUrls: number;
  successfulScrapes: number;
  failedScrapes: number;
  averageProcessingTime: number;
  industryBreakdown: Record<string, number>;
}

class WebScrapingService {
  private userAgents: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0'
  ];

  private rateLimits: Map<string, { requests: number; resetTime: number }> = new Map();
  private maxRequestsPerMinute = 60;
  private maxConcurrentRequests = 10;
  private activeRequests = 0;

  constructor() {
    // Initialize rate limiting
    setInterval(() => this.resetRateLimits(), 60000);
  }

  /**
   * Scrape a single URL with comprehensive content extraction
   */
  async scrapeUrl(url: string, industry?: string): Promise<ScrapingResult> {
    const startTime = Date.now();
    
    try {
      // Check rate limiting
      await this.checkRateLimit(url);
      
      // Validate URL
      const normalizedUrl = this.normalizeUrl(url);
      
      // Get random user agent
      const userAgent = this.getRandomUserAgent();
      
      // Make request with timeout and retry logic
      const response = await this.makeRequest(normalizedUrl, userAgent);
      
      // Parse content
      const $ = cheerio.load(response.data);
      
      // Extract content
      const content = this.extractContent($);
      const metadata = this.extractMetadata($);
      const structuredData = this.extractStructuredData($, industry);
      
      const processingTime = Date.now() - startTime;
      
      // Log successful scrape
      await this.logScrapingActivity(url, 'success', processingTime);
      
      return {
        url: normalizedUrl,
        success: true,
        content,
        metadata,
        structuredData,
        timestamp: new Date(),
        processingTime
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failed scrape
      await this.logScrapingActivity(url, 'failed', processingTime, errorMessage);
      
      return {
        url: this.normalizeUrl(url),
        success: false,
        content: '',
        metadata: {
          title: '',
          description: '',
          keywords: [],
          language: 'en'
        },
        structuredData: {},
        error: errorMessage,
        timestamp: new Date(),
        processingTime
      };
    }
  }

  /**
   * Scrape multiple URLs in batch with industry-specific processing
   */
  async scrapeBatch(urls: string[], industry?: string): Promise<ScrapingJob> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: ScrapingJob = {
      id: jobId,
      urls,
      industry: industry || 'general',
      status: 'pending',
      results: [],
      createdAt: new Date()
    };

    try {
      job.status = 'running';
      
      // Process URLs in batches to respect rate limits
      const batchSize = 5;
      const results: ScrapingResult[] = [];
      
      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        
        // Process batch concurrently with rate limiting
        const batchPromises = batch.map(url => 
          this.scrapeUrl(url, industry)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              url: batch[index],
              success: false,
              content: '',
              metadata: {
                title: '',
                description: '',
                keywords: [],
                language: 'en'
              },
              structuredData: {},
              error: result.reason?.message || 'Unknown error',
              timestamp: new Date(),
              processingTime: 0
            });
          }
        });
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < urls.length) {
          await this.delay(2000);
        }
      }
      
      job.results = results;
      job.status = 'completed';
      job.completedAt = new Date();
      
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
    }

    return job;
  }

  /**
   * Extract main content from HTML
   */
  private extractContent($: cheerio.Root): string {
    // Remove script and style elements
    $('script, style, noscript').remove();
    
    // Extract text from main content areas
    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '#content',
      '#main',
      'body'
    ];
    
    let content = '';
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 100) break; // Found substantial content
      }
    }
    
    // Clean and normalize content
    return this.cleanContent(content);
  }

  /**
   * Extract metadata from HTML
   */
  private extractMetadata($: cheerio.Root) {
    const title = $('title').text().trim() || $('h1').first().text().trim();
    const description = $('meta[name="description"]').attr('content') || '';
    const keywords = $('meta[name="keywords"]').attr('content')?.split(',').map((k: string) => k.trim()) || [];
    const language = $('html').attr('lang') || 'en';
    const lastModified = $('meta[http-equiv="last-modified"]').attr('content');
    
    return {
      title,
      description,
      keywords,
      language,
      lastModified
    };
  }

  /**
   * Extract structured data based on industry patterns
   */
  private extractStructuredData($: cheerio.Root, industry?: string) {
    const structuredData: any = {};
    
    // Extract company name
    const companyNameSelectors = [
      '.company-name',
      '.brand',
      '.logo-text',
      'h1',
      '.site-title'
    ];
    
    for (const selector of companyNameSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        structuredData.companyName = element.text().trim();
        break;
      }
    }
    
    // Extract contact information
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phonePattern = /(\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/g;
    
    const bodyText = $('body').text();
    const emails = bodyText.match(emailPattern) || [];
    const phones = bodyText.match(phonePattern) || [];
    
    if (emails.length > 0) {
      structuredData.contactInfo = {
        ...structuredData.contactInfo,
        email: emails[0]
      };
    }
    
    if (phones.length > 0) {
      structuredData.contactInfo = {
        ...structuredData.contactInfo,
        phone: phones[0]
      };
    }
    
    // Industry-specific extraction
    if (industry) {
      structuredData.industry = industry;
      structuredData.services = this.extractIndustryServices($, industry);
      structuredData.technologies = this.extractTechnologies($, industry);
      structuredData.certifications = this.extractCertifications($ as any, industry);
    }
    
    return structuredData;
  }

  /**
   * Extract industry-specific services
   */
  private extractIndustryServices($: cheerio.Root, industry: string): string[] {
    const services: string[] = [];
    
    // Common service indicators
    const serviceSelectors = [
      '.services',
      '.what-we-do',
      '.offerings',
      '.products',
      '.solutions'
    ];
    
    for (const selector of serviceSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const serviceText = element.text().toLowerCase();
        const serviceWords = serviceText.split(/\s+/);
        services.push(...serviceWords.filter((word: string) => word.length > 3));
      }
    }
    
    return [...new Set(services)].slice(0, 10); // Limit to 10 unique services
  }

  /**
   * Extract technology mentions
   */
  private extractTechnologies($: cheerio.Root, industry: string): string[] {
    const technologies: string[] = [];
    const bodyText = $('body').text().toLowerCase();
    
    // Technology keywords by industry
    const techKeywords: Record<string, string[]> = {
      'dental': ['cbct', 'scanner', 'laser', 'implant', 'restorative', 'intraoral'],
      'construction': ['crane', 'excavator', 'bulldozer', 'loader', 'backhoe'],
      'manufacturing': ['automation', 'robotics', 'cnc', 'plc', 'scada'],
      'retail': ['pos', 'ecommerce', 'inventory', 'crm', 'analytics'],
      'warehouse': ['wms', 'automation', 'conveyor', 'racking', 'forklift']
    };
    
    const industryTechs = techKeywords[industry] || [];
    
    for (const tech of industryTechs) {
      if (bodyText.includes(tech)) {
        technologies.push(tech);
      }
    }
    
    return technologies;
  }

  /**
   * Extract certifications and credentials
   */
  private extractCertifications($: cheerio.Root, industry: string): string[] {
    const certifications: string[] = [];
    const bodyText = $('body').text().toLowerCase();
    
    // Certification patterns
    const certPatterns = [
      /iso\s*\d{4}/gi,
      /certified/gi,
      /licensed/gi,
      /accredited/gi,
      /approved/gi
    ];
    
    for (const pattern of certPatterns) {
      const matches = bodyText.match(pattern);
      if (matches) {
        certifications.push(...matches);
      }
    }
    
    return [...new Set(certifications)];
  }

  /**
   * Clean and normalize content
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim()
      .substring(0, 10000); // Limit content length
  }

  /**
   * Normalize URL
   */
  private normalizeUrl(url: string): string {
    let normalized = url.trim();
    
    // Add protocol if missing
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    
    // Remove trailing slash
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(url: string, userAgent: string): Promise<any> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': userAgent,
          },
        });
        
        return response;
        
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as any;
          if (axiosError.response?.status === 404 || axiosError.response?.status === 403) {
            throw new Error('Page not accessible');
          }
        }
        
        // Wait before retry
        if (attempt < maxRetries) {
          await this.delay(1000 * attempt);
        }
      }
    }
    
    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Check and enforce rate limiting
   */
  private async checkRateLimit(url: string): Promise<void> {
    const domain = new URL(url).hostname;
    const now = Date.now();
    
    const rateLimit = this.rateLimits.get(domain);
    
    if (rateLimit) {
      if (now < rateLimit.resetTime && rateLimit.requests >= this.maxRequestsPerMinute) {
        const waitTime = rateLimit.resetTime - now;
        await this.delay(waitTime);
      }
      
      if (now >= rateLimit.resetTime) {
        rateLimit.requests = 1;
        rateLimit.resetTime = now + 60000;
      } else {
        rateLimit.requests++;
      }
    } else {
      this.rateLimits.set(domain, {
        requests: 1,
        resetTime: now + 60000
      });
    }
  }

  /**
   * Reset rate limits
   */
  private resetRateLimits(): void {
    const now = Date.now();
    for (const [domain, rateLimit] of this.rateLimits.entries()) {
      if (now >= rateLimit.resetTime) {
        this.rateLimits.delete(domain);
      }
    }
  }

  /**
   * Get random user agent
   */
  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log scraping activity
   */
  private async logScrapingActivity(url: string, status: 'success' | 'failed', processingTime: number, error?: string): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: 'WEB_SCRAPING',
          entityType: 'URL',
          entityId: url,
          description: `Web scraping ${status} for ${url}`,
          metadata: JSON.stringify({
            processingTime: processingTime,
            error: error,
            timestamp: new Date(),
          }),
          userId: null // System activity, no specific user
        }
      });
    } catch (error) {
      console.error('Failed to log scraping activity:', error);
    }
  }

  /**
   * Get scraping statistics
   */
  async getScrapingStats(): Promise<ScrapingStats> {
    // This would query the database for actual statistics
    // For now, return mock data
    return {
      totalUrls: 0,
      successfulScrapes: 0,
      failedScrapes: 0,
      averageProcessingTime: 0,
      industryBreakdown: {}
    };
  }

  /**
   * Check if URL is accessible
   */
  async checkUrlAccessibility(url: string): Promise<boolean> {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
      });
      return response.status >= 200 && response.status < 400;
    } catch {
      return false;
    }
  }
}

export const webScrapingService = new WebScrapingService(); 