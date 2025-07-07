import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';
import { AuditLogService } from '../services/auditLogService';

const prisma = new PrismaClient();

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

export interface WebhookPayload {
  event: string;
  entityType: string;
  entityId: string;
  data: any;
  timestamp: Date;
}

class IntegrationService {
  private integrations: Map<string, IntegrationConfig> = new Map();

  constructor() {
    this.loadIntegrations();
  }

  private async loadIntegrations() {
    try {
      const integrations = await prisma.integration.findMany();
      integrations.forEach((integration: any) => {
        this.integrations.set(integration.id, {
          id: integration.id,
          name: integration.name,
          type: integration.type as any,
          provider: integration.provider,
          config: integration.config as Record<string, any>,
          isActive: integration.isActive,
          lastSync: integration.lastSync,
          syncStatus: integration.syncStatus as any,
          errorMessage: integration.errorMessage,
        });
      });
    } catch (error) {
      console.error('Error loading integrations:', error);
    }
  }

  async createIntegration(data: {
    name: string;
    type: string;
    provider: string;
    config: IntegrationConfig;
  }): Promise<IntegrationConfig> {
    const integration = await prisma.integration.create({
      data: {
        name: data.name,
        type: data.type,
        provider: data.provider,
        config: JSON.stringify(data.config),
        isActive: true,
        syncStatus: 'idle'
      }
    });

    await AuditLogService.logActivity({
      action: 'CREATE',
      entityType: 'INTEGRATION',
      entityId: integration.id,
      description: `Created integration: ${integration.name}`
    });

    return {
      id: integration.id,
      name: integration.name,
      type: integration.type as any,
      provider: integration.provider,
      config: typeof integration.config === 'string' ? (() => { try { return JSON.parse(integration.config); } catch { return {}; } })() : integration.config,
      isActive: integration.isActive,
      lastSync: integration.lastSync === null ? undefined : integration.lastSync,
      syncStatus: integration.syncStatus as any,
      errorMessage: integration.errorMessage === null ? undefined : integration.errorMessage
    };
  }

  async updateIntegration(id: string, updates: Partial<IntegrationConfig>): Promise<IntegrationConfig> {
    const integration = await prisma.integration.update({
      where: { id },
      data: {
        name: updates.name,
        type: updates.type,
        provider: updates.provider,
        config: updates.config,
        isActive: updates.isActive,
        syncStatus: updates.syncStatus,
        errorMessage: updates.errorMessage,
      },
    });

    const updatedIntegration: IntegrationConfig = {
      id: integration.id,
      name: integration.name,
      type: integration.type as any,
      provider: integration.provider,
      config: typeof integration.config === 'string' ? (() => { try { return JSON.parse(integration.config); } catch { return {}; } })() : integration.config,
      isActive: integration.isActive,
      lastSync: integration.lastSync === null ? undefined : integration.lastSync,
      syncStatus: integration.syncStatus as any,
      errorMessage: integration.errorMessage === null ? undefined : integration.errorMessage
    };

    this.integrations.set(id, updatedIntegration);
    return updatedIntegration;
  }

  async deleteIntegration(id: string): Promise<void> {
    await prisma.integration.delete({ where: { id } });
    this.integrations.delete(id);
  }

  async getIntegrations(): Promise<IntegrationConfig[]> {
    return Array.from(this.integrations.values());
  }

  async getIntegration(id: string): Promise<IntegrationConfig | null> {
    return this.integrations.get(id) || null;
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const integration = this.integrations.get(id);
    if (!integration) {
      return { success: false, message: 'Integration not found' };
    }

    try {
      switch (integration.provider) {
        case 'salesforce':
          return await this.testSalesforceConnection(integration);
        case 'hubspot':
          return await this.testHubspotConnection(integration);
        case 'mailchimp':
          return await this.testMailchimpConnection(integration);
        case 'zapier':
          return await this.testZapierConnection(integration);
        default:
          return { success: false, message: 'Unsupported provider' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Connection test failed: ${errorMessage}` };
    }
  }

  private async testSalesforceConnection(integration: IntegrationConfig): Promise<{ success: boolean; message: string }> {
    try {
      const { accessToken, instanceUrl } = integration.config;
      const response = await axios.get(`${instanceUrl}/services/oauth2/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return { success: true, message: 'Salesforce connection successful' };
    } catch (error) {
      return { success: false, message: 'Salesforce connection failed' };
    }
  }

  private async testHubspotConnection(integration: IntegrationConfig): Promise<{ success: boolean; message: string }> {
    try {
      const { apiKey } = integration.config;
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        params: { limit: 1 },
      });
      return { success: true, message: 'HubSpot connection successful' };
    } catch (error) {
      return { success: false, message: 'HubSpot connection failed' };
    }
  }

