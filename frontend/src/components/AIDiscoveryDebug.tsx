import React from 'react';
import { useAIDiscovery } from '../contexts/AIDiscoveryContext';

const AIDiscoveryDebug: React.FC = () => {
  const { state, hasActiveSession } = useAIDiscovery();

  if (!hasActiveSession) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">AI Discovery State</h3>
      <div className="text-xs space-y-1">
        <div><strong>Industry:</strong> {state.selectedIndustry || 'None'}</div>
        <div><strong>Product Vertical:</strong> {state.selectedProductVertical || 'None'}</div>
        <div><strong>Product Verticals:</strong> {state.productVerticals.length}</div>
        <div><strong>Session:</strong> {state.discoverySession ? 'Active' : 'None'}</div>
        <div><strong>Search Results:</strong> {state.searchResults.length}</div>
        <div><strong>User Message:</strong> {state.userMessage ? 'Has input' : 'None'}</div>
      </div>
    </div>
  );
};

export default AIDiscoveryDebug; 