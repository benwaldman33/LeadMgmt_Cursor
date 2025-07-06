import api from './api';

export interface DashboardMetrics {
  totalLeads: number;
  totalCampaigns: number;
  totalUsers: number;
  totalTeams: number;
  qualifiedLeads: number;
  conversionRate: number;
  averageScore: number;
  recentActivity: any[];
}

export interface LeadTrends {
  daily: Array<{ date: string; count: number }>;
  weekly: Array<{ week: string; count: number }>;
  monthly: Array<{ month: string; count: number }>;
}

export interface ScoringAnalytics {
  averageScore: number;
  scoreDistribution: Array<{ range: string; count: number }>;
  qualifiedRate: number;
  topScoringModels: Array<{ name: string; averageScore: number; leadCount: number }>;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  totalLeads: number;
  qualifiedLeads: number;
  averageScore: number;
  conversionRate: number;
  industry: string;
}

export interface TeamPerformance {
  teamId: string;
  teamName: string;
  totalLeads: number;
  qualifiedLeads: number;
  averageScore: number;
  memberCount: number;
}

export interface UserActivity {
  userId: string;
  userName: string;
  actions: number;
  lastActivity: string;
  leadCount: number;
}

export interface ConversionFunnel {
  stage: string;
  count: number;
}

export class AnalyticsService {
  /**
   * Get comprehensive dashboard metrics
   */
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await api.get('/analytics/dashboard');
    return response.data.data;
  }

  /**
   * Get lead trends over time
   */
  static async getLeadTrends(days: number = 30): Promise<LeadTrends> {
    const response = await api.get(`/analytics/trends?days=${days}`);
    return response.data.data;
  }

  /**
   * Get scoring analytics
   */
  static async getScoringAnalytics(): Promise<ScoringAnalytics> {
    const response = await api.get('/analytics/scoring');
    return response.data.data;
  }

  /**
   * Get campaign performance analytics
   */
  static async getCampaignPerformance(): Promise<CampaignPerformance[]> {
    const response = await api.get('/analytics/campaigns');
    return response.data.data;
  }

  /**
   * Get team performance analytics
   */
  static async getTeamPerformance(): Promise<TeamPerformance[]> {
    const response = await api.get('/analytics/teams');
    return response.data.data;
  }

  /**
   * Get user activity analytics
   */
  static async getUserActivity(): Promise<UserActivity[]> {
    const response = await api.get('/analytics/users');
    return response.data.data;
  }

  /**
   * Get industry distribution
   */
  static async getIndustryDistribution(): Promise<Array<{ industry: string; count: number }>> {
    const response = await api.get('/analytics/industries');
    return response.data.data;
  }

  /**
   * Get status distribution
   */
  static async getStatusDistribution(): Promise<Array<{ status: string; count: number }>> {
    const response = await api.get('/analytics/status');
    return response.data.data;
  }

  /**
   * Get recent leads
   */
  static async getRecentLeads(limit: number = 10): Promise<any[]> {
    const response = await api.get(`/analytics/recent-leads?limit=${limit}`);
    return response.data.data;
  }

  /**
   * Get conversion funnel data
   */
  static async getConversionFunnel(): Promise<ConversionFunnel[]> {
    const response = await api.get('/analytics/funnel');
    return response.data.data;
  }
}

// Helper functions for analytics
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatNumber = (value: number): string => {
  return value.toLocaleString();
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    RAW: 'text-gray-600',
    SCORED: 'text-blue-600',
    QUALIFIED: 'text-green-600',
    DELIVERED: 'text-purple-600',
    REJECTED: 'text-red-600',
  };
  return colors[status] || 'text-gray-600';
};

export const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  if (score >= 20) return 'text-orange-600';
  return 'text-red-600';
};

export const getTrendIcon = (current: number, previous: number): string => {
  if (current > previous) return '↗️';
  if (current < previous) return '↘️';
  return '→';
};

export const getTrendColor = (current: number, previous: number): string => {
  if (current > previous) return 'text-green-600';
  if (current < previous) return 'text-red-600';
  return 'text-gray-600';
}; 