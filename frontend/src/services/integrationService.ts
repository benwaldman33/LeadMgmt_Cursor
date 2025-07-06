import api from './api';

export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'crm' | 'marketing' | 'email' | 'analytics' | 'custom';
  provider: string;
  config: Record<string, any>;
  isActive: boolean;
  lastSync?: Date;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  errorMessage?: string;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: string[];
  duration: number;
}

export interface Provider {
  id: string;
  name: string;
  type: string;
  description: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export interface WebhookPayload {
  event: string;
  entityType: string;
  entityId: string;
  data: any;
  timestamp: Date;
}

class IntegrationService {
  async getIntegrations(): Promise<IntegrationConfig[]> {
    const response = await api.get('/integrations');
    return response.data;
  }

  async getIntegration(id: string): Promise<IntegrationConfig> {
    const response = await api.get(`/integrations/${id}`);
    return response.data;
  }

  async getProviders(): Promise<Provider[]> {
    const response = await api.get('/integrations/providers');
    return response.data;
  }

  async createIntegration(config: Omit<IntegrationConfig, 'id' | 'lastSync' | 'syncStatus'>): Promise<IntegrationConfig> {
    const response = await api.post('/integrations', config);
    return response.data;
  }

  async updateIntegration(id: string, updates: Partial<IntegrationConfig>): Promise<IntegrationConfig> {
    const response = await api.put(`/integrations/${id}`, updates);
    return response.data;
  }

  async deleteIntegration(id: string): Promise<void> {
    await api.delete(`/integrations/${id}`);
  }

  async testConnection(id: string): Promise<ConnectionTestResult> {
    const response = await api.post(`/integrations/${id}/test`);
    return response.data;
  }

  async syncLeads(id: string): Promise<SyncResult> {
    const response = await api.post(`/integrations/${id}/sync`);
    return response.data;
  }

  async sendWebhook(id: string, payload: Omit<WebhookPayload, 'timestamp'>): Promise<{ delivered: boolean }> {
    const response = await api.post(`/integrations/${id}/webhook`, payload);
    return response.data;
  }

  // Helper methods for provider-specific configurations
  getProviderConfigFields(provider: string): Array<{ key: string; label: string; type: string; required: boolean; description?: string }> {
    const configs: Record<string, Array<{ key: string; label: string; type: string; required: boolean; description?: string }>> = {
      salesforce: [
        { key: 'accessToken', label: 'Access Token', type: 'password', required: true, description: 'OAuth access token from Salesforce' },
        { key: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, description: 'Your Salesforce instance URL (e.g., https://na1.salesforce.com)' },
      ],
      hubspot: [
        { key: 'apiKey', label: 'API Key', type: 'password', required: true, description: 'HubSpot API key from your account settings' },
      ],
      mailchimp: [
        { key: 'apiKey', label: 'API Key', type: 'password', required: true, description: 'Mailchimp API key' },
        { key: 'serverPrefix', label: 'Server Prefix', type: 'text', required: true, description: 'Your Mailchimp server prefix (e.g., us1)' },
        { key: 'listId', label: 'Audience ID', type: 'text', required: true, description: 'Mailchimp audience/list ID' },
      ],
      zapier: [
        { key: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true, description: 'Zapier webhook URL' },
      ],
      custom: [
        { key: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true, description: 'Custom webhook endpoint URL' },
        { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', required: false, description: 'Optional secret for webhook signature verification' },
      ],
    };

    return configs[provider] || [];
  }

  getProviderDescription(provider: string): string {
    const descriptions: Record<string, string> = {
      salesforce: 'Connect to Salesforce CRM to sync leads and opportunities',
      hubspot: 'Connect to HubSpot CRM to sync contacts and deals',
      mailchimp: 'Connect to Mailchimp to sync email subscribers',
      zapier: 'Connect to Zapier for automation workflows',
      custom: 'Send data to custom webhook endpoints',
    };

    return descriptions[provider] || 'Custom integration provider';
  }

  getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      salesforce: '🔵',
      hubspot: '🟠',
      mailchimp: '🟡',
      zapier: '⚡',
      custom: '🔗',
    };

    return icons[provider] || '🔗';
  }

  formatSyncStatus(status: string): { label: string; color: string; icon: string } {
    const statusConfigs: Record<string, { label: string; color: string; icon: string }> = {
      idle: { label: 'Idle', color: 'gray', icon: '⏸️' },
      syncing: { label: 'Syncing', color: 'blue', icon: '🔄' },
      success: { label: 'Success', color: 'green', icon: '✅' },
      error: { label: 'Error', color: 'red', icon: '❌' },
    };

    return statusConfigs[status] || { label: 'Unknown', color: 'gray', icon: '❓' };
  }

  formatLastSync(lastSync?: Date): string {
    if (!lastSync) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - new Date(lastSync).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  validateConfig(provider: string, config: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const fields = this.getProviderConfigFields(provider);

    for (const field of fields) {
      if (field.required && (!config[field.key] || config[field.key].trim() === '')) {
        errors.push(`${field.label} is required`);
      }
    }

    // Provider-specific validation
    switch (provider) {
      case 'salesforce':
        if (config.instanceUrl && !config.instanceUrl.startsWith('https://')) {
          errors.push('Instance URL must start with https://');
        }
        break;
      case 'mailchimp':
        if (config.serverPrefix && !/^[a-z0-9]+$/.test(config.serverPrefix)) {
          errors.push('Server prefix must contain only lowercase letters and numbers');
        }
        break;
      case 'zapier':
      case 'custom':
        if (config.webhookUrl && !config.webhookUrl.startsWith('https://')) {
          errors.push('Webhook URL must start with https://');
        }
        break;
    }

    return { isValid: errors.length === 0, errors };
  }
}

export const integrationService = new IntegrationService(); 