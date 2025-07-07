import api from './api';

export interface SearchFilters {
  query?: string;
  type?: string;
  status?: string;
  campaignId?: string;
  assignedToId?: string;
  assignedTeamId?: string;
  industry?: string;
  scoreRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description: string;
  url: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface LeadFilters {
  query?: string;
  status?: string[];
  campaignId?: string;
  assignedToId?: string;
  assignedTeamId?: string;
  industry?: string;
  scoreMin?: number;
  scoreMax?: number;
  dateFrom?: string;
  dateTo?: string;
  enriched?: boolean;
  scored?: boolean;
  limit?: number;
  offset?: number;
}

export interface CampaignFilters {
  query?: string;
  status?: string[];
  createdById?: string;
  assignedTeamId?: string;
  industry?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface FilterOptions {
  leadStatuses: Array<{ value: string; count: number }>;
  campaignStatuses: Array<{ value: string; count: number }>;
  industries: Array<{ value: string; count: number }>;
  campaigns: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string; email: string }>;
  teams: Array<{ id: string; name: string }>;
}

export class SearchService {
  /**
   * Global search across all entities
   */
  static async globalSearch(filters: SearchFilters): Promise<{
    results: SearchResult[];
    total: number;
    query: string;
  }> {
    const response = await api.post('/search/global', filters);
    return response.data.data;
  }

  /**
   * Advanced lead search and filtering
   */
  static async searchLeads(filters: LeadFilters): Promise<{
            leads: Array<Record<string, unknown>>;
    total: number;
    hasMore: boolean;
  }> {
    const response = await api.post('/search/leads', filters);
    return response.data.data;
  }

  /**
   * Advanced campaign search and filtering
   */
  static async searchCampaigns(filters: CampaignFilters): Promise<{
            campaigns: Array<Record<string, unknown>>;
    total: number;
    hasMore: boolean;
  }> {
    const response = await api.post('/search/campaigns', filters);
    return response.data.data;
  }

  /**
   * Get search suggestions for autocomplete
   */
  static async getSearchSuggestions(query: string, entityType?: string): Promise<string[]> {
    const params = new URLSearchParams();
    params.append('query', query);
    if (entityType) {
      params.append('entityType', entityType);
    }

    const response = await api.get(`/search/suggestions?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Get available filter options
   */
  static async getFilterOptions(): Promise<FilterOptions> {
    const response = await api.get('/search/filters');
    return response.data.data;
  }
}

// Helper functions for search
export const getEntityIcon = (type: string): string => {
  const icons: Record<string, string> = {
    LEAD: '📝',
    CAMPAIGN: '📊',
    USER: '👤',
    TEAM: '👥',
    SCORING_MODEL: '🧮',
  };
  return icons[type] || '📋';
};

export const getEntityColor = (type: string): string => {
  const colors: Record<string, string> = {
    LEAD: 'text-blue-600',
    CAMPAIGN: 'text-green-600',
    USER: 'text-purple-600',
    TEAM: 'text-orange-600',
    SCORING_MODEL: 'text-indigo-600',
  };
  return colors[type] || 'text-gray-600';
};

export const formatSearchResult = (result: SearchResult) => {
  return {
    ...result,
    icon: getEntityIcon(result.type),
    color: getEntityColor(result.type),
    formattedDate: result.metadata?.createdAt ? new Date(result.metadata.createdAt as string).toLocaleDateString() : 'Unknown',
  };
}; 