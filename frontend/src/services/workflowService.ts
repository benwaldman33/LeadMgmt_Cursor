import api from './api';

export interface WorkflowStepConfig {
  type: 'action' | 'condition' | 'delay' | 'notification' | 'integration';
  name: string;
  order: number;
  config: any;
}

export interface WorkflowData {
  name: string;
  description?: string;
  trigger: string;
  isActive?: boolean;
  priority?: number;
  steps: WorkflowStepConfig[];
}

export interface WorkflowExecutionResult {
  success: boolean;
  stepResults: any[];
  errorMessage?: string;
}

export interface WorkflowExecution {
  id: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  workflow: {
    id: string;
    name: string;
  };
  lead?: {
    id: string;
    companyName: string;
    status: string;
  };
}

export interface WorkflowStats {
  total: number;
  active: number;
  inactive: number;
  byTrigger: Record<string, number>;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

export class WorkflowService {
  // Get all workflows
  async getWorkflows(filters?: {
    isActive?: boolean;
    trigger?: string;
    createdById?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.isActive !== undefined) {
      params.append('isActive', filters.isActive.toString());
    }
    if (filters?.trigger) {
      params.append('trigger', filters.trigger);
    }
    if (filters?.createdById) {
      params.append('createdById', filters.createdById);
    }

    const response = await api.get(`/workflows?${params.toString()}`);
    return response.data;
  }

  // Get a single workflow by ID
  async getWorkflowById(id: string): Promise<any> {
    const response = await api.get(`/workflows/${id}`);
    return response.data;
  }

  // Create a new workflow
  async createWorkflow(data: WorkflowData): Promise<any> {
    const response = await api.post('/workflows', data);
    return response.data;
  }

  // Update a workflow
  async updateWorkflow(id: string, data: Partial<WorkflowData>): Promise<any> {
    const response = await api.put(`/workflows/${id}`, data);
    return response.data;
  }

  // Delete a workflow
  async deleteWorkflow(id: string): Promise<void> {
    await api.delete(`/workflows/${id}`);
  }

  // Execute a workflow
  async executeWorkflow(id: string, context: {
    leadId?: string;
    triggerData?: any;
  }): Promise<WorkflowExecutionResult> {
    const response = await api.post(`/workflows/${id}/execute`, context);
    return response.data;
  }

  // Get workflow executions
  async getWorkflowExecutions(filters?: {
    workflowId?: string;
    leadId?: string;
    status?: string;
  }): Promise<WorkflowExecution[]> {
    const params = new URLSearchParams();
    if (filters?.workflowId) {
      params.append('workflowId', filters.workflowId);
    }
    if (filters?.leadId) {
      params.append('leadId', filters.leadId);
    }
    if (filters?.status) {
      params.append('status', filters.status);
    }

    const response = await api.get(`/workflows/${filters?.workflowId || 'all'}/executions?${params.toString()}`);
    return response.data;
  }

  // Trigger workflows by event
  async triggerWorkflows(event: string, context: {
    leadId?: string;
    triggerData?: any;
  }): Promise<any[]> {
    const response = await api.post(`/workflows/trigger/${event}`, context);
    return response.data;
  }

  // Get workflow statistics
  async getWorkflowStats(): Promise<WorkflowStats> {
    const response = await api.get('/workflows/stats/overview');
    return response.data;
  }

  // Helper methods for workflow step configuration
  static createActionStep(name: string, order: number, action: string, target: string, value: any): WorkflowStepConfig {
    return {
      type: 'action',
      name,
      order,
      config: { action, target, value }
    };
  }

  static createConditionStep(name: string, order: number, field: string, operator: string, value: any): WorkflowStepConfig {
    return {
      type: 'condition',
      name,
      order,
      config: { field, operator, value }
    };
  }

  static createDelayStep(name: string, order: number, duration: number): WorkflowStepConfig {
    return {
      type: 'delay',
      name,
      order,
      config: { duration }
    };
  }

  static createNotificationStep(name: string, order: number, type: string, message: string, recipients: string[]): WorkflowStepConfig {
    return {
      type: 'notification',
      name,
      order,
      config: { type, message, recipients }
    };
  }

  static createIntegrationStep(name: string, order: number, integrationId: string, action: string, data: any): WorkflowStepConfig {
    return {
      type: 'integration',
      name,
      order,
      config: { integrationId, action, data }
    };
  }

  // Helper methods for common workflow patterns
  static createLeadAssignmentWorkflow(name: string, trigger: string, assignToId: string): WorkflowData {
    return {
      name,
      description: `Automatically assign leads to user ${assignToId}`,
      trigger,
      isActive: true,
      priority: 50,
      steps: [
        this.createActionStep('Assign Lead', 1, 'assign_lead', 'user', assignToId)
      ]
    };
  }

  static createLeadScoringWorkflow(name: string, trigger: string, minScore: number): WorkflowData {
    return {
      name,
      description: `Update lead status based on score threshold of ${minScore}`,
      trigger,
      isActive: true,
      priority: 60,
      steps: [
        this.createConditionStep('Check Score', 1, 'score', 'greater_than', minScore),
        this.createActionStep('Update Status', 2, 'update_lead_status', 'status', 'QUALIFIED')
      ]
    };
  }

  static createLeadEnrichmentWorkflow(name: string, trigger: string): WorkflowData {
    return {
      name,
      description: 'Automatically enrich leads with additional data',
      trigger,
      isActive: true,
      priority: 40,
      steps: [
        this.createActionStep('Trigger Enrichment', 1, 'enrichment', 'trigger', 'auto')
      ]
    };
  }

  // Format workflow execution status
  static formatExecutionStatus(status: string): string {
    switch (status) {
      case 'running':
        return 'Running';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  // Format workflow trigger
  static formatTrigger(trigger: string): string {
    switch (trigger) {
      case 'lead_created':
        return 'Lead Created';
      case 'lead_scored':
        return 'Lead Scored';
      case 'lead_status_changed':
        return 'Lead Status Changed';
      case 'manual':
        return 'Manual';
      default:
        return trigger;
    }
  }

  // Get available triggers
  static getAvailableTriggers(): { value: string; label: string }[] {
    return [
      { value: 'lead_created', label: 'Lead Created' },
      { value: 'lead_scored', label: 'Lead Scored' },
      { value: 'lead_status_changed', label: 'Lead Status Changed' },
      { value: 'manual', label: 'Manual' }
    ];
  }

  // Get available step types
  static getAvailableStepTypes(): { value: string; label: string }[] {
    return [
      { value: 'action', label: 'Action' },
      { value: 'condition', label: 'Condition' },
      { value: 'delay', label: 'Delay' },
      { value: 'notification', label: 'Notification' },
      { value: 'integration', label: 'Integration' }
    ];
  }
} 