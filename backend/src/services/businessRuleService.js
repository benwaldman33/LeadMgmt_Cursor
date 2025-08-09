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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessRuleService = void 0;
const client_1 = require("@prisma/client");
const auditLogService_1 = require("./auditLogService");
const prisma = new client_1.PrismaClient();
class BusinessRuleService {
    // Create a new business rule
    createBusinessRule(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const businessRule = yield prisma.businessRule.create({
                data: {
                    name: data.name,
                    description: data.description,
                    type: data.type,
                    conditions: JSON.stringify(data.conditions),
                    actions: JSON.stringify(data.actions),
                    isActive: (_a = data.isActive) !== null && _a !== void 0 ? _a : true,
                    priority: (_b = data.priority) !== null && _b !== void 0 ? _b : 0,
                    createdById: data.createdById
                },
                include: {
                    createdBy: {
                        select: { id: true, email: true, fullName: true }
                    }
                }
            });
            yield auditLogService_1.AuditLogService.logActivity({
                action: 'CREATE',
                entityType: 'BUSINESS_RULE',
                entityId: businessRule.id,
                userId: data.createdById,
                description: `Created business rule: ${businessRule.name}`
            });
            return businessRule;
        });
    }
    // Get all business rules with optional filters
    getBusinessRules(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.businessRule.findMany({
                where: filters,
                include: {
                    createdBy: {
                        select: { id: true, email: true, fullName: true }
                    }
                },
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'desc' }
                ]
            });
        });
    }
    // Get a single business rule by ID
    getBusinessRuleById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.businessRule.findUnique({
                where: { id },
                include: {
                    createdBy: {
                        select: { id: true, email: true, fullName: true }
                    }
                }
            });
        });
    }
    // Update a business rule
    updateBusinessRule(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateData = Object.assign({}, data);
            if (data.conditions) {
                updateData.conditions = JSON.stringify(data.conditions);
            }
            if (data.actions) {
                updateData.actions = JSON.stringify(data.actions);
            }
            const businessRule = yield prisma.businessRule.update({
                where: { id },
                data: updateData,
                include: {
                    createdBy: {
                        select: { id: true, email: true, fullName: true }
                    }
                }
            });
            yield auditLogService_1.AuditLogService.logActivity({
                action: 'UPDATE',
                entityType: 'BUSINESS_RULE',
                entityId: id,
                description: `Updated business rule: ${businessRule.name}`
            });
            return businessRule;
        });
    }
    // Delete a business rule
    deleteBusinessRule(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const businessRule = yield prisma.businessRule.delete({
                where: { id }
            });
            yield auditLogService_1.AuditLogService.logActivity({
                action: 'DELETE',
                entityType: 'BUSINESS_RULE',
                entityId: id,
                userId,
                description: `Deleted business rule: ${businessRule.name}`
            });
            return businessRule;
        });
    }
    // Evaluate business rules against a lead
    evaluateRules(leadId, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const lead = yield prisma.lead.findUnique({
                where: { id: leadId },
                include: {
                    scoringDetails: true,
                    enrichment: true,
                    assignedTo: {
                        select: { id: true, email: true, fullName: true }
                    },
                    assignedTeam: {
                        select: { id: true, name: true }
                    }
                }
            });
            if (!lead) {
                throw new Error('Lead not found');
            }
            const businessRules = yield this.getBusinessRules({ isActive: true });
            const results = [];
            for (const rule of businessRules) {
                const conditions = JSON.parse(rule.conditions);
                const actions = JSON.parse(rule.actions);
                const matched = this.evaluateConditions(conditions, lead, context);
                if (matched) {
                    results.push({
                        matched: true,
                        actions,
                        conditions
                    });
                }
            }
            return results;
        });
    }
    // Evaluate conditions against lead data
    evaluateConditions(conditions, lead, context) {
        if (conditions.length === 0) {
            return true;
        }
        let result = true;
        let logicalOperator = 'AND';
        for (let i = 0; i < conditions.length; i++) {
            const condition = conditions[i];
            const conditionResult = this.evaluateCondition(condition, lead, context);
            if (i === 0) {
                result = conditionResult;
                logicalOperator = condition.logicalOperator || 'AND';
            }
            else {
                if (logicalOperator === 'AND') {
                    result = result && conditionResult;
                }
                else {
                    result = result || conditionResult;
                }
                logicalOperator = condition.logicalOperator || logicalOperator;
            }
        }
        return result;
    }
    // Evaluate a single condition
    evaluateCondition(condition, lead, context) {
        var _a, _b;
        const { field, operator, value } = condition;
        let actualValue;
        // Get value from lead data
        switch (field) {
            case 'score':
                actualValue = lead.score;
                break;
            case 'status':
                actualValue = lead.status;
                break;
            case 'industry':
                actualValue = lead.industry;
                break;
            case 'companyName':
                actualValue = lead.companyName;
                break;
            case 'domain':
                actualValue = lead.domain;
                break;
            case 'assignedTo':
                actualValue = (_a = lead.assignedTo) === null || _a === void 0 ? void 0 : _a.id;
                break;
            case 'assignedTeam':
                actualValue = (_b = lead.assignedTeam) === null || _b === void 0 ? void 0 : _b.id;
                break;
            case 'campaignId':
                actualValue = lead.campaignId;
                break;
            case 'createdAt':
                actualValue = lead.createdAt;
                break;
            case 'updatedAt':
                actualValue = lead.updatedAt;
                break;
            default:
                // Check if it's a context field
                actualValue = context === null || context === void 0 ? void 0 : context[field];
                break;
        }
        // Evaluate the condition
        switch (operator) {
            case 'equals':
                return actualValue === value;
            case 'not_equals':
                return actualValue !== value;
            case 'greater_than':
                return Number(actualValue) > Number(value);
            case 'less_than':
                return Number(actualValue) < Number(value);
            case 'contains':
                return String(actualValue).toLowerCase().includes(String(value).toLowerCase());
            case 'in':
                return Array.isArray(value) ? value.includes(actualValue) : false;
            case 'not_in':
                return Array.isArray(value) ? !value.includes(actualValue) : false;
            default:
                return false;
        }
    }
    // Apply business rule actions to a lead
    applyRuleActions(leadId, actions) {
        return __awaiter(this, void 0, void 0, function* () {
            const lead = yield prisma.lead.findUnique({
                where: { id: leadId }
            });
            if (!lead) {
                throw new Error('Lead not found');
            }
            for (const action of actions) {
                yield this.applyAction(leadId, action);
            }
        });
    }
    // Apply a single action
    applyAction(leadId, action) {
        return __awaiter(this, void 0, void 0, function* () {
            const { type, target, value, metadata } = action;
            switch (type) {
                case 'assignment':
                    if (target === 'user') {
                        yield prisma.lead.update({
                            where: { id: leadId },
                            data: { assignedToId: value }
                        });
                    }
                    else if (target === 'team') {
                        yield prisma.lead.update({
                            where: { id: leadId },
                            data: { assignedTeamId: value }
                        });
                    }
                    break;
                case 'status_change':
                    yield prisma.lead.update({
                        where: { id: leadId },
                        data: { status: value }
                    });
                    break;
                case 'scoring':
                    yield prisma.lead.update({
                        where: { id: leadId },
                        data: { score: value }
                    });
                    break;
                case 'notification':
                    // In a real implementation, this would trigger notifications
                    console.log(`[BUSINESS_RULE_NOTIFICATION] ${target}: ${value}`, { metadata });
                    break;
                case 'enrichment':
                    // In a real implementation, this would trigger enrichment
                    console.log(`[BUSINESS_RULE_ENRICHMENT] ${target}: ${value}`, { metadata });
                    break;
                default:
                    console.warn(`Unknown action type: ${type}`);
            }
        });
    }
    // Get business rule statistics
    getBusinessRuleStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const [totalRules, activeRules, ruleTypes] = yield Promise.all([
                prisma.businessRule.count(),
                prisma.businessRule.count({ where: { isActive: true } }),
                prisma.businessRule.groupBy({
                    by: ['type'],
                    _count: { type: true }
                })
            ]);
            return {
                totalRules,
                activeRules,
                inactiveRules: totalRules - activeRules,
                ruleTypes: ruleTypes.map(type => ({
                    type: type.type,
                    count: type._count.type
                }))
            };
        });
    }
    // Test business rule evaluation
    testRuleEvaluation(ruleId, testData) {
        return __awaiter(this, void 0, void 0, function* () {
            const rule = yield this.getBusinessRuleById(ruleId);
            if (!rule) {
                throw new Error('Business rule not found');
            }
            const conditions = JSON.parse(rule.conditions);
            const actions = JSON.parse(rule.actions);
            const matched = this.evaluateConditions(conditions, testData);
            return {
                matched,
                actions: matched ? actions : [],
                conditions
            };
        });
    }
    // Get business rules by type
    getBusinessRulesByType(type) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getBusinessRules({ type, isActive: true });
        });
    }
    // Bulk apply business rules to leads
    bulkApplyRules(leadIds, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            for (const leadId of leadIds) {
                try {
                    const ruleResults = yield this.evaluateRules(leadId, context);
                    const allActions = ruleResults.flatMap(result => result.actions);
                    if (allActions.length > 0) {
                        yield this.applyRuleActions(leadId, allActions);
                    }
                    results.push({
                        leadId,
                        success: true,
                        rulesMatched: ruleResults.length,
                        actionsApplied: allActions.length
                    });
                }
                catch (error) {
                    results.push({
                        leadId,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            return results;
        });
    }
}
exports.BusinessRuleService = BusinessRuleService;
