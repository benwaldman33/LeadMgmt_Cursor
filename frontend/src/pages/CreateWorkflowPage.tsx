import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { WorkflowService, WorkflowData, WorkflowStepConfig } from '../services/workflowService';
import { useNotification } from '../contexts/NotificationContext';
import {
  PlusIcon,
  TrashIcon,
  CogIcon,
  PlayIcon,
  ClockIcon,
  BellIcon,
  PuzzlePieceIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const CreateWorkflowPage: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [workflow, setWorkflow] = useState<WorkflowData>({
    name: '',
    description: '',
    trigger: '',
    isActive: true,
    priority: 50,
    steps: [],
  });

  const createWorkflowMutation = useMutation({
    mutationFn: (data: WorkflowData) => WorkflowService.createWorkflow(data),
    onSuccess: () => {
      showNotification('Workflow created successfully', 'success');
      navigate('/workflows');
    },
    onError: (error: any) => {
      showNotification(error.response?.data?.message || 'Failed to create workflow', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflow.name || !workflow.trigger) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }
    createWorkflowMutation.mutate(workflow);
  };

  const addStep = (type: string) => {
    const newStep: WorkflowStepConfig = {
      type: type as any,
      name: `Step ${workflow.steps.length + 1}`,
      order: workflow.steps.length + 1,
      config: {},
    };
    setWorkflow({
      ...workflow,
      steps: [...workflow.steps, newStep],
    });
  };

  const updateStep = (index: number, updates: Partial<WorkflowStepConfig>) => {
    const updatedSteps = [...workflow.steps];
    updatedSteps[index] = { ...updatedSteps[index], ...updates };
    setWorkflow({ ...workflow, steps: updatedSteps });
  };

  const removeStep = (index: number) => {
    const updatedSteps = workflow.steps.filter((_, i) => i !== index);
    // Reorder steps
    updatedSteps.forEach((step, i) => {
      step.order = i + 1;
    });
    setWorkflow({ ...workflow, steps: updatedSteps });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === workflow.steps.length - 1)
    ) {
      return;
    }

    const updatedSteps = [...workflow.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updatedSteps[index], updatedSteps[targetIndex]] = [updatedSteps[targetIndex], updatedSteps[index]];
    
    // Update order
    updatedSteps.forEach((step, i) => {
      step.order = i + 1;
    });

    setWorkflow({ ...workflow, steps: updatedSteps });
  };

  const stepTypes = [
    { type: 'action', label: 'Action', icon: PlayIcon, description: 'Perform an action' },
    { type: 'condition', label: 'Condition', icon: CheckIcon, description: 'Check a condition' },
    { type: 'delay', label: 'Delay', icon: ClockIcon, description: 'Wait for a period' },
    { type: 'notification', label: 'Notification', icon: BellIcon, description: 'Send a notification' },
    { type: 'integration', label: 'Integration', icon: PuzzlePieceIcon, description: 'Call external service' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Workflow</h1>
          <p className="text-gray-600">Build automated workflows to process leads</p>
        </div>
        <button
          onClick={() => navigate('/workflows')}
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
                Workflow Name *
              </label>
              <input
                type="text"
                value={workflow.name}
                onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter workflow name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger *
              </label>
              <select
                value={workflow.trigger}
                onChange={(e) => setWorkflow({ ...workflow, trigger: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select a trigger</option>
                {WorkflowService.getAvailableTriggers().map(trigger => (
                  <option key={trigger.value} value={trigger.value}>
                    {trigger.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={workflow.description}
                onChange={(e) => setWorkflow({ ...workflow, description: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Describe what this workflow does"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={workflow.priority}
                onChange={(e) => setWorkflow({ ...workflow, priority: parseInt(e.target.value) })}
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
                checked={workflow.isActive}
                onChange={(e) => setWorkflow({ ...workflow, isActive: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Workflow Steps</h3>
            <div className="flex space-x-2">
              {stepTypes.map((stepType) => (
                <button
                  key={stepType.type}
                  type="button"
                  onClick={() => addStep(stepType.type)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  title={stepType.description}
                >
                  <stepType.icon className="h-4 w-4 mr-1" />
                  {stepType.label}
                </button>
              ))}
            </div>
          </div>

          {workflow.steps.length === 0 ? (
            <div className="text-center py-8">
              <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No steps added</h3>
              <p className="mt-1 text-sm text-gray-500">Add steps to build your workflow</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workflow.steps.map((step, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Step {step.order}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{step.name}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {step.type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => moveStep(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(index, 'down')}
                        disabled={index === workflow.steps.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Step Configuration */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Step Name
                      </label>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => updateStep(index, { name: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter step name"
                      />
                    </div>

                    {/* Step-specific configuration */}
                    {step.type === 'action' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Action
                          </label>
                          <select
                            value={step.config.action || ''}
                            onChange={(e) => updateStep(index, { config: { ...step.config, action: e.target.value } })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select action</option>
                            <option value="assign_lead">Assign Lead</option>
                            <option value="change_status">Change Status</option>
                            <option value="update_score">Update Score</option>
                            <option value="send_email">Send Email</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Target
                          </label>
                          <input
                            type="text"
                            value={step.config.target || ''}
                            onChange={(e) => updateStep(index, { config: { ...step.config, target: e.target.value } })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Target field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Value
                          </label>
                          <input
                            type="text"
                            value={step.config.value || ''}
                            onChange={(e) => updateStep(index, { config: { ...step.config, value: e.target.value } })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Action value"
                          />
                        </div>
                      </div>
                    )}

                    {step.type === 'condition' && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Field
                          </label>
                          <select
                            value={step.config.field || ''}
                            onChange={(e) => updateStep(index, { config: { ...step.config, field: e.target.value } })}
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
                            value={step.config.operator || ''}
                            onChange={(e) => updateStep(index, { config: { ...step.config, operator: e.target.value } })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select operator</option>
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
                            value={step.config.value || ''}
                            onChange={(e) => updateStep(index, { config: { ...step.config, value: e.target.value } })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Condition value"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Logic
                          </label>
                          <select
                            value={step.config.logicalOperator || 'AND'}
                            onChange={(e) => updateStep(index, { config: { ...step.config, logicalOperator: e.target.value } })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {step.type === 'delay' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={step.config.duration || ''}
                          onChange={(e) => updateStep(index, { config: { ...step.config, duration: parseInt(e.target.value) } })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Delay in minutes"
                          min="1"
                        />
                      </div>
                    )}

                    {step.type === 'notification' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type
                          </label>
                          <select
                            value={step.config.type || ''}
                            onChange={(e) => updateStep(index, { config: { ...step.config, type: e.target.value } })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select type</option>
                            <option value="email">Email</option>
                            <option value="sms">SMS</option>
                            <option value="in_app">In-App</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Message
                          </label>
                          <input
                            type="text"
                            value={step.config.message || ''}
                            onChange={(e) => updateStep(index, { config: { ...step.config, message: e.target.value } })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Notification message"
                          />
                        </div>
                      </div>
                    )}

                    {step.type === 'integration' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Integration ID
                          </label>
                          <input
                            type="text"
                            value={step.config.integrationId || ''}
                            onChange={(e) => updateStep(index, { config: { ...step.config, integrationId: e.target.value } })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Integration ID"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Action
                          </label>
                          <input
                            type="text"
                            value={step.config.action || ''}
                            onChange={(e) => updateStep(index, { config: { ...step.config, action: e.target.value } })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Integration action"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data
                          </label>
                          <input
                            type="text"
                            value={step.config.data || ''}
                            onChange={(e) => updateStep(index, { config: { ...step.config, data: e.target.value } })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Integration data"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/workflows')}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createWorkflowMutation.isPending}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {createWorkflowMutation.isPending ? 'Creating...' : 'Create Workflow'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateWorkflowPage; 