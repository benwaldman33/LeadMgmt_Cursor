import express from 'express';
import { WorkflowService } from '../services/workflowService';
import { authenticateToken, requireRole } from '../middleware/auth';
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

// Apply authentication to all routes
router.use(authenticateToken);

// Get all workflows
router.get('/', async (req, res) => {
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

// Get workflow by ID
router.get('/:id', async (req, res) => {
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

// Create new workflow
router.post('/', requireRole(['SUPER_ADMIN', 'ANALYST']), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const workflowData = {
      ...req.body,
      createdById: req.user.id
    };

    const newWorkflow = await workflowService.createWorkflow(workflowData);
    res.status(201).json(newWorkflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// Update workflow
router.put('/:id', requireRole(['SUPER_ADMIN', 'ANALYST']), async (req, res) => {
  try {
    const updatedWorkflow = await workflowService.updateWorkflow(req.params.id, req.body);
    if (!updatedWorkflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(updatedWorkflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// Delete workflow
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ANALYST']), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await workflowService.deleteWorkflow(req.params.id, req.user.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// Execute workflow
router.post('/:id/execute', requireRole(['SUPER_ADMIN', 'ANALYST']), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { leadId, triggerData } = req.body;
    const execution = await workflowService.executeWorkflow(req.params.id, {
      leadId,
      triggerData,
      userId: req.user.id,
    });
    res.json(execution);
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// Get workflow executions
router.get('/:id/executions', async (req, res) => {
  try {
    const filters = {
      workflowId: req.params.id,
      status: req.query.status as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };
    
    const executions = await workflowService.getWorkflowExecutions(filters);
    res.json(executions);
  } catch (error) {
    console.error('Error fetching workflow executions:', error);
    res.status(500).json({ error: 'Failed to fetch workflow executions' });
  }
});

// Get workflow execution by ID
router.get('/executions/:executionId', async (req, res) => {
  try {
    const execution = await workflowService.getWorkflowExecutionById(req.params.executionId);
    if (!execution) {
      return res.status(404).json({ error: 'Workflow execution not found' });
    }
    res.json(execution);
  } catch (error) {
    console.error('Error fetching workflow execution:', error);
    res.status(500).json({ error: 'Failed to fetch workflow execution' });
  }
});

// Get workflow execution statistics
router.get('/:id/execution-stats', async (req, res) => {
  try {
    const filters = {
      workflowId: req.params.id,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };
    
    const stats = await workflowService.getWorkflowExecutionStats(filters);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching workflow execution stats:', error);
    res.status(500).json({ error: 'Failed to fetch workflow execution stats' });
  }
});

// Trigger workflows for an event
router.post('/trigger/:event', requireRole(['SUPER_ADMIN', 'ANALYST']), async (req, res) => {
  try {
    const { context } = req.body;
    const results = await workflowService.triggerWorkflows(req.params.event, context);
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