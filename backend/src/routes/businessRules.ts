import express from 'express';
import { BusinessRuleService } from '../services/businessRuleService';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = express.Router();
const businessRuleService = new BusinessRuleService();

// Validation schemas
const createBusinessRuleSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  description: Joi.string().optional().max(500),
  type: Joi.string().required().valid('assignment', 'scoring', 'notification', 'status_change', 'enrichment'),
  conditions: Joi.array().items(Joi.object({
    field: Joi.string().required(),
    operator: Joi.string().required().valid('equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'not_in'),
    value: Joi.any().required(),
    logicalOperator: Joi.string().optional().valid('AND', 'OR')
  })).required().min(1),
  actions: Joi.array().items(Joi.object({
    type: Joi.string().required().valid('assignment', 'scoring', 'notification', 'status_change', 'enrichment'),
    target: Joi.string().required(),
    value: Joi.any().required(),
    metadata: Joi.object().optional()
  })).required().min(1),
  isActive: Joi.boolean().optional(),
  priority: Joi.number().integer().min(0).max(100).optional()
});

const updateBusinessRuleSchema = Joi.object({
  name: Joi.string().optional().min(1).max(100),
  description: Joi.string().optional().max(500),
  type: Joi.string().optional().valid('assignment', 'scoring', 'notification', 'status_change', 'enrichment'),
  conditions: Joi.array().items(Joi.object({
    field: Joi.string().required(),
    operator: Joi.string().required().valid('equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'not_in'),
    value: Joi.any().required(),
    logicalOperator: Joi.string().optional().valid('AND', 'OR')
  })).optional().min(1),
  actions: Joi.array().items(Joi.object({
    type: Joi.string().required().valid('assignment', 'scoring', 'notification', 'status_change', 'enrichment'),
    target: Joi.string().required(),
    value: Joi.any().required(),
    metadata: Joi.object().optional()
  })).optional().min(1),
  isActive: Joi.boolean().optional(),
  priority: Joi.number().integer().min(0).max(100).optional()
});

const testRuleSchema = Joi.object({
  testData: Joi.object().required()
});

// Apply authentication to all routes
router.use(authenticateToken);

// Get all business rules
router.get('/', async (req, res) => {
  try {
    const filters = {
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      type: req.query.type as string,
      createdById: req.query.createdById as string
    };
    
    const rules = await businessRuleService.getBusinessRules(filters);
    res.json(rules);
  } catch (error) {
    console.error('Error fetching business rules:', error);
    res.status(500).json({ error: 'Failed to fetch business rules' });
  }
});

// Get business rule by ID
router.get('/:id', async (req, res) => {
  try {
    const rule = await businessRuleService.getBusinessRuleById(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Business rule not found' });
    }
    res.json(rule);
  } catch (error) {
    console.error('Error fetching business rule:', error);
    res.status(500).json({ error: 'Failed to fetch business rule' });
  }
});

// Create new business rule
router.post('/', requireRole(['SUPER_ADMIN', 'ANALYST']), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const ruleData = {
      ...req.body,
      createdById: req.user.id
    };

    const newRule = await businessRuleService.createBusinessRule(ruleData);
    res.status(201).json(newRule);
  } catch (error) {
    console.error('Error creating business rule:', error);
    res.status(500).json({ error: 'Failed to create business rule' });
  }
});

// Update business rule
router.put('/:id', requireRole(['SUPER_ADMIN', 'ANALYST']), async (req, res) => {
  try {
    const updatedRule = await businessRuleService.updateBusinessRule(req.params.id, req.body);
    if (!updatedRule) {
      return res.status(404).json({ error: 'Business rule not found' });
    }
    res.json(updatedRule);
  } catch (error) {
    console.error('Error updating business rule:', error);
    res.status(500).json({ error: 'Failed to update business rule' });
  }
});

// Delete business rule
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ANALYST']), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await businessRuleService.deleteBusinessRule(req.params.id, req.user.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting business rule:', error);
    res.status(500).json({ error: 'Failed to delete business rule' });
  }
});

// Test business rule
router.post('/:id/test', requireRole(['SUPER_ADMIN', 'ANALYST']), async (req, res) => {
  try {
    const testData = req.body;
    const result = await businessRuleService.testRuleEvaluation(req.params.id, testData);
    res.json(result);
  } catch (error) {
    console.error('Error testing business rule:', error);
    res.status(500).json({ error: 'Failed to test business rule' });
  }
});

// Get business rules by type
router.get('/type/:type', async (req, res) => {
  try {
    const businessRules = await businessRuleService.getBusinessRulesByType(req.params.type);
    res.json(businessRules);
  } catch (error) {
    console.error('Error fetching business rules by type:', error);
    res.status(500).json({ error: 'Failed to fetch business rules by type' });
  }
});

// Evaluate business rules for a lead
router.post('/evaluate/:leadId', async (req, res) => {
  try {
    const results = await businessRuleService.evaluateRules(req.params.leadId, req.body.context);
    res.json(results);
  } catch (error) {
    console.error('Error evaluating business rules:', error);
    res.status(500).json({ error: 'Failed to evaluate business rules' });
  }
});

// Apply business rule actions to a lead
router.post('/apply/:leadId', async (req, res) => {
  try {
    const { actions } = req.body;
    await businessRuleService.applyRuleActions(req.params.leadId, actions);
    res.json({ message: 'Actions applied successfully' });
  } catch (error) {
    console.error('Error applying business rule actions:', error);
    res.status(500).json({ error: 'Failed to apply business rule actions' });
  }
});

// Bulk apply business rules to leads
router.post('/bulk-apply', async (req, res) => {
  try {
    const { leadIds, context } = req.body;
    const results = await businessRuleService.bulkApplyRules(leadIds, context);
    res.json(results);
  } catch (error) {
    console.error('Error bulk applying business rules:', error);
    res.status(500).json({ error: 'Failed to bulk apply business rules' });
  }
});

// Get business rule statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await businessRuleService.getBusinessRuleStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching business rule stats:', error);
    res.status(500).json({ error: 'Failed to fetch business rule stats' });
  }
});

export default router; 