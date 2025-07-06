import express from 'express';
import { WorkflowService } from '../services/workflowService';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = express.Router();
const workflowService = new WorkflowService();

// Validation schemas
const createWorkflowSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  description: Joi.string().optional().max(500),
  trigger: Joi.string().required().valid('lead_created', 'lead_scored', 'lead_status_changed', 'manual'),
  isActive: Joi.boolean().optional(),
  priority: Joi.number().integer().min(0).max(100).optional(),
  steps: Joi.array().items(Joi.object({
    type: Joi.string().required().valid('action', 'condition', 'delay', 'notification', 'integration'),
    name: Joi.string().required().min(1).max(100),
    order: Joi.number().integer().min(0).required(),
    config: Joi.object().required()
  })).required().min(1)
});

const updateWorkflowSchema = Joi.object({
  name: Joi.string().optional().min(1).max(100),
  description: Joi.string().optional().max(500),
  trigger: Joi.string().optional().valid('lead_created', 'lead_scored', 'lead_status_changed', 'manual'),
  isActive: Joi.boolean().optional(),
  priority: Joi.number().integer().min(0).max(100).optional(),
  steps: Joi.array().items(Joi.object({
    type: Joi.string().required().valid('action', 'condition', 'delay', 'notification', 'integration'),
    name: Joi.string().required().min(1).max(100),
    order: Joi.number().integer().min(0).required(),
    config: Joi.object().required()
  })).optional().min(1)
});

const executeWorkflowSchema = Joi.object({
  leadId: Joi.string().optional(),
  triggerData: Joi.object().optional()
});

// Get all workflows
router.get('/', authenticateToken, async (req, res) => {
  try {
    const filters = {
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      trigger: req.query.trigger as string,
      createdById: req.query.createdById as string
    };

    const workflows = await workflowService.getWorkflows(filters);
    res.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// Get a single workflow by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const workflow = await workflowService.getWorkflowById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// Create a new workflow
router.post('/', authenticateToken, validateRequest(createWorkflowSchema), async (req, res) => {
  try {
    const workflow = await workflowService.createWorkflow({
      ...req.body,
      createdById: req.user.id
    });
    res.status(201).json(workflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// Update a workflow
router.put('/:id', authenticateToken, validateRequest(updateWorkflowSchema), async (req, res) => {
  try {
    const workflow = await workflowService.updateWorkflow(req.params.id, req.body);
    res.json(workflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// Delete a workflow
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await workflowService.deleteWorkflow(req.params.id, req.user.id);
    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// Execute a workflow
router.post('/:id/execute', authenticateToken, validateRequest(executeWorkflowSchema), async (req, res) => {
  try {
    const result = await workflowService.executeWorkflow(req.params.id, {
      leadId: req.body.leadId,
      userId: req.user.id,
      triggerData: req.body.triggerData
    });
    res.json(result);
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// Get workflow executions
router.get('/:id/executions', authenticateToken, async (req, res) => {
  try {
    const filters = {
      workflowId: req.params.id,
      leadId: req.query.leadId as string,
      status: req.query.status as string
    };

    const executions = await workflowService.getWorkflowExecutions(filters);
    res.json(executions);
  } catch (error) {
    console.error('Error fetching workflow executions:', error);
    res.status(500).json({ error: 'Failed to fetch workflow executions' });
  }
});

// Trigger workflows by event
router.post('/trigger/:event', authenticateToken, async (req, res) => {
  try {
    const results = await workflowService.triggerWorkflows(req.params.event, {
      leadId: req.body.leadId,
      userId: req.user.id,
      triggerData: req.body.triggerData
    });
    res.json(results);
  } catch (error) {
    console.error('Error triggering workflows:', error);
    res.status(500).json({ error: 'Failed to trigger workflows' });
  }
});

// Get workflow statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const workflows = await workflowService.getWorkflows();
    
    const stats = {
      total: workflows.length,
      active: workflows.filter(w => w.isActive).length,
      inactive: workflows.filter(w => !w.isActive).length,
      byTrigger: workflows.reduce((acc, w) => {
        acc[w.trigger] = (acc[w.trigger] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: {
        high: workflows.filter(w => w.priority >= 80).length,
        medium: workflows.filter(w => w.priority >= 40 && w.priority < 80).length,
        low: workflows.filter(w => w.priority < 40).length
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching workflow stats:', error);
    res.status(500).json({ error: 'Failed to fetch workflow statistics' });
  }
});

export default router; 