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
    const token = localStorage.getItem('bbds_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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

export class ApifyService {
  /**
   * Get all configured Apify Actors
   */
  async getActorConfigs(): Promise<ApifyActorConfig[]> {
    const response = await api.get('/apify/actors');
    return response.data.data;
  }

  /**
   * Create a new Apify Actor configuration
   */
  async createActorConfig(config: Omit<ApifyActorConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApifyActorConfig> {
    const response = await api.post('/apify/actors', config);
    return response.data.data;
  }

  /**
   * Test an Apify Actor configuration
   */
  async testActorConfig(actorId: string, apiToken: string): Promise<boolean> {
    const response = await api.post('/apify/test', { actorId, apiToken });
    return response.data.data.isValid;
  }

  /**
   * Scrape URLs using an Apify Actor
   */
  async scrapeWithActor(actorId: string, urls: string[], industry?: string): Promise<ApifyScrapingJob> {
    const response = await api.post('/apify/scrape', {
      actorId,
      urls,
      industry
    });
    return response.data.data;
  }

  /**
   * Get the status and results of an Apify scraping job
   */
  async getJobStatus(jobId: string): Promise<ApifyScrapingJob> {
    const response = await api.get(`/apify/jobs/${jobId}`);
    return response.data.data;
  }

  /**
   * Run an Apify Actor with custom input
   */
  async runActor(actorId: string, input: Record<string, any> = {}): Promise<ApifyRunResult> {
    const response = await api.post('/apify/run', {
      actorId,
      input
    });
    return response.data.data;
  }

  /**
   * Get the status of an Apify run
   */
  async getRunStatus(runId: string, actorId: string): Promise<ApifyRunResult> {
    const response = await api.get(`/apify/runs/${runId}?actorId=${actorId}`);
    return response.data.data;
  }

  /**
   * Get all configured Apify Service Providers
   */
  async getApifyServices(): Promise<ApifyServiceConfig[]> {
    const response = await api.get('/apify/services');
    return response.data.data;
  }
}

export const apifyService = new ApifyService();
