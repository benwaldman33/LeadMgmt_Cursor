import express from 'express';
import { BusinessRuleService } from '../services/businessRuleService';
import { authenticateToken } from '../middleware/auth';
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

// Get all business rules
router.get('/', authenticateToken, async (req, res) => {
  try {
    const filters = {
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      type: req.query.type as string,
      createdById: req.query.createdById as string
    };

    const businessRules = await businessRuleService.getBusinessRules(filters);
    res.json(businessRules);
  } catch (error) {
    console.error('Error fetching business rules:', error);
    res.status(500).json({ error: 'Failed to fetch business rules' });
  }
});

// Get a single business rule by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const businessRule = await businessRuleService.getBusinessRuleById(req.params.id);
    if (!businessRule) {
      return res.status(404).json({ error: 'Business rule not found' });
    }
    res.json(businessRule);
  } catch (error) {
    console.error('Error fetching business rule:', error);
    res.status(500).json({ error: 'Failed to fetch business rule' });
  }
});

// Create a new business rule
router.post('/', authenticateToken, validateRequest(createBusinessRuleSchema), async (req, res) => {
  try {
    const businessRule = await businessRuleService.createBusinessRule({
      ...req.body,
      createdById: req.user.id
    });
    res.status(201).json(businessRule);
  } catch (error) {
    console.error('Error creating business rule:', error);
    res.status(500).json({ error: 'Failed to create business rule' });
  }
});

// Update a business rule
router.put('/:id', authenticateToken, validateRequest(updateBusinessRuleSchema), async (req, res) => {
  try {
    const businessRule = await businessRuleService.updateBusinessRule(req.params.id, req.body);
    res.json(businessRule);
  } catch (error) {
    console.error('Error updating business rule:', error);
    res.status(500).json({ error: 'Failed to update business rule' });
  }
});

// Delete a business rule
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await businessRuleService.deleteBusinessRule(req.params.id, req.user.id);
    res.json({ message: 'Business rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting business rule:', error);
    res.status(500).json({ error: 'Failed to delete business rule' });
  }
});

// Evaluate business rules for a lead
router.post('/evaluate/:leadId', authenticateToken, async (req, res) => {
  try {
    const results = await businessRuleService.evaluateRules(req.params.leadId, req.body.context);
    res.json(results);
  } catch (error) {
    console.error('Error evaluating business rules:', error);
    res.status(500).json({ error: 'Failed to evaluate business rules' });
  }
});

// Apply business rule actions to a lead
router.post('/apply/:leadId', authenticateToken, async (req, res) => {
  try {
    const { actions } = req.body;
    if (!Array.isArray(actions)) {
      return res.status(400).json({ error: 'Actions must be an array' });
    }

    await businessRuleService.applyRuleActions(req.params.leadId, actions);
    res.json({ message: 'Business rule actions applied successfully' });
  } catch (error) {
    console.error('Error applying business rule actions:', error);
    res.status(500).json({ error: 'Failed to apply business rule actions' });
  }
});

// Test business rule evaluation
router.post('/:id/test', authenticateToken, validateRequest(testRuleSchema), async (req, res) => {
  try {
    const result = await businessRuleService.testRuleEvaluation(req.params.id, req.body.testData);
    res.json(result);
  } catch (error) {
    console.error('Error testing business rule:', error);
    res.status(500).json({ error: 'Failed to test business rule' });
  }
});

// Get business rules by type
router.get('/type/:type', authenticateToken, async (req, res) => {
  try {
    const businessRules = await businessRuleService.getBusinessRulesByType(req.params.type);
    res.json(businessRules);
  } catch (error) {
    console.error('Error fetching business rules by type:', error);
    res.status(500).json({ error: 'Failed to fetch business rules by type' });
  }
});

// Bulk apply business rules to leads
router.post('/bulk-apply', authenticateToken, async (req, res) => {
  try {
    const { leadIds, context } = req.body;
    if (!Array.isArray(leadIds)) {
      return res.status(400).json({ error: 'Lead IDs must be an array' });
    }

    const results = await businessRuleService.bulkApplyRules(leadIds, context);
    res.json(results);
  } catch (error) {
    console.error('Error bulk applying business rules:', error);
    res.status(500).json({ error: 'Failed to bulk apply business rules' });
  }
});

// Get business rule statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = await businessRuleService.getBusinessRuleStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching business rule stats:', error);
    res.status(500).json({ error: 'Failed to fetch business rule statistics' });
  }
});

export default router; 