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
const businessRuleService_1 = require("../services/businessRuleService");
const auth_1 = require("../middleware/auth");
const joi_1 = __importDefault(require("joi"));
const router = express_1.default.Router();
const businessRuleService = new businessRuleService_1.BusinessRuleService();
// Validation schemas
const createBusinessRuleSchema = joi_1.default.object({
    name: joi_1.default.string().required().min(1).max(100),
    description: joi_1.default.string().optional().max(500),
    type: joi_1.default.string().required().valid('assignment', 'scoring', 'notification', 'status_change', 'enrichment'),
    conditions: joi_1.default.array().items(joi_1.default.object({
        field: joi_1.default.string().required(),
        operator: joi_1.default.string().required().valid('equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'not_in'),
        value: joi_1.default.any().required(),
        logicalOperator: joi_1.default.string().optional().valid('AND', 'OR')
    })).required().min(1),
    actions: joi_1.default.array().items(joi_1.default.object({
        type: joi_1.default.string().required().valid('assignment', 'scoring', 'notification', 'status_change', 'enrichment'),
        target: joi_1.default.string().required(),
        value: joi_1.default.any().required(),
        metadata: joi_1.default.object().optional()
    })).required().min(1),
    isActive: joi_1.default.boolean().optional(),
    priority: joi_1.default.number().integer().min(0).max(100).optional()
});
const updateBusinessRuleSchema = joi_1.default.object({
    name: joi_1.default.string().optional().min(1).max(100),
    description: joi_1.default.string().optional().max(500),
    type: joi_1.default.string().optional().valid('assignment', 'scoring', 'notification', 'status_change', 'enrichment'),
    conditions: joi_1.default.array().items(joi_1.default.object({
        field: joi_1.default.string().required(),
        operator: joi_1.default.string().required().valid('equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'not_in'),
        value: joi_1.default.any().required(),
        logicalOperator: joi_1.default.string().optional().valid('AND', 'OR')
    })).optional().min(1),
    actions: joi_1.default.array().items(joi_1.default.object({
        type: joi_1.default.string().required().valid('assignment', 'scoring', 'notification', 'status_change', 'enrichment'),
        target: joi_1.default.string().required(),
        value: joi_1.default.any().required(),
        metadata: joi_1.default.object().optional()
    })).optional().min(1),
    isActive: joi_1.default.boolean().optional(),
    priority: joi_1.default.number().integer().min(0).max(100).optional()
});
const testRuleSchema = joi_1.default.object({
    testData: joi_1.default.object().required()
});
// Apply authentication to all routes
router.use(auth_1.authenticateToken);
// Get all business rules
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filters = {
            isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
            type: req.query.type,
            createdById: req.query.createdById
        };
        const rules = yield businessRuleService.getBusinessRules(filters);
        res.json(rules);
    }
    catch (error) {
        console.error('Error fetching business rules:', error);
        res.status(500).json({ error: 'Failed to fetch business rules' });
    }
}));
// Get business rule by ID
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rule = yield businessRuleService.getBusinessRuleById(req.params.id);
        if (!rule) {
            return res.status(404).json({ error: 'Business rule not found' });
        }
        res.json(rule);
    }
    catch (error) {
        console.error('Error fetching business rule:', error);
        res.status(500).json({ error: 'Failed to fetch business rule' });
    }
}));
// Create new business rule
router.post('/', (0, auth_1.requireRole)(['SUPER_ADMIN', 'ANALYST']), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const ruleData = Object.assign(Object.assign({}, req.body), { createdById: req.user.id });
        const newRule = yield businessRuleService.createBusinessRule(ruleData);
        res.status(201).json(newRule);
    }
    catch (error) {
        console.error('Error creating business rule:', error);
        res.status(500).json({ error: 'Failed to create business rule' });
    }
}));
// Update business rule
router.put('/:id', (0, auth_1.requireRole)(['SUPER_ADMIN', 'ANALYST']), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updatedRule = yield businessRuleService.updateBusinessRule(req.params.id, req.body);
        if (!updatedRule) {
            return res.status(404).json({ error: 'Business rule not found' });
        }
        res.json(updatedRule);
    }
    catch (error) {
        console.error('Error updating business rule:', error);
        res.status(500).json({ error: 'Failed to update business rule' });
    }
}));
// Delete business rule
router.delete('/:id', (0, auth_1.requireRole)(['SUPER_ADMIN', 'ANALYST']), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        yield businessRuleService.deleteBusinessRule(req.params.id, req.user.id);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting business rule:', error);
        res.status(500).json({ error: 'Failed to delete business rule' });
    }
}));
// Test business rule
router.post('/:id/test', (0, auth_1.requireRole)(['SUPER_ADMIN', 'ANALYST']), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const testData = req.body;
        const result = yield businessRuleService.testRuleEvaluation(req.params.id, testData);
        res.json(result);
    }
    catch (error) {
        console.error('Error testing business rule:', error);
        res.status(500).json({ error: 'Failed to test business rule' });
    }
}));
// Get business rules by type
router.get('/type/:type', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const businessRules = yield businessRuleService.getBusinessRulesByType(req.params.type);
        res.json(businessRules);
    }
    catch (error) {
        console.error('Error fetching business rules by type:', error);
        res.status(500).json({ error: 'Failed to fetch business rules by type' });
    }
}));
// Evaluate business rules for a lead
router.post('/evaluate/:leadId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const results = yield businessRuleService.evaluateRules(req.params.leadId, req.body.context);
        res.json(results);
    }
    catch (error) {
        console.error('Error evaluating business rules:', error);
        res.status(500).json({ error: 'Failed to evaluate business rules' });
    }
}));
// Apply business rule actions to a lead
router.post('/apply/:leadId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { actions } = req.body;
        yield businessRuleService.applyRuleActions(req.params.leadId, actions);
        res.json({ message: 'Actions applied successfully' });
    }
    catch (error) {
        console.error('Error applying business rule actions:', error);
        res.status(500).json({ error: 'Failed to apply business rule actions' });
    }
}));
// Bulk apply business rules to leads
router.post('/bulk-apply', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { leadIds, context } = req.body;
        const results = yield businessRuleService.bulkApplyRules(leadIds, context);
        res.json(results);
    }
    catch (error) {
        console.error('Error bulk applying business rules:', error);
        res.status(500).json({ error: 'Failed to bulk apply business rules' });
    }
}));
// Get business rule statistics
router.get('/stats/overview', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield businessRuleService.getBusinessRuleStats();
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching business rule stats:', error);
        res.status(500).json({ error: 'Failed to fetch business rule stats' });
    }
}));
exports.default = router;
