import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { WorkflowService } from '../services/workflowService';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PlayIcon,
  UserIcon,
  CalendarIcon,
  CogIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const WorkflowExecutionDetailPage: React.FC = () => {
  const { executionId } = useParams<{ executionId: string }>();

  const { data: execution, isLoading, error } = useQuery({
    queryKey: ['workflow-execution', executionId],
    queryFn: () => WorkflowService.getWorkflowExecutionById(executionId!),
    enabled: !!executionId,
  });

  const formatDuration = (startedAt: string, completedAt?: string) => {
    if (!completedAt) return 'Running...';
    
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const duration = end.getTime() - start.getTime();
    
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'running':
        return <PlayIcon className="h-5 w-5 text-blue-500" />;
      case 'cancelled':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStepStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-red-500" />
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Loading execution details...</p>
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div className="text-center py-12">
        <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading execution</h3>
        <p className="mt-1 text-sm text-gray-500">Please try again later.</p>
      </div>
    );
  }

  const stepResults = execution.stepResults ? JSON.parse(execution.stepResults) : [];
  const executionContext = execution.executionContext ? JSON.parse(execution.executionContext) : {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/workflows/executions"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Executions
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Execution Details
            </h1>
            <p className="text-gray-600">
              {execution.workflow.name} - {execution.id}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon(execution.status)}
          <span className="text-sm font-medium text-gray-900">
            {WorkflowService.formatExecutionStatus(execution.status)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Execution Overview */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Execution Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Workflow</label>
                <p className="mt-1 text-sm text-gray-900">{execution.workflow.name}</p>
                {execution.workflow.description && (
                  <p className="mt-1 text-sm text-gray-500">{execution.workflow.description}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Lead</label>
                {execution.lead ? (
                  <div>
                    <p className="mt-1 text-sm text-gray-900">{execution.lead.companyName}</p>
                    <p className="mt-1 text-sm text-gray-500">Status: {execution.lead.status}</p>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">No lead associated</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Started</label>
                <div className="flex items-center mt-1">
                  <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-900">
                      {new Date(execution.startedAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(execution.startedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDuration(execution.startedAt, execution.completedAt)}
                </p>
              </div>
              {execution.completedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Completed</label>
                  <div className="flex items-center mt-1">
                    <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-900">
                        {new Date(execution.completedAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(execution.completedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Triggered By</label>
                {execution.triggeredBy ? (
                  <div className="flex items-center mt-1">
                    <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-900">{execution.triggeredBy.fullName}</p>
                      <p className="text-sm text-gray-500">{execution.triggeredBy.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">System</p>
                )}
              </div>
            </div>
          </div>

          {/* Step Results */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Step Results</h3>
            {stepResults.length === 0 ? (
              <div className="text-center py-8">
                <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No step results</h3>
                <p className="mt-1 text-sm text-gray-500">No step execution data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stepResults.map((step: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getStepStatusIcon(step.success)}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            Step {index + 1}: {step.stepName}
                          </h4>
                          <p className="text-sm text-gray-500">Type: {step.stepType}</p>
                        </div>
                      </div>
                    </div>
                    
                    {step.success ? (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <div className="flex">
                          <InformationCircleIcon className="h-5 w-5 text-green-400" />
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-green-800">Success</h3>
                            {step.result && (
                              <div className="mt-2 text-sm text-green-700">
                                <pre className="whitespace-pre-wrap">{JSON.stringify(step.result, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="flex">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Failed</h3>
                            {step.error && (
                              <div className="mt-2 text-sm text-red-700">
                                <p>{step.error}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Error Details */}
          {execution.errorMessage && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Error Details</h3>
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Execution Failed</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{execution.errorMessage}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Execution Context */}
          {executionContext && Object.keys(executionContext).length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Execution Context</h3>
              <div className="space-y-3">
                {executionContext.workflowName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Workflow Name</label>
                    <p className="mt-1 text-sm text-gray-900">{executionContext.workflowName}</p>
                  </div>
                )}
                {executionContext.trigger && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Trigger</label>
                    <p className="mt-1 text-sm text-gray-900">{executionContext.trigger}</p>
                  </div>
                )}
                {executionContext.timestamp && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(executionContext.timestamp).toLocaleString()}
                    </p>
                  </div>
                )}
                {executionContext.context && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Context Data</label>
                    <div className="mt-1 text-sm text-gray-900">
                      <pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded text-xs">
                        {JSON.stringify(executionContext.context, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trigger Data */}
          {execution.triggerData && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Trigger Data</h3>
              <div className="bg-gray-50 p-3 rounded-md">
                <pre className="whitespace-pre-wrap text-sm text-gray-900">
                  {JSON.stringify(JSON.parse(execution.triggerData), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowExecutionDetailPage; 