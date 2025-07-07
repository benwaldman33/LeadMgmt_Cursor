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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
const client_1 = require("@prisma/client");
const auditLogService_1 = require("./auditLogService");
const prisma = new client_1.PrismaClient();
class WorkflowService {
    // Create a new workflow
    createWorkflow(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { steps } = data, workflowData = __rest(data, ["steps"]);
            const workflow = yield prisma.workflow.create({
                data: Object.assign(Object.assign({}, workflowData), { isActive: (_a = workflowData.isActive) !== null && _a !== void 0 ? _a : true, priority: (_b = workflowData.priority) !== null && _b !== void 0 ? _b : 0, steps: {
                        create: steps.map(step => ({
                            name: step.name,
                            type: step.type,
                            order: step.order,
                            config: JSON.stringify(step.config)
                        }))
                    } }),
                include: {
                    steps: true,
                    createdBy: {
                        select: { id: true, email: true, fullName: true }
                    }
                }
            });
            yield auditLogService_1.AuditLogService.logActivity({
                action: 'CREATE',
                entityType: 'WORKFLOW',
                entityId: workflow.id,
                userId: data.createdById,
                description: `Created workflow: ${workflow.name}`
            });
            return workflow;
        });
    }
    // Get all workflows with optional filters
    getWorkflows(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.workflow.findMany({
                where: filters,
                include: {
                    steps: {
                        orderBy: { order: 'asc' }
                    },
                    createdBy: {
                        select: { id: true, email: true, fullName: true }
                    },
                    executions: {
                        take: 5,
                        orderBy: { startedAt: 'desc' }
                    }
                },
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'desc' }
                ]
            });
        });
    }
    // Get a single workflow by ID
    getWorkflowById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.workflow.findUnique({
                where: { id },
                include: {
                    steps: {
                        orderBy: { order: 'asc' }
                    },
                    createdBy: {
                        select: { id: true, email: true, fullName: true }
                    },
                    executions: {
                        take: 10,
                        orderBy: { startedAt: 'desc' },
                        include: {
                            lead: {
                                select: { id: true, companyName: true, status: true }
                            }
                        }
                    }
                }
            });
        });
    }
    // Update a workflow
    updateWorkflow(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { steps } = data, updateData = __rest(data, ["steps"]);
            const workflow = yield prisma.workflow.update({
                where: { id },
                data: Object.assign(Object.assign({}, updateData), (steps && {
                    steps: {
                        deleteMany: {},
                        create: steps.map(step => ({
                            name: step.name,
                            type: step.type,
                            order: step.order,
                            config: JSON.stringify(step.config)
                        }))
                    }
                })),
                include: {
                    steps: {
                        orderBy: { order: 'asc' }
                    }
                }
            });
            yield auditLogService_1.AuditLogService.logActivity({
                action: 'UPDATE',
                entityType: 'WORKFLOW',
                entityId: id,
                description: `Updated workflow: ${workflow.name}`
            });
            return workflow;
        });
    }
    // Delete a workflow
    deleteWorkflow(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const workflow = yield prisma.workflow.delete({
                where: { id }
            });
            yield auditLogService_1.AuditLogService.logActivity({
                action: 'DELETE',
                entityType: 'WORKFLOW',
                entityId: id,
                userId,
                description: `Deleted workflow: ${workflow.name}`
            });
            return workflow;
        });
    }
    // Execute a workflow
    executeWorkflow(workflowId, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const workflow = yield this.getWorkflowById(workflowId);
            if (!workflow || !workflow.isActive) {
                throw new Error('Workflow not found or inactive');
            }
            // Create execution record with enhanced context
            const execution = yield prisma.workflowExecution.create({
                data: {
                    workflowId,
                    leadId: context.leadId,
                    triggeredById: context.userId,
                    status: 'running',
                    triggerData: context.triggerData ? JSON.stringify(context.triggerData) : null,
                    executionContext: JSON.stringify({
                        workflowName: workflow.name,
                        trigger: workflow.trigger,
                        context: {
                            leadId: context.leadId,
                            userId: context.userId,
                            triggerData: context.triggerData
                        },
                        timestamp: new Date().toISOString()
                    })
                }
            });
            const stepResults = [];
            let hasError = false;
            let errorMessage = '';
            try {
                // Execute steps in order
                for (const step of workflow.steps) {
                    const stepResult = yield this.executeStep(step, context);
                    stepResults.push({
                        stepId: step.id,
                        stepName: step.name,
                        stepType: step.type,
                        success: stepResult.success,
                        result: stepResult.result,
                        error: stepResult.error
                    });
                    if (!stepResult.success) {
                        hasError = true;
                        errorMessage = stepResult.error || 'Step execution failed';
                        break;
                    }
                }
                // Update execution record
                yield prisma.workflowExecution.update({
                    where: { id: execution.id },
                    data: {
                        status: hasError ? 'failed' : 'completed',
                        completedAt: new Date(),
                        errorMessage: hasError ? errorMessage : null,
                        stepResults: JSON.stringify(stepResults)
                    }
                });
                return {
                    success: !hasError,
                    stepResults,
                    errorMessage: hasError ? errorMessage : undefined
                };
            }
            catch (error) {
                yield prisma.workflowExecution.update({
                    where: { id: execution.id },
                    data: {
                        status: 'failed',
                        completedAt: new Date(),
                        errorMessage: error instanceof Error ? error.message : 'Unknown error'
                    }
                });
                throw error;
            }
        });
    }
    // Execute a single workflow step
    executeStep(step, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = JSON.parse(step.config);
            try {
                switch (step.type) {
                    case 'action':
                        return yield this.executeActionStep(config, context);
                    case 'condition':
                        return yield this.executeConditionStep(config, context);
                    case 'delay':
                        return yield this.executeDelayStep(config, context);
                    case 'notification':
                        return yield this.executeNotificationStep(config, context);
                    case 'integration':
                        return yield this.executeIntegrationStep(config, context);
                    default:
                        return {
                            success: false,
                            result: null,
                            error: `Unknown step type: ${step.type}`
                        };
                }
            }
            catch (error) {
                return {
                    success: false,
                    result: null,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
    }
    // Execute action step (e.g., update lead status, assign lead)
    executeActionStep(config, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { action, target, value } = config;
            if (action === 'update_lead_status' && context.leadId) {
                yield prisma.lead.update({
                    where: { id: context.leadId },
                    data: { status: value }
                });
                return { success: true, result: { action, value } };
            }
            if (action === 'assign_lead' && context.leadId) {
                yield prisma.lead.update({
                    where: { id: context.leadId },
                    data: { assignedToId: value }
                });
                return { success: true, result: { action, value } };
            }
            if (action === 'assign_team' && context.leadId) {
                yield prisma.lead.update({
                    where: { id: context.leadId },
                    data: { assignedTeamId: value }
                });
                return { success: true, result: { action, value } };
            }
            return { success: false, result: null, error: `Unknown action: ${action}` };
        });
    }
    // Execute condition step (e.g., check lead score, industry)
    executeConditionStep(config, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { condition, operator, value, field } = config;
            if (!context.leadId) {
                return { success: false, result: null, error: 'No lead context provided' };
            }
            const lead = yield prisma.lead.findUnique({
                where: { id: context.leadId }
            });
            if (!lead) {
                return { success: false, result: null, error: 'Lead not found' };
            }
            let actualValue;
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
                default:
                    return { success: false, result: null, error: `Unknown field: ${field}` };
            }
            let result = false;
            switch (operator) {
                case 'equals':
                    result = actualValue === value;
                    break;
                case 'not_equals':
                    result = actualValue !== value;
                    break;
                case 'greater_than':
                    result = Number(actualValue) > Number(value);
                    break;
                case 'less_than':
                    result = Number(actualValue) < Number(value);
                    break;
                case 'contains':
                    result = String(actualValue).includes(String(value));
                    break;
                default:
                    return { success: false, result: null, error: `Unknown operator: ${operator}` };
            }
            return { success: true, result: { condition, result, actualValue, expectedValue: value } };
        });
    }
    // Execute delay step
    executeDelayStep(config, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { duration } = config; // duration in milliseconds
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({ success: true, result: { delay: duration } });
                }, duration);
            });
        });
    }
    // Execute notification step
    executeNotificationStep(config, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { type, message, recipients } = config;
            // In a real implementation, this would integrate with notification services
            // For now, we'll just log the notification
            console.log(`[NOTIFICATION] ${type}: ${message}`, { recipients, context });
            return { success: true, result: { type, message, recipients } };
        });
    }
    // Execute integration step
    executeIntegrationStep(config, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { integrationId, action, data } = config;
            // In a real implementation, this would call the integration service
            // For now, we'll just log the integration call
            console.log(`[INTEGRATION] ${action}`, { integrationId, data, context });
            return { success: true, result: { integrationId, action, data } };
        });
    }
    // Get workflow executions with enhanced filtering and pagination
    getWorkflowExecutions(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const where = {};
            if (filters === null || filters === void 0 ? void 0 : filters.workflowId) {
                where.workflowId = filters.workflowId;
            }
            if (filters === null || filters === void 0 ? void 0 : filters.leadId) {
                where.leadId = filters.leadId;
            }
            if (filters === null || filters === void 0 ? void 0 : filters.status) {
                where.status = filters.status;
            }
            if (filters === null || filters === void 0 ? void 0 : filters.triggeredById) {
                where.triggeredById = filters.triggeredById;
            }
            if ((filters === null || filters === void 0 ? void 0 : filters.startDate) || (filters === null || filters === void 0 ? void 0 : filters.endDate)) {
                where.startedAt = {};
                if (filters === null || filters === void 0 ? void 0 : filters.startDate) {
                    where.startedAt.gte = filters.startDate;
                }
                if (filters === null || filters === void 0 ? void 0 : filters.endDate) {
                    where.startedAt.lte = filters.endDate;
                }
            }
            const limit = (filters === null || filters === void 0 ? void 0 : filters.limit) || 50;
            const offset = (filters === null || filters === void 0 ? void 0 : filters.offset) || 0;
            const [executions, totalCount] = yield Promise.all([
                prisma.workflowExecution.findMany({
                    where,
                    include: {
                        workflow: {
                            select: { id: true, name: true, description: true }
                        },
                        lead: {
                            select: { id: true, companyName: true, status: true }
                        },
                        triggeredBy: {
                            select: { id: true, email: true, fullName: true }
                        }
                    },
                    orderBy: { startedAt: 'desc' },
                    take: limit,
                    skip: offset
                }),
                prisma.workflowExecution.count({ where })
            ]);
            return {
                executions,
                totalCount,
                hasMore: totalCount > offset + limit
            };
        });
    }
    // Get workflow execution statistics
    getWorkflowExecutionStats(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const where = {};
            if (filters === null || filters === void 0 ? void 0 : filters.workflowId) {
                where.workflowId = filters.workflowId;
            }
            if ((filters === null || filters === void 0 ? void 0 : filters.startDate) || (filters === null || filters === void 0 ? void 0 : filters.endDate)) {
                where.startedAt = {};
                if (filters === null || filters === void 0 ? void 0 : filters.startDate) {
                    where.startedAt.gte = filters.startDate;
                }
                if (filters === null || filters === void 0 ? void 0 : filters.endDate) {
                    where.startedAt.lte = filters.endDate;
                }
            }
            const [totalExecutions, completedExecutions, failedExecutions, runningExecutions] = yield Promise.all([
                prisma.workflowExecution.count({ where }),
                prisma.workflowExecution.count({ where: Object.assign(Object.assign({}, where), { status: 'completed' }) }),
                prisma.workflowExecution.count({ where: Object.assign(Object.assign({}, where), { status: 'failed' }) }),
                prisma.workflowExecution.count({ where: Object.assign(Object.assign({}, where), { status: 'running' }) })
            ]);
            const successRate = totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0;
            return {
                totalExecutions,
                completedExecutions,
                failedExecutions,
                runningExecutions,
                successRate: Math.round(successRate * 100) / 100
            };
        });
    }
    // Get a single workflow execution by ID
    getWorkflowExecutionById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.workflowExecution.findUnique({
                where: { id },
                include: {
                    workflow: {
                        select: { id: true, name: true, description: true }
                    },
                    lead: {
                        select: { id: true, companyName: true, status: true }
                    },
                    triggeredBy: {
                        select: { id: true, email: true, fullName: true }
                    }
                }
            });
        });
    }
    // Trigger workflows based on event
    triggerWorkflows(event, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const workflows = yield prisma.workflow.findMany({
                where: {
                    trigger: event,
                    isActive: true
                },
                include: {
                    steps: {
                        orderBy: { order: 'asc' }
                    }
                },
                orderBy: { priority: 'desc' }
            });
            const results = [];
            for (const workflow of workflows) {
                try {
                    const result = yield this.executeWorkflow(workflow.id, context);
                    results.push(Object.assign({ workflowId: workflow.id, workflowName: workflow.name }, result));
                }
                catch (error) {
                    results.push({
                        workflowId: workflow.id,
                        workflowName: workflow.name,
                        success: false,
                        errorMessage: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            return results;
        });
    }
}
exports.WorkflowService = WorkflowService;
