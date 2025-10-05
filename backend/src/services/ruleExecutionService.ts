import { PrismaClient } from '@prisma/client';
import { BusinessRuleService, BusinessRuleAction, BusinessRuleCondition } from './businessRuleService';
import { AuditLogService } from './auditLogService';

const prisma = new PrismaClient();
const businessRuleService = new BusinessRuleService();

export interface RuleExecutionResult {
  success: boolean;
  rulesExecuted: number;
  actionsApplied: number;
  errors: string[];
  executionTime: number;
}

export interface RuleExecutionContext {
  triggerEvent: 'created' | 'updated' | 'scored' | 'enriched';
  leadId: string;
  context?: Record<string, any>;
}

export class RuleExecutionService {
  /**
   * Execute all relevant business rules for a lead
   */
  static async executeRulesForLead(
    leadId: string,
    triggerEvent: 'created' | 'updated' | 'scored' | 'enriched',
    context?: Record<string, any>
  ): Promise<RuleExecutionResult> {
    const startTime = Date.now();
    const result: RuleExecutionResult = {
      success: true,
      rulesExecuted: 0,
      actionsApplied: 0,
      errors: [],
      executionTime: 0
    };

    try {
      // Get all active rules that are relevant to this trigger event
      const relevantRules = await this.getRelevantRules(triggerEvent);
      
      if (relevantRules.length === 0) {
        result.executionTime = Date.now() - startTime;
        return result;
      }

      // Get the lead with all related data
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
          },
          campaign: {
            select: { id: true, name: true, scoringModel: true }
          }
        }
      });

      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      // Execute rules in priority order (highest first)
      const sortedRules = relevantRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      for (const rule of sortedRules) {
        try {
          const ruleResult = await this.executeRule(rule, lead, context);
          
          if (ruleResult.matched) {
            result.rulesExecuted++;
            result.actionsApplied += ruleResult.actions.length;
            
            // Apply the actions
            await this.executeActions(leadId, ruleResult.actions);
            
            // Log successful execution
            await this.logRuleExecution(leadId, rule.id, triggerEvent, true);
          }
        } catch (error) {
          const errorMessage = `Rule ${rule.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMessage);
          result.success = false;
          
          // Log failed execution
          await this.logRuleExecution(leadId, rule.id, triggerEvent, false, errorMessage);
          
          console.error(`Business rule execution failed for rule ${rule.id}:`, error);
        }
      }

      result.executionTime = Date.now() - startTime;
      return result;

    } catch (error) {
      result.success = false;
      result.errors.push(`Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.executionTime = Date.now() - startTime;
      
      console.error(`Business rule execution failed for lead ${leadId}:`, error);
      return result;
    }
  }

  /**
   * Get rules that are relevant to a specific trigger event
   */
  private static async getRelevantRules(triggerEvent: string): Promise<any[]> {
    // For now, we'll get all active rules and filter by type
    // In the future, we could add a triggerEvent field to the BusinessRule model
    const allRules = await businessRuleService.getBusinessRules({ isActive: true });
    
    // Filter rules based on trigger event and rule type
    return allRules.filter(rule => {
      const ruleType = rule.type;
      
      switch (triggerEvent) {
        case 'created':
          return ['assignment', 'notification', 'status_change'].includes(ruleType);
        case 'updated':
          return ['assignment', 'notification', 'status_change'].includes(ruleType);
        case 'scored':
          return ['assignment', 'notification', 'status_change', 'scoring'].includes(ruleType);
        case 'enriched':
          return ['assignment', 'notification', 'status_change', 'enrichment'].includes(ruleType);
        default:
          return false;
      }
    });
  }

  /**
   * Execute a single rule against a lead
   */
  private static async executeRule(
    rule: any,
    lead: any,
    context?: Record<string, any>
  ): Promise<{ matched: boolean; actions: BusinessRuleAction[] }> {
    const conditions = JSON.parse(rule.conditions) as BusinessRuleCondition[];
    const actions = JSON.parse(rule.actions) as BusinessRuleAction[];

    const matched = this.evaluateConditions(conditions, lead, context);
    
    return {
      matched,
      actions: matched ? actions : []
    };
  }

  /**
   * Evaluate conditions against lead data
   */
  private static evaluateConditions(
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

  /**
   * Evaluate a single condition
   */
  private static evaluateCondition(
    condition: BusinessRuleCondition,
    lead: any,
    context?: Record<string, any>
  ): boolean {
    const { field, operator, value } = condition;
    
    let actualValue: any;
    
    // Get value from lead data
    switch (field) {
      case 'score':
        actualValue = lead.score || lead.scoringDetails?.totalScore;
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
      case 'confidence':
        actualValue = lead.scoringDetails?.confidence;
        break;
      case 'companySize':
        actualValue = lead.enrichment?.companySize;
        break;
      case 'revenue':
        actualValue = lead.enrichment?.revenue;
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

  /**
   * Execute actions for a lead
   */
  private static async executeActions(leadId: string, actions: BusinessRuleAction[]): Promise<void> {
    for (const action of actions) {
      await this.executeAction(leadId, action);
    }
  }

  /**
   * Execute a single action
   */
  private static async executeAction(leadId: string, action: BusinessRuleAction): Promise<void> {
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
        console.log(`[BUSINESS_RULE_NOTIFICATION] ${target}: ${value}`, { metadata, leadId });
        break;

      case 'enrichment':
        // In a real implementation, this would trigger enrichment
        console.log(`[BUSINESS_RULE_ENRICHMENT] ${target}: ${value}`, { metadata, leadId });
        break;

      default:
        console.warn(`Unknown action type: ${type}`);
    }
  }

  /**
   * Log rule execution result
   */
  private static async logRuleExecution(
    leadId: string,
    ruleId: string,
    triggerEvent: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.ruleExecutionLog.create({
        data: {
          leadId,
          ruleId,
          triggerEvent,
          success,
          errorMessage
        }
      });
    } catch (error) {
      console.error('Failed to log rule execution:', error);
    }
  }

  /**
   * Get rule execution history for a lead
   */
  static async getRuleExecutionsForLead(leadId: string): Promise<any[]> {
    return await prisma.ruleExecutionLog.findMany({
      where: { leadId },
      include: {
        rule: {
          select: { id: true, name: true, type: true }
        }
      },
      orderBy: { executedAt: 'desc' }
    });
  }

  /**
   * Get rule execution statistics
   */
  static async getRuleExecutionStats(ruleId?: string): Promise<any> {
    const where = ruleId ? { ruleId } : {};
    
    const [total, successful, failed] = await Promise.all([
      prisma.ruleExecutionLog.count({ where }),
      prisma.ruleExecutionLog.count({ where: { ...where, success: true } }),
      prisma.ruleExecutionLog.count({ where: { ...where, success: false } })
    ]);

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0
    };
  }
}
