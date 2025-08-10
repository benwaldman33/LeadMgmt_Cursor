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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bbds_access_token');
      localStorage.removeItem('bbds_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    console.log('🔐 [AUTH DEBUG] Starting login process...');
    console.log('📧 Email:', email);
    console.log('🌐 API Base URL:', API_BASE_URL);
    console.log('🔗 Full login URL:', `${API_BASE_URL}/auth/login`);
    
    try {
      console.log('📤 [AUTH DEBUG] Sending login request...');
      const response = await api.post('/auth/login', { email, password });
      
      console.log('✅ [AUTH DEBUG] Login response received');
      console.log('📊 Response status:', response.status);
      console.log('📋 Response headers:', response.headers);
      console.log('📦 Full response data:', JSON.stringify(response.data, null, 2));
      
      // Extract token and user from nested response structure
      const { data } = response.data;
      
      if (!data) {
        console.error('❌ [AUTH ERROR] No data in response');
        throw new Error('Invalid response format: missing data');
      }
      
      if (!data.accessToken) {
        console.error('❌ [AUTH ERROR] No accessToken in response');
        console.log('🔍 Available keys in data:', Object.keys(data));
        throw new Error('Invalid response format: missing accessToken');
      }
      
      if (!data.user) {
        console.error('❌ [AUTH ERROR] No user in response');
        console.log('🔍 Available keys in data:', Object.keys(data));
        throw new Error('Invalid response format: missing user');
      }
      
      console.log('🎉 [AUTH SUCCESS] Login successful!');
      console.log('🔑 Token (first 20 chars):', data.accessToken.substring(0, 20) + '...');
      console.log('👤 User:', data.user);
      
      return {
        token: data.accessToken,
        user: data.user
      };
    } catch (error: any) {
      console.error('💥 [AUTH ERROR] Login failed');
      console.error('🚨 Error type:', error.constructor.name);
      console.error('📝 Error message:', error.message);
      
      if (error.response) {
        console.error('📊 HTTP Status:', error.response.status);
        console.error('📋 Response headers:', error.response.headers);
        console.error('💀 Response data:', JSON.stringify(error.response.data, null, 2));
        
        // Specific error handling
        if (error.response.status === 404) {
          throw new Error('Login endpoint not found. Backend may not be running.');
        } else if (error.response.status === 401) {
          throw new Error('Invalid credentials provided.');
        } else if (error.response.status >= 500) {
          throw new Error('Server error. Please check backend logs.');
        }
      } else if (error.request) {
        console.error('🌐 No response received from server');
        console.error('📡 Request details:', error.request);
        throw new Error('Cannot connect to server. Please check if backend is running on port 3001.');
      } else {
        console.error('⚙️ Request setup error:', error.message);
      }
      
      throw error;
    }
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

  getEnrichment: async (id: string) => {
    const response = await api.get(`/leads/${id}/enrichment`);
    return response.data;
  },

  // Pipeline API methods
  startPipeline: async (data: {
    urls: string[];
    campaignId: string;
    industry?: string;
  }) => {
    const response = await api.post('/leads/pipeline', data);
    return response.data;
  },

  getPipelineJob: async (jobId: string) => {
    const response = await api.get(`/leads/pipeline/${jobId}`);
    return response.data;
  },

  getCampaignPipelineJobs: async (campaignId: string) => {
    const response = await api.get(`/leads/campaign/${campaignId}/pipeline`);
    return response.data;
  },

  update: async (id: string, leadData: {
    url: string;
    companyName: string;
    domain: string;
    industry: string;
    campaignId?: string;
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

  exportLeads: async (options: {
    format?: 'csv' | 'json';
    includeEnrichment?: boolean;
    includeScoring?: boolean;
    filters?: Record<string, any>;
  } = {}) => {
    const response = await api.post('/leads/export', options, {
      responseType: 'blob',
    });
    return response;
  },

  importLeads: async (file: File, campaignId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('campaignId', campaignId);
    
    const response = await api.post('/leads/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Scoring API
export const scoringAPI = {
  getAll: async (params?: { industry?: string }) => {
    const response = await api.get('/scoring', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/scoring/${id}`);
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

  update: async (id: string, scoringData: {
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
    const response = await api.put(`/scoring/${id}`, scoringData);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/scoring/${id}`);
    return response.data;
  },

  duplicate: async (id: string, name?: string) => {
    const response = await api.post(`/scoring/${id}/duplicate`, { name });
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