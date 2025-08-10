import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface MarketCriteria {
  minLocations: number;
  maxLocations?: number;
  geography: string;
  industries?: string[];
  excludeIndustries?: string[];
}

const MarketDiscoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const [criteria, setCriteria] = useState<MarketCriteria>({
    minLocations: 300000,
    geography: 'US'
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleStartDiscovery = async () => {
    setIsAnalyzing(true);
    
    try {
      // Navigate to discovery wizard with criteria
      navigate('/market-discovery/wizard', { state: { criteria } });
    } catch (error) {
      console.error('Error starting discovery:', error);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧠 AI Market Discovery
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover high-opportunity industries, analyze market segments, and generate qualified B2B prospects 
            using AI-powered market intelligence.
          </p>
        </div>

        {/* Main Discovery Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Market Size Analysis</h2>
              <p className="text-gray-600">Define your market criteria to discover opportunities</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Minimum Locations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Business Locations
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={criteria.minLocations}
                  onChange={(e) => setCriteria({ ...criteria, minLocations: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="300000"
                  min="1000"
                  step="10000"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-500 text-sm">locations</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Industries with at least this many business locations in the selected geography
              </p>
            </div>

            {/* Geography */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Geographic Market
              </label>
              <select
                value={criteria.geography}
                onChange={(e) => setCriteria({ ...criteria, geography: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="Global">Global</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Geographic scope for market analysis
              </p>
            </div>

            {/* Maximum Locations (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Locations (Optional)
              </label>
              <input
                type="number"
                value={criteria.maxLocations || ''}
                onChange={(e) => setCriteria({ 
                  ...criteria, 
                  maxLocations: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional upper limit"
                min="1000"
                step="10000"
              />
              <p className="text-sm text-gray-500 mt-1">
                Exclude extremely large industries (leave blank for no limit)
              </p>
            </div>

            {/* Industry Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Focus Industries (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Healthcare, Construction, Manufacturing"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => {
                  const industries = e.target.value ? e.target.value.split(',').map(s => s.trim()) : undefined;
                  setCriteria({ ...criteria, industries });
                }}
              />
              <p className="text-sm text-gray-500 mt-1">
                Comma-separated list of industries to focus on (leave blank for all)
              </p>
            </div>
          </div>
        </div>

        {/* AI Discovery Process Preview */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">🤖 AI Discovery Process</h3>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Market Analysis</h4>
              <p className="text-sm text-gray-600">
                AI analyzes industry data and identifies high-opportunity markets
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎯</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Sub-Industry Breakdown</h4>
              <p className="text-sm text-gray-600">
                Drill down into specific market segments with detailed analysis
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🛍️</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Product Discovery</h4>
              <p className="text-sm text-gray-600">
                AI identifies high-value B2B products and services in your chosen market
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">👥</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Buyer Profiling</h4>
              <p className="text-sm text-gray-600">
                Generate detailed buyer personas and configure automated discovery
              </p>
            </div>
          </div>
        </div>

        {/* Start Discovery Button */}
        <div className="text-center">
          <button
            onClick={handleStartDiscovery}
            disabled={isAnalyzing || criteria.minLocations < 1000}
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing Markets...
              </>
            ) : (
              <>
                <span className="mr-2">🚀</span>
                Start AI Market Discovery
              </>
            )}
          </button>

          <p className="text-sm text-gray-500 mt-3">
            This will analyze {criteria.geography} markets with {criteria.minLocations.toLocaleString()}+ business locations
          </p>
        </div>

        {/* Example Results */}
        <div className="bg-gray-50 rounded-xl p-6 mt-8">
          <h4 className="font-medium text-gray-900 mb-3">💡 Example Discovery Results</h4>
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              <span><strong>Plumbing Contractors:</strong> 412,000 locations → Commercial Plumbing (89,000) → Water Jetting Equipment → 2,400 qualified prospects</span>
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              <span><strong>Auto Repair:</strong> 347,000 locations → Specialty Shops (156,000) → Diagnostic Equipment → 1,850 qualified prospects</span>
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
              <span><strong>Dental Practices:</strong> 325,000 locations → General Dentistry (201,000) → Imaging Equipment → 3,200 qualified prospects</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketDiscoveryPage;
