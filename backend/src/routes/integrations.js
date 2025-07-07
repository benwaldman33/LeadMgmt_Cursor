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
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const integrationService_1 = require("../services/integrationService");
const auth_1 = require("../middleware/auth");
const auditLog_1 = require("../middleware/auditLog");
const router = express_1.default.Router();
// Validation schemas
const integrationConfigSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    type: joi_1.default.string().valid('crm', 'marketing', 'email', 'analytics', 'custom').required(),
    provider: joi_1.default.string().required(),
    config: joi_1.default.object().required(),
    isActive: joi_1.default.boolean().default(true),
});
const updateIntegrationSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    type: joi_1.default.string().valid('crm', 'marketing', 'email', 'analytics', 'custom').optional(),
    provider: joi_1.default.string().optional(),
    config: joi_1.default.object().optional(),
    isActive: joi_1.default.boolean().optional(),
});
// Get all integrations
router.get('/', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const integrations = yield integrationService_1.integrationService.getIntegrations();
        res.json({
            success: true,
            data: integrations,
        });
    }
    catch (error) {
        console.error('Error fetching integrations:', error);
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
}));
// Get available providers
router.get('/providers', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const providers = yield integrationService_1.integrationService.getAvailableProviders();
        res.json({
            success: true,
            data: providers,
        });
    }
    catch (error) {
        console.error('Error fetching providers:', error);
        res.status(500).json({ error: 'Failed to fetch providers' });
    }
}));
// Get single integration
router.get('/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const integration = yield integrationService_1.integrationService.getIntegration(id);
        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }
        res.json({
            success: true,
            data: integration,
        });
    }
    catch (error) {
        console.error('Error fetching integration:', error);
        res.status(500).json({ error: 'Failed to fetch integration' });
    }
}));
// Create new integration
router.post('/', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'INTEGRATION_CREATE', entityType: 'INTEGRATION' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { error, value } = integrationConfigSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        const integration = yield integrationService_1.integrationService.createIntegration(value);
        res.status(201).json({
            success: true,
            data: integration,
        });
    }
    catch (error) {
        console.error('Error creating integration:', error);
        res.status(500).json({ error: 'Failed to create integration' });
    }
}));
// Update integration
router.put('/:id', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'INTEGRATION_UPDATE', entityType: 'INTEGRATION' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { error, value } = updateIntegrationSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        const integration = yield integrationService_1.integrationService.updateIntegration(id, value);
        res.json({
            success: true,
            data: integration,
        });
    }
    catch (error) {
        console.error('Error updating integration:', error);
        res.status(500).json({ error: 'Failed to update integration' });
    }
}));
// Delete integration
router.delete('/:id', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'INTEGRATION_DELETE', entityType: 'INTEGRATION' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield integrationService_1.integrationService.deleteIntegration(id);
        res.json({
            success: true,
            message: 'Integration deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting integration:', error);
        res.status(500).json({ error: 'Failed to delete integration' });
    }
}));
// Test integration connection
router.post('/:id/test', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'INTEGRATION_TEST', entityType: 'INTEGRATION' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield integrationService_1.integrationService.testConnection(id);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('Error testing integration:', error);
        res.status(500).json({ error: 'Failed to test integration' });
    }
}));
// Sync leads with integration
router.post('/:id/sync', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'INTEGRATION_SYNC', entityType: 'INTEGRATION' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield integrationService_1.integrationService.syncLeads(id);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('Error syncing integration:', error);
        res.status(500).json({ error: 'Failed to sync integration' });
    }
}));
// Send webhook to integration
router.post('/:id/webhook', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { event, entityType, entityId, data } = req.body;
        if (!event || !entityType || !entityId) {
            return res.status(400).json({ error: 'Missing required webhook fields' });
        }
        const payload = {
            event,
            entityType,
            entityId,
            data,
            timestamp: new Date(),
        };
        const success = yield integrationService_1.integrationService.sendWebhook(id, payload);
        res.json({
            success: true,
            data: { delivered: success },
        });
    }
    catch (error) {
        console.error('Error sending webhook:', error);
        res.status(500).json({ error: 'Failed to send webhook' });
    }
}));
exports.default = router;
