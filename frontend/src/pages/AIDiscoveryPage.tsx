import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiDiscoveryService } from '../services/aiDiscoveryService';
import type { 
  Industry, 
  ProductVertical, 
  DiscoverySession,
  WebSearchResult,
  ConversationMessage
} from '../services/aiDiscoveryService';
import { useNotifications } from '../contexts/NotificationContext';

interface AIDiscoveryPageProps {}

const AIDiscoveryPage: React.FC<AIDiscoveryPageProps> = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  
  // State management
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [productVerticals, setProductVerticals] = useState<ProductVertical[]>([]);
  const [selectedProductVertical, setSelectedProductVertical] = useState<string>('');
  const [discoverySession, setDiscoverySession] = useState<DiscoverySession | null>(null);
  const [userMessage, setUserMessage] = useState<string>('');
  const [searchResults, setSearchResults] = useState<WebSearchResult[]>([]);
  const [searchConstraints, setSearchConstraints] = useState({
    geography: [] as string[],
    maxResults: 50,
    companySize: [] as string[]
  });
  
  // Loading states
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [loadingVerticals, setLoadingVerticals] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Load industries on component mount
  useEffect(() => {
    loadIndustries();
  }, []);

  const loadIndustries = async () => {
    try {
      setLoadingIndustries(true);
      console.log('Loading industries...');
      const industriesData = await aiDiscoveryService.getIndustries();
      console.log('Industries loaded:', industriesData);
      setIndustries(industriesData);
    } catch (error: any) {
      console.error('Error loading industries:', error);
      addNotification({
        type: 'error',
        title: 'Failed to Load Industries',
        message: error.response?.data?.error || 'Failed to load industries'
      });
    } finally {
      setLoadingIndustries(false);
    }
  };

  const handleIndustrySelect = async (industryId: string) => {
    console.log('Industry selected:', industryId);
    setSelectedIndustry(industryId);
    setSelectedProductVertical('');
    setProductVerticals([]);
    setDiscoverySession(null);
    setSearchResults([]);

    try {
      setLoadingVerticals(true);
      console.log('Loading product verticals for industry:', industryId);
      
      // Show notification that Claude is discovering verticals
      addNotification({
        type: 'info',
        title: 'AI Discovery in Progress',
        message: `Claude AI is analyzing the ${industryId} industry to discover product verticals...`
      });
      
      const verticals = await aiDiscoveryService.getProductVerticals(industryId);
      console.log('Product verticals loaded:', verticals);
      setProductVerticals(verticals);
      
      // Show success notification
      addNotification({
        type: 'success',
        title: 'Discovery Complete',
        message: `Claude discovered ${verticals.length} product verticals for ${industryId}`
      });
    } catch (error: any) {
      console.error('Error loading product verticals:', error);
      addNotification({
        type: 'error',
        title: 'Failed to Load Product Verticals',
        message: error.response?.data?.error || 'Failed to load product verticals'
      });
    } finally {
      setLoadingVerticals(false);
    }
  };

  const handleProductVerticalSelect = async (verticalId: string) => {
    setSelectedProductVertical(verticalId);
    
    try {
      setLoadingSession(true);
      
      // Start discovery session
      const session = await aiDiscoveryService.startDiscoverySession(selectedIndustry);
      setDiscoverySession(session);
      
      // Don't automatically generate customer insights - let the user control the flow
      // The initial session will have the industry introduction, and users can ask for insights when ready
      
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Start Discovery Session',
        message: error.response?.data?.error || 'Failed to start discovery session'
      });
    } finally {
      setLoadingSession(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || !discoverySession) return;

    const message = userMessage.trim();
    setUserMessage('');

    try {
      const updatedSession = await aiDiscoveryService.addMessage(
        discoverySession.id, 
        message, 
        selectedIndustry, 
        selectedProductVertical
      );
      setDiscoverySession(updatedSession);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Send Message',
        message: error.response?.data?.error || 'Failed to send message'
      });
    }
  };

  const handleGenerateInsights = async () => {
    if (!selectedIndustry || !selectedProductVertical || !discoverySession) return;

    try {
      setLoadingSession(true);
      
      const selectedVertical = productVerticals.find(v => v.id === selectedProductVertical);
      if (selectedVertical) {
        const insights = await aiDiscoveryService.generateCustomerInsights(selectedIndustry, selectedProductVertical);
        
        // Add customer insights as an AI message to the conversation
        const insightsMessage: ConversationMessage = {
          id: `msg_insights_${Date.now()}`,
          role: 'assistant',
          content: insights.content,
          timestamp: new Date(),
          metadata: insights.metadata
        };
        
        // Update session with insights
        const updatedSession = {
          ...discoverySession,
          conversationHistory: [...discoverySession.conversationHistory, insightsMessage]
        };
        setDiscoverySession(updatedSession);
        
        addNotification({
          type: 'success',
          title: 'Customer Insights Generated',
          message: `AI has analyzed customers for ${selectedVertical.name}`
        });
      }
    } catch (error: any) {
      console.error('Error generating customer insights:', error);
      addNotification({
        type: 'error',
        title: 'Failed to Generate Insights',
        message: error.response?.data?.error || 'Failed to generate customer insights'
      });
    } finally {
      setLoadingSession(false);
    }
  };

  const handleSearchCustomers = async () => {
    // Get customer types from the selected product vertical
    const selectedVertical = productVerticals.find(v => v.id === selectedProductVertical);
    const customerTypes = selectedVertical?.customerTypes?.map(ct => ct.id) || [];
    
    console.log('Selected vertical:', selectedVertical);
    console.log('Customer types from vertical:', customerTypes);
    console.log('Searching for customers with:', {
      selectedIndustry,
      selectedProductVertical,
      customerTypes,
      constraints: searchConstraints
    });

    if (!selectedIndustry || !selectedProductVertical) {
      addNotification({
        type: 'error',
        title: 'Missing Information',
        message: 'Please select an industry and product vertical first'
      });
      return;
    }

    try {
      setLoadingSearch(true);
      console.log('Calling searchForCustomers...');
      const result = await aiDiscoveryService.searchForCustomers(
        selectedIndustry,
        selectedProductVertical,
        customerTypes,
        searchConstraints
      );
      console.log('Search result:', result);
      setSearchResults(result.results);
      
      addNotification({
        type: 'success',
        title: 'Search Complete',
        message: `Found ${result.totalFound} potential customers`
      });
    } catch (error: any) {
      console.error('Search error:', error);
      addNotification({
        type: 'error',
        title: 'Search Failed',
        message: error.response?.data?.error || 'Failed to search for customers'
      });
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleProcessUrls = () => {
    if (searchResults.length === 0) {
      addNotification({
        type: 'error',
        title: 'No Results',
        message: 'Please search for customers first'
      });
      return;
    }

    const urls = searchResults.map(result => result.url);
    // Navigate to pipeline page with the discovered URLs
    navigate('/pipeline', { 
      state: { 
        urls,
        industry: selectedIndustry,
        source: 'ai-discovery'
      }
    });
  };

  const selectedVertical = productVerticals.find(v => v.id === selectedProductVertical);

  // Debug state values
  console.log('Current state:', {
    selectedIndustry,
    selectedProductVertical,
    productVerticals: productVerticals.length,
    industries: industries.length,
    loadingVerticals,
    discoverySession: !!discoverySession
  });

  // Debug conditional rendering
  console.log('Conditional rendering:', {
    showProductVerticals: !!selectedIndustry,
    showSearchConstraints: !!selectedProductVertical,
    showDiscoverySession: !!discoverySession
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI-Powered Lead Discovery</h1>
          <p className="mt-2 text-gray-600">
            Explore industries, discover product verticals, and find your ideal customers through AI conversations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Industry & Product Selection */}
          <div className="lg:col-span-1 space-y-6">
            {/* Industry Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Select Industry</h2>
              
              {loadingIndustries ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {industries.map((industry) => (
                    <button
                      key={industry.id}
                      onClick={() => handleIndustrySelect(industry.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        selectedIndustry === industry.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{industry.name}</div>
                      <div className="text-sm text-gray-600 mt-1">{industry.description}</div>
                      <div className="text-xs text-gray-500 mt-2">
                        Market: {industry.marketSize} | Growth: {industry.growthRate}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Vertical Selection */}
            {selectedIndustry && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Select Product Vertical</h2>
                
                {loadingVerticals ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <div className="text-gray-600">
                          <div className="font-medium">Claude AI is analyzing...</div>
                          <div className="text-sm">Discovering product verticals for {selectedIndustry}</div>
                        </div>
                      </div>
                    </div>
                    <div className="animate-pulse space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productVerticals.map((vertical) => (
                      <button
                        key={vertical.id}
                        onClick={() => handleProductVerticalSelect(vertical.id)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                          selectedProductVertical === vertical.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{vertical.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{vertical.description}</div>
                        <div className="text-xs text-gray-500 mt-2">
                          Market: {vertical.marketSize} | Growth: {vertical.growthRate}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Search Constraints */}
            {selectedProductVertical && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Search Constraints</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Results
                    </label>
                    <input
                      type="number"
                      value={searchConstraints.maxResults}
                      onChange={(e) => setSearchConstraints(prev => ({
                        ...prev,
                        maxResults: parseInt(e.target.value) || 50
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="1000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Geography (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., New York, California, Texas"
                      value={searchConstraints.geography.join(', ')}
                      onChange={(e) => setSearchConstraints(prev => ({
                        ...prev,
                        geography: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleSearchCustomers}
                    disabled={loadingSearch}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingSearch ? 'Searching...' : 'Search for Customers'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* AI Conversation & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Conversation */}
            {discoverySession && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">AI Discovery Conversation</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Discuss your target customers with AI to refine your search criteria
                  </p>
                </div>
                
                <div className="p-6">
                  {/* Conversation History */}
                  <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                    {discoverySession.conversationHistory.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="text-sm">{message.content}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={userMessage}
                      onChange={(e) => setUserMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask AI about customer types, market opportunities..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!userMessage.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                  
                  {/* Quick Actions */}
                  {selectedProductVertical && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex space-x-2">
                        <button
                          onClick={handleGenerateInsights}
                          disabled={loadingSession}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {loadingSession ? 'Generating...' : 'Generate Customer Insights'}
                        </button>
                        <button
                          onClick={handleSearchCustomers}
                          disabled={loadingSearch}
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {loadingSearch ? 'Searching...' : 'Search for Customers'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Discovered Customers</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Found {searchResults.length} potential customers
                      </p>
                    </div>
                    <button
                      onClick={handleProcessUrls}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Process URLs
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    {searchResults.map((result, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{result.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{result.description}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              {result.location && (
                                <span>📍 {result.location}</span>
                              )}
                              {result.companyType && (
                                <span>🏢 {result.companyType}</span>
                              )}
                              <span>🎯 {(result.relevanceScore * 100).toFixed(0)}% match</span>
                            </div>
                          </div>
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Visit →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIDiscoveryPage; 