import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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

export class WebScrapingService {
  /**
   * Scrape a single URL
   */
  async scrapeUrl(url: string, industry?: string): Promise<ScrapingResult> {
    const response = await api.post('/web-scraping/scrape', {
      url,
      industry
    });
    return response.data.data;
  }

  /**
   * Scrape multiple URLs in batch
   */
  async scrapeBatch(urls: string[], industry?: string): Promise<ScrapingJob> {
    const response = await api.post('/web-scraping/batch', {
      urls,
      industry
    });
    return response.data.data;
  }

  /**
   * Get scraping statistics
   */
  async getScrapingStats(): Promise<ScrapingStats> {
    const response = await api.get('/web-scraping/stats');
    return response.data.data;
  }

  /**
   * Check if a URL is accessible
   */
  async checkUrlAccessibility(url: string): Promise<{ url: string; isAccessible: boolean }> {
    const response = await api.post('/web-scraping/check-accessibility', {
      url
    });
    return response.data.data;
  }

  /**
   * Health check for web scraping service
   */
  async healthCheck(): Promise<{ status: string; testUrl: string; testResult: boolean }> {
    const response = await api.get('/web-scraping/health');
    return response.data.data;
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Normalize URL
   */
  static normalizeUrl(url: string): string {
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
   * Extract domain from URL
   */
  static extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  /**
   * Format processing time
   */
  static formatProcessingTime(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      return `${(ms / 60000).toFixed(1)}m`;
    }
  }

  /**
   * Get industry-specific technology keywords
   */
  static getIndustryTechnologies(industry: string): string[] {
    const techKeywords: Record<string, string[]> = {
      'dental': ['CBCT', 'Scanner', 'Laser', 'Implant', 'Restorative', 'Intraoral'],
      'construction': ['Crane', 'Excavator', 'Bulldozer', 'Loader', 'Backhoe'],
      'manufacturing': ['Automation', 'Robotics', 'CNC', 'PLC', 'SCADA'],
      'retail': ['POS', 'E-commerce', 'Inventory', 'CRM', 'Analytics'],
      'warehouse': ['WMS', 'Automation', 'Conveyor', 'Racking', 'Forklift']
    };
    
    return techKeywords[industry] || [];
  }

  /**
   * Get industry-specific certification patterns
   */
  static getIndustryCertifications(industry: string): string[] {
    const certPatterns: Record<string, string[]> = {
      'dental': ['ADA', 'ISO 13485', 'FDA', 'CE Mark'],
      'construction': ['OSHA', 'ISO 9001', 'LEED', 'Safety Certified'],
      'manufacturing': ['ISO 9001', 'ISO 14001', 'FDA', 'CE Mark'],
      'retail': ['PCI DSS', 'ISO 27001', 'SOC 2'],
      'warehouse': ['ISO 9001', 'OSHA', 'Safety Certified']
    };
    
    return certPatterns[industry] || [];
  }
}

export const webScrapingService = new WebScrapingService(); 