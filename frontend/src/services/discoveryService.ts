import api from './api';

export interface DiscoverySessionSummary {
  id: string;
  industry: string;
  productVertical?: string;
  status: string;
  pinned: boolean;
  updatedAt: string;
  lastAutoSavedAt?: string;
  expiresAt?: string | null;
}

export interface SavedCustomerListSummary {
  id: string;
  name: string;
  industry: string;
  productVertical?: string;
  pinned: boolean;
  capturedAt: string;
  updatedAt: string;
  expiresAt?: string | null;
}

export const discoveryService = {
  // Sessions
  async createSession(industry: string, productVertical?: string) {
    const res = await api.post('/discovery/sessions', { industry, productVertical });
    return res.data.session as { id: string };
  },

  async listSessions() {
    const res = await api.get('/discovery/sessions');
    return res.data.sessions as DiscoverySessionSummary[];
  },

  async getSession(sessionId: string) {
    const res = await api.get(`/discovery/sessions/${sessionId}`);
    return res.data.session as any;
  },

  async autosaveSession(sessionId: string, payload: {
    constraints?: unknown;
    resultsSnapshot?: unknown;
    productVertical?: string;
    pinned?: boolean;
  }) {
    const res = await api.post(`/discovery/sessions/${sessionId}/autosave`, payload);
    return res.data.session as any;
  },

  async updateSession(sessionId: string, payload: { pinned?: boolean }) {
    const res = await api.patch(`/discovery/sessions/${sessionId}`, payload);
    return res.data.session as any;
  },

  // Saved lists
  async createSavedList(payload: {
    name: string;
    industry: string;
    productVertical?: string;
    constraints?: unknown;
    aiEngineUsed?: string;
    promptVersion?: string;
    pinned?: boolean;
    items: Array<{
      url: string;
      title: string;
      description?: string;
      relevanceScore?: number;
      location?: string;
      companyType?: string;
      tags?: string[];
      notes?: string;
      rank?: number;
      domain?: string;
      logoUrl?: string;
      estEmployees?: number;
      estRevenue?: string;
      techTags?: string[];
    }>
  }) {
    const res = await api.post('/discovery/saved-lists', payload);
    return res.data.list as any;
  },

  async listSavedLists() {
    const res = await api.get('/discovery/saved-lists');
    return res.data.lists as SavedCustomerListSummary[];
  },

  async getSavedList(id: string) {
    const res = await api.get(`/discovery/saved-lists/${id}`);
    return res.data.list as any;
  },

  async deleteSavedList(id: string) {
    const res = await api.delete(`/discovery/saved-lists/${id}`);
    return res.data as { success: boolean };
  },
  
  async updateSavedList(id: string, payload: { pinned?: boolean }) {
    const res = await api.patch(`/discovery/saved-lists/${id}`, payload);
    return res.data.list as any;
  },

  async appendToSavedList(id: string, items: Array<{
    url: string;
    title: string;
    description?: string;
    relevanceScore?: number;
    location?: string;
    companyType?: string;
    tags?: string[];
    notes?: string;
    rank?: number;
    domain?: string;
    logoUrl?: string;
    estEmployees?: number;
    estRevenue?: string;
    techTags?: string[];
  }>) {
    const res = await api.post(`/discovery/saved-lists/${id}/items/append`, { items });
    return res.data as { success: boolean; appended: number };
  }
};

export default discoveryService;

