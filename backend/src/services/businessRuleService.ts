import { PrismaClient } from '@prisma/client';
import { AuditLogService } from './auditLogService';

const prisma = new PrismaClient();

export interface BusinessRuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface BusinessRuleAction {
  type: 'assignment' | 'scoring' | 'notification' | 'status_change' | 'enrichment';
  target: string;
  value: any;
  metadata?: Record<string, any>;
}

export interface BusinessRuleData {
  name: string;
  description?: string;
  type: string;
  conditions: BusinessRuleCondition[];
  actions: BusinessRuleAction[];
  isActive?: boolean;
  priority?: number;
  createdById: string;
}

export interface RuleEvaluationResult {
  matched: boolean;
  actions: BusinessRuleAction[];
  conditions: BusinessRuleCondition[];
}

export class BusinessRuleService {
  // Create a new business rule
  async createBusinessRule(data: BusinessRuleData) {
    const businessRule = await prisma.businessRule.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        conditions: JSON.stringify(data.conditions),
        actions: JSON.stringify(data.actions),
        isActive: data.isActive ?? true,
        priority: data.priority ?? 0,
        createdById: data.createdById
      },
      include: {
        createdBy: {
          select: { id: true, email: true, fullName: true }
        }
      }
    });

    await AuditLogService.logActivity({
      action: 'CREATE',
      entityType: 'BUSINESS_RULE',
      entityId: businessRule.id,
      userId: data.createdById,
      description: `Created business rule: ${businessRule.name}`
    });

    return businessRule;
  }

  // Get all business rules with optional filters
  async getBusinessRules(filters?: {
    isActive?: boolean;
    type?: string;
    createdById?: string;
  }) {
    return await prisma.businessRule.findMany({
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
  }

  // Get a single business rule by ID
  async getBusinessRuleById(id: string) {
    return await prisma.businessRule.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, email: true, fullName: true }
        }
      }
    });
  }

  // Update a business rule
  async updateBusinessRule(id: string, data: {
    name?: string;
    description?: string;
    type?: string;
    conditions?: BusinessRuleCondition[];
    actions?: BusinessRuleAction[];
    isActive?: boolean;
    priority?: number;
  }) {
    const businessRule = await prisma.businessRule.update({
      where: { id },
      data: {
        ...data,
        ...(data.conditions && { conditions: JSON.stringify(data.conditions) }),
        ...(data.actions && { actions: JSON.stringify(data.actions) })
      },
      include: {
        createdBy: {
          select: { id: true, email: true, fullName: true }
        }
      }
    });

    await AuditLogService.logActivity({
      action: 'UPDATE',
      entityType: 'BUSINESS_RULE',
      entityId: id,
      description: `Updated business rule: ${businessRule.name}`
    });

    return businessRule;
  }

  // Delete a business rule
  async deleteBusinessRule(id: string, userId: string) {
    const businessRule = await prisma.businessRule.delete({
      where: { id }
    });

    await AuditLogService.logActivity({
      action: 'DELETE',
      entityType: 'BUSINESS_RULE',
      entityId: id,
      userId,
      description: `Deleted business rule: ${businessRule.name}`
    });

    return businessRule;
  }

  // Evaluate business rules against a lead
  async evaluateRules(leadId: string, context?: Record<string, any>): Promise<RuleEvaluationResult[]> {
    const lead = await prisma.lead.findUnique({
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

    const businessRules = await this.getBusinessRules({ isActive: true });
    const results: RuleEvaluationResult[] = [];

    for (const rule of businessRules) {
      const conditions = JSON.parse(rule.conditions) as BusinessRuleCondition[];
      const actions = JSON.parse(rule.actions) as BusinessRuleAction[];

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
  }

  // Evaluate conditions against lead data
  private evaluateConditions(
    conditions: BusinessRuleCondition[],
    lead: any,
    context?: Record<string, any>
  ): boolean {
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
      } else {
        if (logicalOperator === 'AND') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
        logicalOperator = condition.logicalOperator || logicalOperator;
      }
    }

    return result;
  }

  // Evaluate a single condition
  private evaluateCondition(
    condition: BusinessRuleCondition,
    lead: any,
    context?: Record<string, any>
  ): boolean {
    const { field, operator, value } = condition;
    
    let actualValue: any;
    
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
        actualValue = lead.assignedTo?.id;
        break;
      case 'assignedTeam':
        actualValue = lead.assignedTeam?.id;
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
        actualValue = context?.[field];
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
  async applyRuleActions(leadId: string, actions: BusinessRuleAction[]): Promise<void> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    for (const action of actions) {
      await this.applyAction(leadId, action);
    }
  }

  // Apply a single action
  private async applyAction(leadId: string, action: BusinessRuleAction): Promise<void> {
    const { type, target, value, metadata } = action;

    switch (type) {
      case 'assignment':
        if (target === 'user') {
          await prisma.lead.update({
            where: { id: leadId },
            data: { assignedToId: value }
          });
        } else if (target === 'team') {
          await prisma.lead.update({
            where: { id: leadId },
            data: { assignedTeamId: value }
          });
        }
        break;

      case 'status_change':
        await prisma.lead.update({
          where: { id: leadId },
          data: { status: value }
        });
        break;

      case 'scoring':
        await prisma.lead.update({
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
  }

  // Get business rule statistics
  async getBusinessRuleStats() {
    const [totalRules, activeRules, ruleTypes] = await Promise.all([
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
  }

  // Test business rule evaluation
  async testRuleEvaluation(ruleId: string, testData: any): Promise<{
    matched: boolean;
    actions: BusinessRuleAction[];
    conditions: BusinessRuleCondition[];
  }> {
    const rule = await this.getBusinessRuleById(ruleId);
    if (!rule) {
      throw new Error('Business rule not found');
    }

    const conditions = JSON.parse(rule.conditions) as BusinessRuleCondition[];
    const actions = JSON.parse(rule.actions) as BusinessRuleAction[];

    const matched = this.evaluateConditions(conditions, testData);

    return {
      matched,
      actions: matched ? actions : [],
      conditions
    };
  }

  // Get business rules by type
  async getBusinessRulesByType(type: string): Promise<any[]> {
    return await this.getBusinessRules({ type, isActive: true });
  }

  // Bulk apply business rules to leads
  async bulkApplyRules(leadIds: string[], context?: Record<string, any>) {
    const results = [];

    for (const leadId of leadIds) {
      try {
        const ruleResults = await this.evaluateRules(leadId, context);
        const allActions = ruleResults.flatMap(result => result.actions);
        
        if (allActions.length > 0) {
          await this.applyRuleActions(leadId, allActions);
        }

        results.push({
          leadId,
          success: true,
          rulesMatched: ruleResults.length,
          actionsApplied: allActions.length
        });
      } catch (error) {
        results.push({
          leadId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
} 