import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BusinessRuleService } from '../services/businessRuleService';
import { useNotifications } from '../contexts/NotificationContext';
import {
  ArrowLeftIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CogIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
  BeakerIcon,
  LightBulbIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

const BusinessRuleTestPage: React.FC = () => {
  const { ruleId } = useParams<{ ruleId?: string }>();
  const { addNotification } = useNotifications();
  
  const [selectedRuleId, setSelectedRuleId] = useState<string>(ruleId || '');
  const [testData, setTestData] = useState<any>({
    score: 75,
    status: 'RAW',
    industry: 'Technology',
    companyName: 'Test Company Inc.',
    domain: 'testcompany.com',
    assignedTo: null,
    assignedTeam: null,
    campaignId: 'test-campaign',
  });
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // Fetch business rules for selection
  const { data: businessRules, isLoading: loadingRules } = useQuery({
    queryKey: ['business-rules'],
    queryFn: () => new BusinessRuleService().getBusinessRules(),
  });

  // Fetch selected rule details
  const { data: selectedRule, isLoading: loadingRule } = useQuery({
    queryKey: ['business-rule', selectedRuleId],
    queryFn: () => new BusinessRuleService().getBusinessRuleById(selectedRuleId),
    enabled: !!selectedRuleId,
  });

  // Test rule mutation
  const testRuleMutation = useMutation({
    mutationFn: ({ ruleId, testData }: { ruleId: string; testData: any }) =>
      new BusinessRuleService().testRuleEvaluation(ruleId, testData),
    onSuccess: (data) => {
      setTestResults(data);
      addNotification({
        type: 'success',
        title: 'Test Completed',
        message: `Rule ${data.matched ? 'matched' : 'did not match'} the test data`
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Test Failed',
        message: error.response?.data?.message || 'Failed to test business rule'
      });
    },
  });

  const handleTestRule = () => {
    if (!selectedRuleId) {
      addNotification({
        type: 'error',
        title: 'No Rule Selected',
        message: 'Please select a business rule to test'
      });
      return;
    }

    setIsRunningTest(true);
    testRuleMutation.mutate(
      { ruleId: selectedRuleId, testData },
      {
        onSettled: () => {
          setIsRunningTest(false);
        }
      }
    );
  };

  const handleResetTest = () => {
    setTestResults(null);
    setTestData({
      score: 75,
      status: 'RAW',
      industry: 'Technology',
      companyName: 'Test Company Inc.',
      domain: 'testcompany.com',
      assignedTo: null,
      assignedTeam: null,
      campaignId: 'test-campaign',
    });
  };

  const updateTestData = (field: string, value: any) => {
    setTestData(prev => ({ ...prev, [field]: value }));
  };

  const getConditionStatus = (condition: any, testData: any) => {
    const fieldValue = testData[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) ? condition.value.includes(fieldValue) : false;
      case 'not_in':
        return Array.isArray(condition.value) ? !condition.value.includes(fieldValue) : false;
      default:
        return false;
    }
  };

  const formatActionDescription = (action: any) => {
    switch (action.type) {
      case 'assignment':
        return `Assign to ${action.target}: ${action.value}`;
      case 'scoring':
        return `Set score to: ${action.value}`;
      case 'status_change':
        return `Change status to: ${action.value}`;
      case 'notification':
        return `Send notification: ${action.value}`;
      case 'enrichment':
        return `Trigger enrichment`;
      default:
        return `${action.type}: ${action.value}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/business-rules"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Business Rules
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Rule Testing</h1>
            <p className="text-gray-600">Test and simulate business rule evaluation</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetTest}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <CogIcon className="h-4 w-4 mr-2" />
            Reset Test
          </button>
          <button
            onClick={handleTestRule}
            disabled={!selectedRuleId || isRunningTest}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            <BeakerIcon className="h-4 w-4 mr-2" />
            {isRunningTest ? 'Testing...' : 'Run Test'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Rule Selection and Test Data */}
        <div className="space-y-6">
          {/* Rule Selection */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Business Rule</h3>
            {loadingRules ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading business rules...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={selectedRuleId}
                  onChange={(e) => setSelectedRuleId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a business rule to test</option>
                  {businessRules?.map((rule: any) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name} ({BusinessRuleService.formatRuleType(rule.type)})
                    </option>
                  ))}
                </select>
                
                {selectedRule && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md">
                    <h4 className="font-medium text-gray-900 mb-2">{selectedRule.name}</h4>
                    {selectedRule.description && (
                      <p className="text-sm text-gray-600 mb-3">{selectedRule.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Type: {BusinessRuleService.formatRuleType(selectedRule.type)}</span>
                      <span>Priority: {selectedRule.priority}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        selectedRule.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedRule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test Data Configuration */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Test Data Configuration</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Score</label>
                  <input
                    type="number"
                    value={testData.score}
                    onChange={(e) => updateTestData('score', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={testData.status}
                    onChange={(e) => updateTestData('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="RAW">RAW</option>
                    <option value="SCORED">SCORED</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <input
                    type="text"
                    value={testData.industry}
                    onChange={(e) => updateTestData('industry', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Technology"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={testData.companyName}
                    onChange={(e) => updateTestData('companyName', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Test Company Inc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                  <input
                    type="text"
                    value={testData.domain}
                    onChange={(e) => updateTestData('domain', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., testcompany.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign ID</label>
                  <input
                    type="text"
                    value={testData.campaignId}
                    onChange={(e) => updateTestData('campaignId', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., test-campaign"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Test Results */}
        <div className="space-y-6">
          {/* Test Results */}
          {testResults && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Test Results</h3>
              
              {/* Overall Result */}
              <div className={`p-4 rounded-md mb-4 ${
                testResults.matched 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="flex items-center">
                  {testResults.matched ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-gray-500 mr-2" />
                  )}
                  <span className={`font-medium ${
                    testResults.matched ? 'text-green-800' : 'text-gray-800'
                  }`}>
                    Rule {testResults.matched ? 'Matched' : 'Did Not Match'}
                  </span>
                </div>
              </div>

              {/* Condition Evaluation */}
              {selectedRule && testResults.conditions && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-3">Condition Evaluation</h4>
                  <div className="space-y-2">
                    {testResults.conditions.map((condition: any, index: number) => {
                      const conditionResult = getConditionStatus(condition, testData);
                      return (
                        <div key={index} className={`p-3 rounded-md border ${
                          conditionResult 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {conditionResult ? (
                                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                              ) : (
                                <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />
                              )}
                              <span className="text-sm font-medium">
                                {condition.field} {condition.operator} {condition.value}
                              </span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              conditionResult 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {conditionResult ? 'True' : 'False'}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            Actual value: {testData[condition.field]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              {testResults.matched && testResults.actions && testResults.actions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Actions That Would Execute</h4>
                  <div className="space-y-2">
                    {testResults.actions.map((action: any, index: number) => (
                      <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center">
                          <LightBulbIcon className="h-4 w-4 text-blue-500 mr-2" />
                          <span className="text-sm font-medium text-blue-800">
                            {formatActionDescription(action)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Test Templates */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Test Templates</h3>
            <div className="space-y-3">
              <button
                onClick={() => setTestData({
                  score: 90,
                  status: 'RAW',
                  industry: 'Technology',
                  companyName: 'High-Score Tech',
                  domain: 'hightech.com',
                  assignedTo: null,
                  assignedTeam: null,
                  campaignId: 'test-campaign',
                })}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                <div className="font-medium text-gray-900">High-Score Lead</div>
                <div className="text-sm text-gray-500">Score: 90, Technology industry</div>
              </button>
              
              <button
                onClick={() => setTestData({
                  score: 30,
                  status: 'RAW',
                  industry: 'Manufacturing',
                  companyName: 'Low-Score Corp',
                  domain: 'lowscore.com',
                  assignedTo: null,
                  assignedTeam: null,
                  campaignId: 'test-campaign',
                })}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                <div className="font-medium text-gray-900">Low-Score Lead</div>
                <div className="text-sm text-gray-500">Score: 30, Manufacturing industry</div>
              </button>
              
              <button
                onClick={() => setTestData({
                  score: 75,
                  status: 'QUALIFIED',
                  industry: 'Finance',
                  companyName: 'Qualified Finance',
                  domain: 'qualifiedfinance.com',
                  assignedTo: null,
                  assignedTeam: null,
                  campaignId: 'test-campaign',
                })}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                <div className="font-medium text-gray-900">Qualified Lead</div>
                <div className="text-sm text-gray-500">Status: QUALIFIED, Finance industry</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessRuleTestPage; 