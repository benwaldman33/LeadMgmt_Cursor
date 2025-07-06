import { PrismaClient } from '@prisma/client';
import { AuditLogService } from './auditLogService';

const prisma = new PrismaClient();

export interface WorkflowStepConfig {
  type: 'action' | 'condition' | 'delay' | 'notification' | 'integration';
  name: string;
  order: number;
  config: any;
}

export interface WorkflowExecutionResult {
  success: boolean;
  stepResults: any[];
  errorMessage?: string;
}

export interface StepResult {
  success: boolean;
  result: any;
  error?: string;
}

export class WorkflowService {
  // Create a new workflow
  async createWorkflow(data: {
    name: string;
    description?: string;
    trigger: string;
    isActive?: boolean;
    priority?: number;
    createdById: string;
    steps: WorkflowStepConfig[];
  }) {
    const { steps, ...workflowData } = data;
    
    const workflow = await prisma.workflow.create({
      data: {
        ...workflowData,
        isActive: workflowData.isActive ?? true,
        priority: workflowData.priority ?? 0,
        steps: {
          create: steps.map(step => ({
            name: step.name,
            type: step.type,
            order: step.order,
            config: JSON.stringify(step.config)
          }))
        }
      },
      include: {
        steps: true,
        createdBy: {
          select: { id: true, email: true, fullName: true }
        }
      }
    });

    await AuditLogService.logActivity({
      action: 'CREATE',
      entityType: 'WORKFLOW',
      entityId: workflow.id,
      userId: data.createdById,
      description: `Created workflow: ${workflow.name}`
    });

    return workflow;
  }

  // Get all workflows with optional filters
  async getWorkflows(filters?: {
    isActive?: boolean;
    trigger?: string;
    createdById?: string;
  }) {
    return await prisma.workflow.findMany({
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
  }

  // Get a single workflow by ID
  async getWorkflowById(id: string) {
    return await prisma.workflow.findUnique({
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
  }

  // Update a workflow
  async updateWorkflow(id: string, data: {
    name?: string;
    description?: string;
    trigger?: string;
    isActive?: boolean;
    priority?: number;
    steps?: WorkflowStepConfig[];
  }) {
    const { steps, ...updateData } = data;
    
    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        ...updateData,
        ...(steps && {
          steps: {
            deleteMany: {},
            create: steps.map(step => ({
              name: step.name,
              type: step.type,
              order: step.order,
              config: JSON.stringify(step.config)
            }))
          }
        })
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        }
      }
    });

    await AuditLogService.logActivity({
      action: 'UPDATE',
      entityType: 'WORKFLOW',
      entityId: id,
      description: `Updated workflow: ${workflow.name}`
    });

    return workflow;
  }

  // Delete a workflow
  async deleteWorkflow(id: string, userId: string) {
    const workflow = await prisma.workflow.delete({
      where: { id }
    });

    await AuditLogService.logActivity({
      action: 'DELETE',
      entityType: 'WORKFLOW',
      entityId: id,
      userId,
      description: `Deleted workflow: ${workflow.name}`
    });

    return workflow;
  }

  // Execute a workflow
  async executeWorkflow(workflowId: string, context: {
    leadId?: string;
    userId?: string;
    triggerData?: any;
  }): Promise<WorkflowExecutionResult> {
    const workflow = await this.getWorkflowById(workflowId);
    if (!workflow || !workflow.isActive) {
      throw new Error('Workflow not found or inactive');
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        leadId: context.leadId,
        status: 'running'
      }
    });

    const stepResults: any[] = [];
    let hasError = false;
    let errorMessage = '';

    try {
      // Execute steps in order
      for (const step of workflow.steps) {
        const stepResult = await this.executeStep(step, context);
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
      await prisma.workflowExecution.update({
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
    } catch (error) {
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  }

  // Execute a single workflow step
  private async executeStep(step: any, context: any): Promise<StepResult> {
    const config = JSON.parse(step.config);
    
    try {
      switch (step.type) {
        case 'action':
          return await this.executeActionStep(config, context);
        case 'condition':
          return await this.executeConditionStep(config, context);
        case 'delay':
          return await this.executeDelayStep(config, context);
        case 'notification':
          return await this.executeNotificationStep(config, context);
        case 'integration':
          return await this.executeIntegrationStep(config, context);
        default:
          return {
            success: false,
            result: null,
            error: `Unknown step type: ${step.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Execute action step (e.g., update lead status, assign lead)
  private async executeActionStep(config: any, context: any): Promise<StepResult> {
    const { action, target, value } = config;
    
    if (action === 'update_lead_status' && context.leadId) {
      await prisma.lead.update({
        where: { id: context.leadId },
        data: { status: value }
      });
      return { success: true, result: { action, value } };
    }
    
    if (action === 'assign_lead' && context.leadId) {
      await prisma.lead.update({
        where: { id: context.leadId },
        data: { assignedToId: value }
      });
      return { success: true, result: { action, value } };
    }
    
    if (action === 'assign_team' && context.leadId) {
      await prisma.lead.update({
        where: { id: context.leadId },
        data: { assignedTeamId: value }
      });
      return { success: true, result: { action, value } };
    }
    
    return { success: false, result: null, error: `Unknown action: ${action}` };
  }

  // Execute condition step (e.g., check lead score, industry)
  private async executeConditionStep(config: any, context: any): Promise<StepResult> {
    const { condition, operator, value, field } = config;
    
    if (!context.leadId) {
      return { success: false, result: null, error: 'No lead context provided' };
    }
    
    const lead = await prisma.lead.findUnique({
      where: { id: context.leadId }
    });
    
    if (!lead) {
      return { success: false, result: null, error: 'Lead not found' };
    }
    
    let actualValue: any;
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
  }

  // Execute delay step
  private async executeDelayStep(config: any, context: any): Promise<StepResult> {
    const { duration } = config; // duration in milliseconds
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, result: { delay: duration } });
      }, duration);
    });
  }

  // Execute notification step
  private async executeNotificationStep(config: any, context: any): Promise<StepResult> {
    const { type, message, recipients } = config;
    
    // In a real implementation, this would integrate with notification services
    // For now, we'll just log the notification
    console.log(`[NOTIFICATION] ${type}: ${message}`, { recipients, context });
    
    return { success: true, result: { type, message, recipients } };
  }

  // Execute integration step
  private async executeIntegrationStep(config: any, context: any): Promise<StepResult> {
    const { integrationId, action, data } = config;
    
    // In a real implementation, this would call the integration service
    // For now, we'll just log the integration call
    console.log(`[INTEGRATION] ${action}`, { integrationId, data, context });
    
    return { success: true, result: { integrationId, action, data } };
  }

  // Get workflow executions
  async getWorkflowExecutions(filters?: {
    workflowId?: string;
    leadId?: string;
    status?: string;
  }) {
    return await prisma.workflowExecution.findMany({
      where: filters,
      include: {
        workflow: {
          select: { id: true, name: true }
        },
        lead: {
          select: { id: true, companyName: true, status: true }
        }
      },
      orderBy: { startedAt: 'desc' }
    });
  }

  // Trigger workflows based on event
  async triggerWorkflows(event: string, context: any) {
    const workflows = await prisma.workflow.findMany({
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
        const result = await this.executeWorkflow(workflow.id, context);
        results.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          ...result
        });
      } catch (error) {
        results.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
} 