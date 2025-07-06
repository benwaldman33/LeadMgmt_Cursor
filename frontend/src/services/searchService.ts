import api from './api';

export interface SearchFilters {
  query?: string;
  entityType?: 'LEAD' | 'CAMPAIGN' | 'USER' | 'TEAM' | 'SCORING_MODEL';
  status?: string;
  campaignId?: string;
  assignedToId?: string;
  assignedTeamId?: string;
  industry?: string;
  dateFrom?: string;
  dateTo?: string;
  scoreMin?: number;
  scoreMax?: number;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  type: 'LEAD' | 'CAMPAIGN' | 'USER' | 'TEAM' | 'SCORING_MODEL';
  id: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
  score?: number;
  createdAt: string;
  updatedAt: string;
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
    leads: any[];
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
    campaigns: any[];
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
    formattedDate: new Date(result.createdAt).toLocaleDateString(),
  };
}; 