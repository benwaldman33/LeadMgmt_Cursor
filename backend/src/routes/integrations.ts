import express from 'express';
import Joi from 'joi';
import { integrationService } from '../services/integrationService';
import { authenticateToken } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

// Validation schemas
const integrationConfigSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid('crm', 'marketing', 'email', 'analytics', 'custom').required(),
  provider: Joi.string().required(),
  config: Joi.object().required(),
  isActive: Joi.boolean().default(true),
});

const updateIntegrationSchema = Joi.object({
  name: Joi.string().optional(),
  type: Joi.string().valid('crm', 'marketing', 'email', 'analytics', 'custom').optional(),
  provider: Joi.string().optional(),
  config: Joi.object().optional(),
  isActive: Joi.boolean().optional(),
});

// Get all integrations
router.get('/',
  authenticateToken,
  async (req, res) => {
    try {
      const integrations = await integrationService.getIntegrations();
      res.json({
        success: true,
        data: integrations,
      });
    } catch (error) {
      console.error('Error fetching integrations:', error);
      res.status(500).json({ error: 'Failed to fetch integrations' });
    }
  }
);

// Get available providers
router.get('/providers',
  authenticateToken,
  async (req, res) => {
    try {
      const providers = await integrationService.getAvailableProviders();
      res.json({
        success: true,
        data: providers,
      });
    } catch (error) {
      console.error('Error fetching providers:', error);
      res.status(500).json({ error: 'Failed to fetch providers' });
    }
  }
);

// Get single integration
router.get('/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const integration = await integrationService.getIntegration(id);
      
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      res.json({
        success: true,
        data: integration,
      });
    } catch (error) {
      console.error('Error fetching integration:', error);
      res.status(500).json({ error: 'Failed to fetch integration' });
    }
  }
);

// Create new integration
router.post('/',
  authenticateToken,
  auditLog({ action: 'INTEGRATION_CREATE', entityType: 'INTEGRATION' }),
  async (req, res) => {
    try {
      const { error, value } = integrationConfigSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const integration = await integrationService.createIntegration(value);

      res.status(201).json({
        success: true,
        data: integration,
      });
    } catch (error) {
      console.error('Error creating integration:', error);
      res.status(500).json({ error: 'Failed to create integration' });
    }
  }
);

// Update integration
router.put('/:id',
  authenticateToken,
  auditLog({ action: 'INTEGRATION_UPDATE', entityType: 'INTEGRATION' }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { error, value } = updateIntegrationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const integration = await integrationService.updateIntegration(id, value);

      res.json({
        success: true,
        data: integration,
      });
    } catch (error) {
      console.error('Error updating integration:', error);
      res.status(500).json({ error: 'Failed to update integration' });
    }
  }
);

// Delete integration
router.delete('/:id',
  authenticateToken,
  auditLog({ action: 'INTEGRATION_DELETE', entityType: 'INTEGRATION' }),
  async (req, res) => {
    try {
      const { id } = req.params;
      await integrationService.deleteIntegration(id);

      res.json({
        success: true,
        message: 'Integration deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting integration:', error);
      res.status(500).json({ error: 'Failed to delete integration' });
    }
  }
);

// Test integration connection
router.post('/:id/test',
  authenticateToken,
  auditLog({ action: 'INTEGRATION_TEST', entityType: 'INTEGRATION' }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const result = await integrationService.testConnection(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error testing integration:', error);
      res.status(500).json({ error: 'Failed to test integration' });
    }
  }
);

// Sync leads with integration
router.post('/:id/sync',
  authenticateToken,
  auditLog({ action: 'INTEGRATION_SYNC', entityType: 'INTEGRATION' }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const result = await integrationService.syncLeads(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error syncing integration:', error);
      res.status(500).json({ error: 'Failed to sync integration' });
    }
  }
);

// Send webhook to integration
router.post('/:id/webhook',
  authenticateToken,
  async (req, res) => {
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

      const success = await integrationService.sendWebhook(id, payload);

      res.json({
        success: true,
        data: { delivered: success },
      });
    } catch (error) {
      console.error('Error sending webhook:', error);
      res.status(500).json({ error: 'Failed to send webhook' });
    }
  }
);

export default router; 