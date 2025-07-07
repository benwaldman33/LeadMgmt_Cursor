"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrationService = void 0;
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const auditLogService_1 = require("../services/auditLogService");
const prisma = new client_1.PrismaClient();
class IntegrationService {
    constructor() {
        this.integrations = new Map();
        this.loadIntegrations();
    }
    loadIntegrations() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const integrations = yield prisma.integration.findMany();
                integrations.forEach((integration) => {
                    this.integrations.set(integration.id, {
                        id: integration.id,
                        name: integration.name,
                        type: integration.type,
                        provider: integration.provider,
                        config: integration.config,
                        isActive: integration.isActive,
                        lastSync: integration.lastSync,
                        syncStatus: integration.syncStatus,
                        errorMessage: integration.errorMessage,
                    });
                });
            }
            catch (error) {
                console.error('Error loading integrations:', error);
            }
        });
    }
    createIntegration(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const integration = yield prisma.integration.create({
                data: {
                    name: data.name,
                    type: data.type,
                    provider: data.provider,
                    config: JSON.stringify(data.config),
                    isActive: true,
                    syncStatus: 'idle'
                }
            });
            yield auditLogService_1.AuditLogService.logActivity({
                action: 'CREATE',
                entityType: 'INTEGRATION',
                entityId: integration.id,
                description: `Created integration: ${integration.name}`
            });
            return {
                id: integration.id,
                name: integration.name,
                type: integration.type,
                provider: integration.provider,
                config: typeof integration.config === 'string' ? (() => { try {
                    return JSON.parse(integration.config);
                }
                catch (_a) {
                    return {};
                } })() : integration.config,
                isActive: integration.isActive,
                lastSync: integration.lastSync === null ? undefined : integration.lastSync,
                syncStatus: integration.syncStatus,
                errorMessage: integration.errorMessage === null ? undefined : integration.errorMessage
            };
        });
    }
    updateIntegration(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const integration = yield prisma.integration.update({
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
            const updatedIntegration = {
                id: integration.id,
                name: integration.name,
                type: integration.type,
                provider: integration.provider,
                config: typeof integration.config === 'string' ? (() => { try {
                    return JSON.parse(integration.config);
                }
                catch (_a) {
                    return {};
                } })() : integration.config,
                isActive: integration.isActive,
                lastSync: integration.lastSync === null ? undefined : integration.lastSync,
                syncStatus: integration.syncStatus,
                errorMessage: integration.errorMessage === null ? undefined : integration.errorMessage
            };
            this.integrations.set(id, updatedIntegration);
            return updatedIntegration;
        });
    }
    deleteIntegration(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield prisma.integration.delete({ where: { id } });
            this.integrations.delete(id);
        });
    }
    getIntegrations() {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.integrations.values());
        });
    }
    getIntegration(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.integrations.get(id) || null;
        });
    }
    testConnection(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const integration = this.integrations.get(id);
            if (!integration) {
                return { success: false, message: 'Integration not found' };
            }
            try {
                switch (integration.provider) {
                    case 'salesforce':
                        return yield this.testSalesforceConnection(integration);
                    case 'hubspot':
                        return yield this.testHubspotConnection(integration);
                    case 'mailchimp':
                        return yield this.testMailchimpConnection(integration);
                    case 'zapier':
                        return yield this.testZapierConnection(integration);
                    default:
                        return { success: false, message: 'Unsupported provider' };
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return { success: false, message: `Connection test failed: ${errorMessage}` };
            }
        });
    }
    testSalesforceConnection(integration) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { accessToken, instanceUrl } = integration.config;
                const response = yield axios_1.default.get(`${instanceUrl}/services/oauth2/userinfo`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                return { success: true, message: 'Salesforce connection successful' };
            }
            catch (error) {
                return { success: false, message: 'Salesforce connection failed' };
            }
        });
    }
    testHubspotConnection(integration) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { apiKey } = integration.config;
                const response = yield axios_1.default.get('https://api.hubapi.com/crm/v3/objects/contacts', {
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    params: { limit: 1 },
                });
                return { success: true, message: 'HubSpot connection successful' };
            }
            catch (error) {
                return { success: false, message: 'HubSpot connection failed' };
            }
        });
    }
    testMailchimpConnection(integration) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { apiKey, serverPrefix } = integration.config;
                const response = yield axios_1.default.get(`https://${serverPrefix}.api.mailchimp.com/3.0/ping`, {
                    auth: { username: 'anystring', password: apiKey },
                });
                return { success: true, message: 'Mailchimp connection successful' };
            }
            catch (error) {
                return { success: false, message: 'Mailchimp connection failed' };
            }
        });
    }
    testZapierConnection(integration) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { webhookUrl } = integration.config;
                const response = yield axios_1.default.post(webhookUrl, {
                    test: true,
                    timestamp: new Date().toISOString(),
                });
                return { success: true, message: 'Zapier connection successful' };
            }
            catch (error) {
                return { success: false, message: 'Zapier connection failed' };
            }
        });
    }
    syncLeads(integrationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const integration = this.integrations.get(integrationId);
            if (!integration) {
                throw new Error('Integration not found');
            }
            const startTime = Date.now();
            const result = {
                success: false,
                recordsProcessed: 0,
                recordsCreated: 0,
                recordsUpdated: 0,
                recordsFailed: 0,
                errors: [],
                duration: 0,
            };
            try {
                yield this.updateIntegration(integrationId, { syncStatus: 'syncing' });
                switch (integration.provider) {
                    case 'salesforce':
                        yield this.syncWithSalesforce(integration, result);
                        break;
                    case 'hubspot':
                        yield this.syncWithHubspot(integration, result);
                        break;
                    case 'mailchimp':
                        yield this.syncWithMailchimp(integration, result);
                        break;
                    default:
                        throw new Error('Unsupported provider for sync');
                }
                result.success = true;
                yield this.updateIntegration(integrationId, {
                    syncStatus: 'success',
                    lastSync: new Date(),
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                result.errors.push(errorMessage);
                yield this.updateIntegration(integrationId, {
                    syncStatus: 'error',
                    errorMessage: errorMessage,
                });
            }
            finally {
                result.duration = Date.now() - startTime;
            }
            return result;
        });
    }
    syncWithSalesforce(integration, result) {
        return __awaiter(this, void 0, void 0, function* () {
            const { accessToken, instanceUrl } = integration.config;
            // Fetch leads from Salesforce
            const sfLeads = yield axios_1.default.get(`${instanceUrl}/services/data/v52.0/query`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: {
                    q: "SELECT Id, FirstName, LastName, Email, Company, LeadSource, Status FROM Lead LIMIT 100"
                },
            });
            for (const sfLead of sfLeads.data.records) {
                result.recordsProcessed++;
                try {
                    const existingLead = yield prisma.lead.findFirst({
                        where: { externalId: sfLead.Id, externalSource: 'salesforce' }
                    });
                    const leadData = {
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
                        yield prisma.lead.update({
                            where: { id: existingLead.id },
                            data: leadData,
                        });
                        result.recordsUpdated++;
                    }
                    else {
                        yield prisma.lead.create({ data: leadData });
                        result.recordsCreated++;
                    }
                }
                catch (error) {
                    result.recordsFailed++;
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    result.errors.push(`Failed to sync lead ${sfLead.Id}: ${errorMessage}`);
                }
            }
        });
    }
    syncWithHubspot(integration, result) {
        return __awaiter(this, void 0, void 0, function* () {
            const { apiKey } = integration.config;
            // Fetch contacts from HubSpot
            const hubspotContacts = yield axios_1.default.get('https://api.hubapi.com/crm/v3/objects/contacts', {
                headers: { 'Authorization': `Bearer ${apiKey}` },
                params: { limit: 100 }
            });
            for (const contact of hubspotContacts.data.results) {
                result.recordsProcessed++;
                try {
                    const existingLead = yield prisma.lead.findFirst({
                        where: { externalId: contact.id, externalSource: 'hubspot' }
                    });
                    const leadData = {
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
                        yield prisma.lead.update({
                            where: { id: existingLead.id },
                            data: leadData,
                        });
                        result.recordsUpdated++;
                    }
                    else {
                        yield prisma.lead.create({ data: leadData });
                        result.recordsCreated++;
                    }
                }
                catch (error) {
                    result.recordsFailed++;
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    result.errors.push(`Failed to sync contact ${contact.id}: ${errorMessage}`);
                }
            }
        });
    }
    syncWithMailchimp(integration, result) {
        return __awaiter(this, void 0, void 0, function* () {
            const { apiKey, serverPrefix, listId } = integration.config;
            // Fetch subscribers from Mailchimp
            const mailchimpSubscribers = yield axios_1.default.get(`https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}/members`, {
                auth: { username: 'anystring', password: apiKey },
                params: { count: 100 }
            });
            for (const subscriber of mailchimpSubscribers.data.members) {
                result.recordsProcessed++;
                try {
                    const existingLead = yield prisma.lead.findFirst({
                        where: { externalId: subscriber.id, externalSource: 'mailchimp' }
                    });
                    const leadData = {
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
                        yield prisma.lead.update({
                            where: { id: existingLead.id },
                            data: leadData,
                        });
                        result.recordsUpdated++;
                    }
                    else {
                        yield prisma.lead.create({ data: leadData });
                        result.recordsCreated++;
                    }
                }
                catch (error) {
                    result.recordsFailed++;
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    result.errors.push(`Failed to sync subscriber ${subscriber.id}: ${errorMessage}`);
                }
            }
        });
    }
    mapSalesforceStatus(status) {
        const statusMap = {
            'New': 'new',
            'Working': 'contacted',
            'Qualified': 'qualified',
            'Unqualified': 'unqualified',
            'Converted': 'converted',
        };
        return statusMap[status] || 'new';
    }
    mapHubspotStatus(status) {
        const statusMap = {
            'NEW': 'new',
            'OPEN': 'contacted',
            'QUALIFIED': 'qualified',
            'UNQUALIFIED': 'unqualified',
            'CONVERTED': 'converted',
        };
        return statusMap[status] || 'new';
    }
    mapMailchimpStatus(status) {
        const statusMap = {
            'subscribed': 'new',
            'unsubscribed': 'unqualified',
            'cleaned': 'unqualified',
            'pending': 'new',
        };
        return statusMap[status] || 'new';
    }
    sendWebhook(integrationId, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const integration = this.integrations.get(integrationId);
            if (!integration || !integration.isActive) {
                return false;
            }
            try {
                const { webhookUrl, webhookSecret } = integration.config;
                if (!webhookUrl) {
                    return false;
                }
                const signature = crypto_1.default
                    .createHmac('sha256', webhookSecret || '')
                    .update(JSON.stringify(payload))
                    .digest('hex');
                yield axios_1.default.post(webhookUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Signature': signature,
                        'User-Agent': 'BBDS-Integration-Hub/1.0',
                    },
                    timeout: 10000,
                });
                return true;
            }
            catch (error) {
                console.error('Webhook delivery failed:', error);
                return false;
            }
        });
    }
    getAvailableProviders() {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    getIntegrationById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const integration = yield prisma.integration.findUnique({
                where: { id }
            });
            if (!integration)
                return null;
            return {
                id: integration.id,
                name: integration.name,
                type: integration.type,
                provider: integration.provider,
                config: typeof integration.config === 'string' ? (() => { try {
                    return JSON.parse(integration.config);
                }
                catch (_a) {
                    return {};
                } })() : integration.config,
                isActive: integration.isActive,
                lastSync: integration.lastSync === null ? undefined : integration.lastSync,
                syncStatus: integration.syncStatus,
                errorMessage: integration.errorMessage === null ? undefined : integration.errorMessage
            };
        });
    }
}
exports.integrationService = new IntegrationService();
