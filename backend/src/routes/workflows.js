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
const workflowService_1 = require("../services/workflowService");
const auth_1 = require("../middleware/auth");
const joi_1 = __importDefault(require("joi"));
const router = express_1.default.Router();
const workflowService = new workflowService_1.WorkflowService();
// Validation schemas
const createWorkflowSchema = joi_1.default.object({
    name: joi_1.default.string().required().min(1).max(100),
    description: joi_1.default.string().optional().max(500),
    trigger: joi_1.default.string().required().valid('lead_created', 'lead_scored', 'lead_status_changed', 'manual'),
    isActive: joi_1.default.boolean().optional(),
    priority: joi_1.default.number().integer().min(0).max(100).optional(),
    steps: joi_1.default.array().items(joi_1.default.object({
        type: joi_1.default.string().required().valid('action', 'condition', 'delay', 'notification', 'integration'),
        name: joi_1.default.string().required().min(1).max(100),
        order: joi_1.default.number().integer().min(0).required(),
        config: joi_1.default.object().required()
    })).required().min(1)
});
const updateWorkflowSchema = joi_1.default.object({
    name: joi_1.default.string().optional().min(1).max(100),
    description: joi_1.default.string().optional().max(500),
    trigger: joi_1.default.string().optional().valid('lead_created', 'lead_scored', 'lead_status_changed', 'manual'),
    isActive: joi_1.default.boolean().optional(),
    priority: joi_1.default.number().integer().min(0).max(100).optional(),
    steps: joi_1.default.array().items(joi_1.default.object({
        type: joi_1.default.string().required().valid('action', 'condition', 'delay', 'notification', 'integration'),
        name: joi_1.default.string().required().min(1).max(100),
        order: joi_1.default.number().integer().min(0).required(),
        config: joi_1.default.object().required()
    })).optional().min(1)
});
const executeWorkflowSchema = joi_1.default.object({
    leadId: joi_1.default.string().optional(),
    triggerData: joi_1.default.object().optional()
});
// Apply authentication to all routes
router.use(auth_1.authenticateToken);
// Get all workflows
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filters = {
            isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
            trigger: req.query.trigger,
            createdById: req.query.createdById
        };
        const workflows = yield workflowService.getWorkflows(filters);
        res.json(workflows);
    }
    catch (error) {
        console.error('Error fetching workflows:', error);
        res.status(500).json({ error: 'Failed to fetch workflows' });
    }
}));
// Get workflow by ID
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const workflow = yield workflowService.getWorkflowById(req.params.id);
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        res.json(workflow);
    }
    catch (error) {
        console.error('Error fetching workflow:', error);
        res.status(500).json({ error: 'Failed to fetch workflow' });
    }
}));
// Create new workflow
router.post('/', (0, auth_1.requireRole)(['SUPER_ADMIN', 'ANALYST']), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const workflowData = Object.assign(Object.assign({}, req.body), { createdById: req.user.id });
        const newWorkflow = yield workflowService.createWorkflow(workflowData);
        res.status(201).json(newWorkflow);
    }
    catch (error) {
        console.error('Error creating workflow:', error);
        res.status(500).json({ error: 'Failed to create workflow' });
    }
}));
// Update workflow
router.put('/:id', (0, auth_1.requireRole)(['SUPER_ADMIN', 'ANALYST']), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updatedWorkflow = yield workflowService.updateWorkflow(req.params.id, req.body);
        if (!updatedWorkflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        res.json(updatedWorkflow);
    }
    catch (error) {
        console.error('Error updating workflow:', error);
        res.status(500).json({ error: 'Failed to update workflow' });
    }
}));
// Delete workflow
router.delete('/:id', (0, auth_1.requireRole)(['SUPER_ADMIN', 'ANALYST']), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        yield workflowService.deleteWorkflow(req.params.id, req.user.id);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting workflow:', error);
        res.status(500).json({ error: 'Failed to delete workflow' });
    }
}));
// Execute workflow
router.post('/:id/execute', (0, auth_1.requireRole)(['SUPER_ADMIN', 'ANALYST']), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { leadId, triggerData } = req.body;
        const execution = yield workflowService.executeWorkflow(req.params.id, {
            leadId,
            triggerData,
            userId: req.user.id,
        });
        res.json(execution);
    }
    catch (error) {
        console.error('Error executing workflow:', error);
        res.status(500).json({ error: 'Failed to execute workflow' });
    }
}));
// Get workflow executions
router.get('/:id/executions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filters = {
            workflowId: req.params.id,
            status: req.query.status,
            startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
            endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset) : undefined
        };
        const executions = yield workflowService.getWorkflowExecutions(filters);
        res.json(executions);
    }
    catch (error) {
        console.error('Error fetching workflow executions:', error);
        res.status(500).json({ error: 'Failed to fetch workflow executions' });
    }
}));
// Get workflow execution by ID
router.get('/executions/:executionId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const execution = yield workflowService.getWorkflowExecutionById(req.params.executionId);
        if (!execution) {
            return res.status(404).json({ error: 'Workflow execution not found' });
        }
        res.json(execution);
    }
    catch (error) {
        console.error('Error fetching workflow execution:', error);
        res.status(500).json({ error: 'Failed to fetch workflow execution' });
    }
}));
// Get workflow execution statistics
router.get('/:id/execution-stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filters = {
            workflowId: req.params.id,
            startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
            endDate: req.query.endDate ? new Date(req.query.endDate) : undefined
        };
        const stats = yield workflowService.getWorkflowExecutionStats(filters);
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching workflow execution stats:', error);
        res.status(500).json({ error: 'Failed to fetch workflow execution stats' });
    }
}));
// Trigger workflows for an event
router.post('/trigger/:event', (0, auth_1.requireRole)(['SUPER_ADMIN', 'ANALYST']), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { context } = req.body;
        const results = yield workflowService.triggerWorkflows(req.params.event, context);
        res.json(results);
    }
    catch (error) {
        console.error('Error triggering workflows:', error);
        res.status(500).json({ error: 'Failed to trigger workflows' });
    }
}));
// Get workflow statistics
router.get('/stats/overview', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const workflows = yield workflowService.getWorkflows();
        const stats = {
            total: workflows.length,
            active: workflows.filter(w => w.isActive).length,
            inactive: workflows.filter(w => !w.isActive).length,
            byTrigger: workflows.reduce((acc, w) => {
                acc[w.trigger] = (acc[w.trigger] || 0) + 1;
                return acc;
            }, {}),
            byPriority: {
                high: workflows.filter(w => w.priority >= 80).length,
                medium: workflows.filter(w => w.priority >= 40 && w.priority < 80).length,
                low: workflows.filter(w => w.priority < 40).length
            }
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching workflow stats:', error);
        res.status(500).json({ error: 'Failed to fetch workflow statistics' });
    }
}));
exports.default = router;