  private async testMailchimpConnection(integration: IntegrationConfig): Promise<{ success: boolean; message: string }> {
    try {
      const { apiKey, serverPrefix } = integration.config;
      const response = await axios.get(`https://${serverPrefix}.api.mailchimp.com/3.0/ping`, {
        auth: { username: 'anystring', password: apiKey },
      });
      return { success: true, message: 'Mailchimp connection successful' };
    } catch (error) {
      return { success: false, message: 'Mailchimp connection failed' };
    }
  }

  private async testZapierConnection(integration: IntegrationConfig): Promise<{ success: boolean; message: string }> {
    try {
      const { webhookUrl } = integration.config;
      const response = await axios.post(webhookUrl, {
        test: true,
        timestamp: new Date().toISOString(),
      });
      return { success: true, message: 'Zapier connection successful' };
    } catch (error) {
      return { success: false, message: 'Zapier connection failed' };
    }
  }

  async syncLeads(integrationId: string): Promise<SyncResult> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: [],
      duration: 0,
    };

    try {
      await this.updateIntegration(integrationId, { syncStatus: 'syncing' });

      switch (integration.provider) {
        case 'salesforce':
          await this.syncWithSalesforce(integration, result);
          break;
        case 'hubspot':
          await this.syncWithHubspot(integration, result);
          break;
        case 'mailchimp':
          await this.syncWithMailchimp(integration, result);
          break;
        default:
          throw new Error('Unsupported provider for sync');
      }

      result.success = true;
      await this.updateIntegration(integrationId, {
        syncStatus: 'success',
        lastSync: new Date(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      await this.updateIntegration(integrationId, {
        syncStatus: 'error',
        errorMessage: errorMessage,
      });
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  private async syncWithSalesforce(integration: IntegrationConfig, result: SyncResult): Promise<void> {
    const { accessToken, instanceUrl } = integration.config;
    
    // Fetch leads from Salesforce
    const sfLeads = await axios.get(`${instanceUrl}/services/data/v52.0/query`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        q: "SELECT Id, FirstName, LastName, Email, Company, LeadSource, Status FROM Lead LIMIT 100"
      },
    });

    for (const sfLead of (sfLeads.data as any).records) {
      result.recordsProcessed++;
      
      try {
        const existingLead = await prisma.lead.findFirst({
          where: { externalId: sfLead.Id, externalSource: 'salesforce' }
        });

        const leadData: any = {
          firstName: sfLead.FirstName || 'Unknown',
          lastName: sfLead.LastName || 'Unknown',
          email: sfLead.Email || 'unknown@example.com',
          company: sfLead.Company || 'Unknown',
          source: sfLead.LeadSource || 'salesforce',
          status: this.mapSalesforceStatus(sfLead.Status),
          externalId: sfLead.Id,
          externalSource: 'salesforce',
          url: sfLead.Website || '',
          companyName: sfLead.Company || '',
          domain: sfLead.Domain || '',
          industry: sfLead.Industry || '',
        };
        Object.keys(leadData).forEach(key => leadData[key] === undefined && delete leadData[key]);

        if (existingLead) {
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: leadData,
          });
          result.recordsUpdated++;
        } else {
          await prisma.lead.create({ data: leadData });
          result.recordsCreated++;
        }
      } catch (error) {
        result.recordsFailed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to sync lead ${sfLead.Id}: ${errorMessage}`);
      }
    }
  }

  private async syncWithHubspot(integration: IntegrationConfig, result: SyncResult): Promise<void> {
    const { apiKey } = integration.config;
    
    // Fetch contacts from HubSpot
    const hubspotContacts = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      params: { limit: 100 }
    });

    for (const contact of (hubspotContacts.data as any).results) {
      result.recordsProcessed++;
      
      try {
        const existingLead = await prisma.lead.findFirst({
          where: { externalId: contact.id, externalSource: 'hubspot' }
        });

        const leadData: any = {
          firstName: contact.properties.firstname || '',
          lastName: contact.properties.lastname || '',
          email: contact.properties.email || '',
          company: contact.properties.company || '',
          source: 'hubspot',
          status: this.mapHubspotStatus(contact.properties.hs_lead_status),
          externalId: contact.id,
          externalSource: 'hubspot',
          url: '',
          companyName: '',
          domain: '',
          industry: '',
        };
        Object.keys(leadData).forEach(key => leadData[key] === undefined && delete leadData[key]);

        if (existingLead) {
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: leadData,
          });
          result.recordsUpdated++;
        } else {
          await prisma.lead.create({ data: leadData });
          result.recordsCreated++;
        }
      } catch (error) {
        result.recordsFailed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to sync contact ${contact.id}: ${errorMessage}`);
      }
    }
  }

  private async syncWithMailchimp(integration: IntegrationConfig, result: SyncResult): Promise<void> {
    const { apiKey, serverPrefix, listId } = integration.config;
    
    // Fetch subscribers from Mailchimp
    const mailchimpSubscribers = await axios.get(`https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}/members`, {
      auth: { username: 'anystring', password: apiKey },
      params: { count: 100 }
    });

    for (const subscriber of (mailchimpSubscribers.data as any).members) {
      result.recordsProcessed++;
      
      try {
        const existingLead = await prisma.lead.findFirst({
          where: { externalId: subscriber.id, externalSource: 'mailchimp' }
        });

        const leadData: any = {
          firstName: subscriber.merge_fields.FNAME || '',
          lastName: subscriber.merge_fields.LNAME || '',
          email: subscriber.email_address,
          company: subscriber.merge_fields.COMPANY || '',
          source: 'mailchimp',
          status: this.mapMailchimpStatus(subscriber.status),
          externalId: subscriber.id,
          externalSource: 'mailchimp',
          url: '',
          companyName: '',
          domain: '',
          industry: '',
        };
        Object.keys(leadData).forEach(key => leadData[key] === undefined && delete leadData[key]);

        if (existingLead) {
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: leadData,
          });
          result.recordsUpdated++;
        } else {
          await prisma.lead.create({ data: leadData });
          result.recordsCreated++;
        }
      } catch (error) {
        result.recordsFailed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to sync subscriber ${subscriber.id}: ${errorMessage}`);
      }
    }
  }

  private mapSalesforceStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'New': 'new',
      'Working': 'contacted',
      'Qualified': 'qualified',
      'Unqualified': 'unqualified',
      'Converted': 'converted',
    };
    return statusMap[status] || 'new';
  }

  private mapHubspotStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'NEW': 'new',
      'OPEN': 'contacted',
      'QUALIFIED': 'qualified',
      'UNQUALIFIED': 'unqualified',
      'CONVERTED': 'converted',
    };
    return statusMap[status] || 'new';
  }

  private mapMailchimpStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'subscribed': 'new',
      'unsubscribed': 'unqualified',
      'cleaned': 'unqualified',
      'pending': 'new',
    };
    return statusMap[status] || 'new';
  }

  async sendWebhook(integrationId: string, payload: WebhookPayload): Promise<boolean> {
    const integration = this.integrations.get(integrationId);
    if (!integration || !integration.isActive) {
      return false;
    }

    try {
      const { webhookUrl, webhookSecret } = integration.config;
      
      if (!webhookUrl) {
        return false;
      }

      const signature = crypto
        .createHmac('sha256', webhookSecret || '')
        .update(JSON.stringify(payload))
        .digest('hex');

      await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'User-Agent': 'BBDS-Integration-Hub/1.0',
        },
        timeout: 10000,
      });

      return true;
    } catch (error) {
      console.error('Webhook delivery failed:', error);
      return false;
    }
  }

  async getAvailableProviders(): Promise<Array<{ id: string; name: string; type: string; description: string }>> {
    return [
      {
        id: 'salesforce',
        name: 'Salesforce',
        type: 'crm',
        description: 'Sync leads with Salesforce CRM',
      },
      {
        id: 'hubspot',
        name: 'HubSpot',
        type: 'crm',
        description: 'Sync leads with HubSpot CRM',
      },
      {
        id: 'mailchimp',
        name: 'Mailchimp',
        type: 'marketing',
        description: 'Sync subscribers with Mailchimp',
      },
      {
        id: 'zapier',
        name: 'Zapier',
        type: 'automation',
        description: 'Send webhooks to Zapier for automation',
      },
      {
        id: 'custom',
        name: 'Custom Webhook',
        type: 'custom',
        description: 'Send data to custom webhook endpoints',
      },
    ];
  }

  async getIntegrationById(id: string): Promise<IntegrationConfig | null> {
    const integration = await prisma.integration.findUnique({
      where: { id }
    });

    if (!integration) return null;

    return {
      id: integration.id,
      name: integration.name,
      type: integration.type as any,
      provider: integration.provider,
      config: typeof integration.config === 'string' ? (() => { try { return JSON.parse(integration.config); } catch { return {}; } })() : integration.config,
      isActive: integration.isActive,
      lastSync: integration.lastSync === null ? undefined : integration.lastSync,
      syncStatus: integration.syncStatus as any,
      errorMessage: integration.errorMessage === null ? undefined : integration.errorMessage
    };
  }
}

export const integrationService = new IntegrationService(); 