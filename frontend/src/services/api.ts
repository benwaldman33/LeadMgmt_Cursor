import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (userData: {
    email: string;
    password: string;
    fullName: string;
    role?: string;
    teamId?: string;
  }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  update: async (id: string, userData: Record<string, unknown>) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  getForAssignment: async () => {
    const response = await api.get('/users/assignment');
    return response.data;
  },
};

// Teams API
export const teamsAPI = {
  getAll: async () => {
    const response = await api.get('/teams');
    return response.data;
  },
  
  create: async (teamData: { name: string; industry: string }) => {
    const response = await api.post('/teams', teamData);
    return response.data;
  },
};

// Campaigns API
export const campaignsAPI = {
  getAll: async () => {
    const response = await api.get('/campaigns');
    return response.data;
  },
  
  create: async (campaignData: {
    name: string;
    industry: string;
    scoringModelId?: string;
    assignedTeamId?: string;
    targetLeadCount?: number;
    startDate?: string;
    targetEndDate?: string;
  }) => {
    const response = await api.post('/campaigns', campaignData);
    return response.data;
  },
};

// Leads API
export const leadsAPI = {
  getAll: async (params?: {
    campaignId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/leads', { params });
    return response.data;
  },
  
  create: async (leadData: {
    url: string;
    companyName: string;
    domain: string;
    industry: string;
    campaignId: string;
    assignedToId?: string;
    assignedTeamId?: string;
  }) => {
    const response = await api.post('/leads', leadData);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  },

  update: async (id: string, leadData: {
    url: string;
    companyName: string;
    domain: string;
    industry: string;
    campaignId: string;
    status?: string;
    assignedToId?: string;
    assignedTeamId?: string;
  }) => {
    const response = await api.put(`/leads/${id}`, leadData);
    return response.data;
  },

  enrich: async (id: string) => {
    const response = await api.post(`/leads/${id}/enrich`);
    return response.data;
  },

  // Bulk operations
  bulkUpdateStatus: async (leadIds: string[], status: string) => {
    const response = await api.post('/leads/bulk/status', { leadIds, status });
    return response.data;
  },

  bulkScore: async (leadIds: string[], scoringModelId: string) => {
    const response = await api.post('/leads/bulk/score', { leadIds, scoringModelId });
    return response.data;
  },

  bulkEnrich: async (leadIds: string[]) => {
    const response = await api.post('/leads/bulk/enrich', { leadIds });
    return response.data;
  },

  bulkDelete: async (leadIds: string[]) => {
    const response = await api.delete('/leads/bulk', { data: { leadIds } });
    return response.data;
  },
};

// Scoring API
export const scoringAPI = {
  getAll: async (params?: { industry?: string }) => {
    const response = await api.get('/scoring', { params });
    return response.data;
  },
  
  create: async (scoringData: {
    name: string;
    industry: string;
    criteria: Array<{
      name: string;
      description?: string;
      searchTerms: string[];
      weight: number;
      type: string;
    }>;
  }) => {
    const response = await api.post('/scoring', scoringData);
    return response.data;
  },

  scoreLead: async (leadId: string, scoringModelId: string) => {
    const response = await api.post('/scoring/score-lead', { leadId, scoringModelId });
    return response.data;
  },

  scoreCampaign: async (campaignId: string) => {
    const response = await api.post('/scoring/score-campaign', { campaignId });
    return response.data;
  },

  getResults: async (leadId: string) => {
    const response = await api.get(`/scoring/results/${leadId}`);
    return response.data;
  },
};

export default api; 