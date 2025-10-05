import api from './api';

export interface BusinessRuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: string | number | boolean;
  logicalOperator?: 'AND' | 'OR';
}

export interface BusinessRuleAction {
  type: 'assignment' | 'scoring' | 'notification' | 'status_change' | 'enrichment';
  target: string;
  value: string | number | boolean;
  metadata?: Record<string, unknown>;
}

export interface BusinessRuleData {
  name: string;
  description?: string;
  type: string;
  conditions: BusinessRuleCondition[];
  actions: BusinessRuleAction[];
  isActive?: boolean;
  priority?: number;
  createdById?: string; // Optional in frontend, added by backend
}

export interface RuleEvaluationResult {
  matched: boolean;
  actions: BusinessRuleAction[];
  conditions: BusinessRuleCondition[];
}

export interface BusinessRuleStats {
  totalRules: number;
  activeRules: number;
  inactiveRules: number;
  ruleTypes: Array<{
    type: string;
    count: number;
  }>;
}

interface BusinessRule {
  id: string;
  name: string;
  description?: string;
  type: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: string | number | boolean;
  }>;
  actions: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface BusinessRuleFilters {
  type?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export class BusinessRuleService {
  // Get all business rules
  async getBusinessRules(filters?: {
    isActive?: boolean;
    type?: string;
    createdById?: string;
  }): Promise<BusinessRule[]> {
    const params = new URLSearchParams();
    if (filters?.isActive !== undefined) {
      params.append('isActive', filters.isActive.toString());
    }
    if (filters?.type) {
      params.append('type', filters.type);
    }
    if (filters?.createdById) {
      params.append('createdById', filters.createdById);
    }

    const response = await api.get(`/business-rules?${params.toString()}`);
    return response.data;
  }

  // Get a single business rule by ID
  async getBusinessRuleById(id: string): Promise<BusinessRule> {
    const response = await api.get(`/business-rules/${id}`);
    return response.data;
  }

  // Create a new business rule
  async createBusinessRule(data: BusinessRuleData): Promise<BusinessRule> {
    console.log('Creating business rule with data:', data);
    try {
      const response = await api.post('/business-rules', data);
      console.log('Business rule creation response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Business rule creation error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Update a business rule
  async updateBusinessRule(id: string, data: Partial<BusinessRuleData>): Promise<BusinessRule> {
    const response = await api.put(`/business-rules/${id}`, data);
    return response.data;
  }

  // Delete a business rule
  async deleteBusinessRule(id: string): Promise<void> {
    await api.delete(`/business-rules/${id}`);
  }

  // Evaluate business rules for a lead
  async evaluateRules(leadId: string, context?: Record<string, unknown>): Promise<RuleEvaluationResult[]> {
    const response = await api.post(`/business-rules/evaluate/${leadId}`, { context });
    return response.data;
  }

  // Apply business rule actions to a lead
  async applyRuleActions(leadId: string, actions: BusinessRuleAction[]): Promise<void> {
    await api.post(`/business-rules/apply/${leadId}`, { actions });
  }

  // Test business rule evaluation
  async testRuleEvaluation(ruleId: string, testData: Record<string, unknown>): Promise<{
    matched: boolean;
    actions: BusinessRuleAction[];
    conditions: BusinessRuleCondition[];
  }> {
    const response = await api.post(`/business-rules/${ruleId}/test`, { testData });
    return response.data;
  }

  // Get business rules by type
  async getBusinessRulesByType(type: string): Promise<BusinessRule[]> {
    const response = await api.get(`/business-rules/type/${type}`);
    return response.data;
  }

  // Bulk apply business rules to leads
  async bulkApplyRules(leadIds: string[], context?: Record<string, unknown>): Promise<RuleEvaluationResult[]> {
    const response = await api.post('/business-rules/bulk-apply', { leadIds, context });
    return response.data;
  }

  // Get business rule statistics
  async getBusinessRuleStats(): Promise<BusinessRuleStats> {
    const response = await api.get('/business-rules/stats/overview');
    return response.data;
  }

  // Helper methods for business rule creation
  static createAssignmentRule(name: string, conditions: BusinessRuleCondition[], assignToId: string): BusinessRuleData {
    return {
      name,
      description: `Automatically assign leads to user ${assignToId}`,
      type: 'assignment',
      conditions,
      actions: [{
        type: 'assignment',
        target: 'user',
        value: assignToId
      }],
      isActive: true,
      priority: 50
    };
  }

  static createStatusChangeRule(name: string, conditions: BusinessRuleCondition[], newStatus: string): BusinessRuleData {
    return {
      name,
      description: `Change lead status to ${newStatus}`,
      type: 'status_change',
      conditions,
      actions: [{
        type: 'status_change',
        target: 'status',
        value: newStatus
      }],
      isActive: true,
      priority: 60
    };
  }

  static createScoringRule(name: string, conditions: BusinessRuleCondition[], score: number): BusinessRuleData {
    return {
      name,
      description: `Set lead score to ${score}`,
      type: 'scoring',
      conditions,
      actions: [{
        type: 'scoring',
        target: 'score',
        value: score
      }],
      isActive: true,
      priority: 70
    };
  }

  static createNotificationRule(name: string, conditions: BusinessRuleCondition[], message: string, recipients: string[]): BusinessRuleData {
    return {
      name,
      description: `Send notification: ${message}`,
      type: 'notification',
      conditions,
      actions: [{
        type: 'notification',
        target: 'email',
        value: message,
        metadata: { recipients }
      }],
      isActive: true,
      priority: 40
    };
  }

  static createEnrichmentRule(name: string, conditions: BusinessRuleCondition[]): BusinessRuleData {
    return {
      name,
      description: 'Trigger lead enrichment',
      type: 'enrichment',
      conditions,
      actions: [{
        type: 'enrichment',
        target: 'trigger',
        value: 'auto'
      }],
      isActive: true,
      priority: 30
    };
  }

  // Helper methods for condition creation
  static createCondition(field: string, operator: string, value: string | number | boolean, logicalOperator?: 'AND' | 'OR'): BusinessRuleCondition {
    return {
      field,
      operator: operator as any,
      value,
      logicalOperator
    };
  }

  // Get available fields for conditions
  static getAvailableFields(): { value: string; label: string }[] {
    return [
      { value: 'score', label: 'Lead Score' },
      { value: 'status', label: 'Lead Status' },
      { value: 'industry', label: 'Industry' },
      { value: 'companyName', label: 'Company Name' },
      { value: 'domain', label: 'Domain' },
      { value: 'assignedTo', label: 'Assigned To' },
      { value: 'assignedTeam', label: 'Assigned Team' },
      { value: 'campaignId', label: 'Campaign' }
    ];
  }

  // Get available operators
  static getAvailableOperators(): { value: string; label: string }[] {
    return [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
      { value: 'greater_than', label: 'Greater Than' },
      { value: 'less_than', label: 'Less Than' },
      { value: 'contains', label: 'Contains' },
      { value: 'in', label: 'In' },
      { value: 'not_in', label: 'Not In' }
    ];
  }

  // Get available action types
  static getAvailableActionTypes(): { value: string; label: string }[] {
    return [
      { value: 'assignment', label: 'Assignment' },
      { value: 'scoring', label: 'Scoring' },
      { value: 'notification', label: 'Notification' },
      { value: 'status_change', label: 'Status Change' },
      { value: 'enrichment', label: 'Enrichment' }
    ];
  }

  // Format business rule type
  static formatRuleType(type: string): string {
    switch (type) {
      case 'assignment':
        return 'Assignment';
      case 'scoring':
        return 'Scoring';
      case 'notification':
        return 'Notification';
      case 'status_change':
        return 'Status Change';
      case 'enrichment':
        return 'Enrichment';
      default:
        return type;
    }
  }

  // Format field name
  static formatFieldName(field: string): string {
    switch (field) {
      case 'score':
        return 'Lead Score';
      case 'status':
        return 'Lead Status';
      case 'industry':
        return 'Industry';
      case 'companyName':
        return 'Company Name';
      case 'domain':
        return 'Domain';
      case 'assignedTo':
        return 'Assigned To';
      case 'assignedTeam':
        return 'Assigned Team';
      case 'campaignId':
        return 'Campaign';
      default:
        return field;
    }
  }

  // Format operator
  static formatOperator(operator: string): string {
    switch (operator) {
      case 'equals':
        return 'Equals';
      case 'not_equals':
        return 'Not Equals';
      case 'greater_than':
        return 'Greater Than';
      case 'less_than':
        return 'Less Than';
      case 'contains':
        return 'Contains';
      case 'in':
        return 'In';
      case 'not_in':
        return 'Not In';
      default:
        return operator;
    }
  }
} 