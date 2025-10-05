import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { BusinessRuleService } from '../services/businessRuleService';
import type { BusinessRuleData, BusinessRuleCondition, BusinessRuleAction } from '../services/businessRuleService';
import { useNotifications } from '../contexts/NotificationContext';
import {
  PlusIcon,
  TrashIcon,
  ShieldCheckIcon,
  CheckIcon,
  XMarkIcon,
  UserIcon,
  BellIcon,
  ChartBarIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

const CreateBusinessRulePage: React.FC = () => {
  alert('CreateBusinessRulePage Component Loading!');
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const [rule, setRule] = useState<BusinessRuleData>({
    name: '',
    description: '',
    type: '',
    conditions: [],
    actions: [],
    isActive: true,
    priority: 50,
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: BusinessRuleData) => BusinessRuleService.createBusinessRule(data),
    onSuccess: () => {
      showNotification('Business rule created successfully', 'success');
      navigate('/business-rules');
    },
    onError: (error: any) => {
      console.error('Create rule mutation error:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to create business rule';
      showNotification(errorMessage, 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== FORM SUBMIT DEBUG ===');
    console.log('Form submitted with rule data:', rule);
    console.log('Rule validation checks:', {
      hasName: !!rule.name,
      hasType: !!rule.type,
      conditionsCount: rule.conditions.length,
      actionsCount: rule.actions.length,
      ruleName: rule.name,
      ruleType: rule.type
    });
    
    if (!rule.name || !rule.type || rule.conditions.length === 0 || rule.actions.length === 0) {
      console.log('Validation failed, showing error notification');
      showNotification('Please fill in all required fields and add at least one condition and action', 'error');
      return;
    }
    
    console.log('Validation passed, calling createRuleMutation.mutate with:', rule);
    try {
      createRuleMutation.mutate(rule);
      console.log('Mutation triggered successfully');
    } catch (error) {
      console.error('Error triggering mutation:', error);
    }
    console.log('=== END FORM SUBMIT DEBUG ===');
  };

  const addCondition = () => {
    const newCondition: BusinessRuleCondition = {
      field: '',
      operator: 'equals',
      value: '',
      logicalOperator: 'AND',
    };
    setRule({
      ...rule,
      conditions: [...rule.conditions, newCondition],
    });
  };

  const updateCondition = (index: number, updates: Partial<BusinessRuleCondition>) => {
    const updatedConditions = [...rule.conditions];
    updatedConditions[index] = { ...updatedConditions[index], ...updates };
    setRule({ ...rule, conditions: updatedConditions });
  };

  const removeCondition = (index: number) => {
    const updatedConditions = rule.conditions.filter((_, i) => i !== index);
    setRule({ ...rule, conditions: updatedConditions });
  };

  const addAction = () => {
    const newAction: BusinessRuleAction = {
      type: 'assignment',
      target: '',
      value: '',
    };
    setRule({
      ...rule,
      actions: [...rule.actions, newAction],
    });
  };

  const updateAction = (index: number, updates: Partial<BusinessRuleAction>) => {
    const updatedActions = [...rule.actions];
    updatedActions[index] = { ...updatedActions[index], ...updates };
    setRule({ ...rule, actions: updatedActions });
  };

  const removeAction = (index: number) => {
    const updatedActions = rule.actions.filter((_, i) => i !== index);
    setRule({ ...rule, actions: updatedActions });
  };

  const actionTypes = [
    { type: 'assignment', label: 'Assignment', icon: UserIcon, description: 'Assign lead to user/team' },
    { type: 'scoring', label: 'Scoring', icon: ChartBarIcon, description: 'Update lead score' },
    { type: 'notification', label: 'Notification', icon: BellIcon, description: 'Send notification' },
    { type: 'status_change', label: 'Status Change', icon: CogIcon, description: 'Change lead status' },
    { type: 'enrichment', label: 'Enrichment', icon: ShieldCheckIcon, description: 'Trigger enrichment' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Business Rule</h1>
          <p className="text-gray-600">Define automated rules for lead processing</p>
        </div>
        <button
          onClick={() => navigate('/business-rules')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Name *
              </label>
              <input
                type="text"
                value={rule.name}
                onChange={(e) => setRule({ ...rule, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter rule name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Type *
              </label>
              <select
                value={rule.type}
                onChange={(e) => setRule({ ...rule, type: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select rule type</option>
                {BusinessRuleService.getAvailableActionTypes().map(type => (
                  <option key={type.value} value={type.value}>
                    {BusinessRuleService.formatRuleType(type.value)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={rule.description}
                onChange={(e) => setRule({ ...rule, description: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Describe what this rule does"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={rule.priority}
                onChange={(e) => setRule({ ...rule, priority: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={10}>Low (10)</option>
                <option value={30}>Medium-Low (30)</option>
                <option value={50}>Medium (50)</option>
                <option value={70}>Medium-High (70)</option>
                <option value={90}>High (90)</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rule.isActive}
                onChange={(e) => setRule({ ...rule, isActive: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>

        {/* Conditions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Conditions</h3>
            <button
              type="button"
              onClick={addCondition}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Condition
            </button>
          </div>

          {rule.conditions.length === 0 ? (
            <div className="text-center py-8">
              <CheckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No conditions added</h3>
              <p className="mt-1 text-sm text-gray-500">Add conditions to define when this rule applies</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rule.conditions.map((condition, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-900">Condition {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeCondition(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Field
                      </label>
                      <select
                        value={condition.field}
                        onChange={(e) => updateCondition(index, { field: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select field</option>
                        {BusinessRuleService.getAvailableFields().map(field => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Operator
                      </label>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {BusinessRuleService.getAvailableOperators().map(op => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Value
                      </label>
                      <input
                        type="text"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, { value: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Condition value"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Logic
                      </label>
                      <select
                        value={condition.logicalOperator || 'AND'}
                        onChange={(e) => updateCondition(index, { logicalOperator: e.target.value as 'AND' | 'OR' })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Actions</h3>
            <div className="flex space-x-2">
              {actionTypes.map((actionType) => (
                <button
                  key={actionType.type}
                  type="button"
                  onClick={() => {
                    const newAction: BusinessRuleAction = {
                      type: actionType.type as any,
                      target: '',
                      value: '',
                    };
                    setRule({
                      ...rule,
                      actions: [...rule.actions, newAction],
                    });
                  }}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  title={actionType.description}
                >
                  <actionType.icon className="h-4 w-4 mr-1" />
                  {actionType.label}
                </button>
              ))}
            </div>
          </div>

          {rule.actions.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No actions added</h3>
              <p className="mt-1 text-sm text-gray-500">Add actions to define what happens when conditions are met</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rule.actions.map((action, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">Action {index + 1}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {BusinessRuleService.formatRuleType(action.type)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAction(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target
                      </label>
                      <input
                        type="text"
                        value={action.target}
                        onChange={(e) => updateAction(index, { target: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Action target"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Value
                      </label>
                      <input
                        type="text"
                        value={action.value}
                        onChange={(e) => updateAction(index, { value: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Action value"
                      />
                    </div>
                  </div>

                  {action.type === 'notification' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipients (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={action.metadata?.recipients?.join(', ') || ''}
                        onChange={(e) => updateAction(index, { 
                          metadata: { 
                            ...action.metadata, 
                            recipients: e.target.value.split(',').map(r => r.trim()).filter(r => r) 
                          } 
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="email1@example.com, email2@example.com"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/business-rules')}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createRuleMutation.isPending}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            onClick={(e) => {
              console.log('🔴 Create Rule button clicked!');
              console.log('Rule data:', rule);
              console.log('Button disabled?', createRuleMutation.isPending);
              // Manual form submission
              handleSubmit(e as any);
            }}
          >
            {createRuleMutation.isPending ? 'Creating...' : 'Create Rule'}
          </button>
          
        </div>
      </form>
    </div>
  );
};

export default CreateBusinessRulePage; 