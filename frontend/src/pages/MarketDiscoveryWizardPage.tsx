import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import marketDiscoveryService from '../services/marketDiscoveryService';

interface MarketCriteria {
  minLocations: number;
  maxLocations?: number;
  geography: string;
  industries?: string[];
  excludeIndustries?: string[];
}

interface IndustryData {
  name: string;
  naicsCode?: string;
  locationCount: number;
  description: string;
  avgRevenue?: number;
  growthRate?: number;
  competitionLevel?: 'low' | 'medium' | 'high';
  marketSize?: number;
}

interface SubIndustryData {
  name: string;
  naicsCode?: string;
  locationCount: number;
  description: string;
  parentIndustry: string;
  avgRevenue?: number;
  marketShare?: number;
}

interface ProductData {
  name: string;
  category: string;
  description: string;
  targetMarket: string;
  avgPrice?: { min: number; max: number };
  marketSize?: number;
  keyVendors?: string[];
  buyingFrequency?: string;
}

type WizardStep = 'analysis' | 'industries' | 'subindustries' | 'products' | 'buyerprofile' | 'complete';

const MarketDiscoveryWizardPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('analysis');
  const [criteria, setCriteria] = useState<MarketCriteria>(location.state?.criteria || {});
  const [industries, setIndustries] = useState<IndustryData[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryData | null>(null);
  const [subIndustries, setSubIndustries] = useState<SubIndustryData[]>([]);
  const [selectedSubIndustry, setSelectedSubIndustry] = useState<SubIndustryData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data for development (replace with actual API calls)
  const mockIndustries: IndustryData[] = [
    {
      name: 'Plumbing, Heating, and Air-Conditioning Contractors',
      naicsCode: '238220',
      locationCount: 412000,
      description: 'Contractors specializing in plumbing, heating, and air conditioning systems',
      avgRevenue: 850000,
      growthRate: 3.2,
      competitionLevel: 'medium',
      marketSize: 124000000000
    },
    {
      name: 'Full-Service Restaurants',
      naicsCode: '722511',
      locationCount: 653000,
      description: 'Restaurants providing food services to patrons who order and are served while seated',
      avgRevenue: 1200000,
      growthRate: 2.8,
      competitionLevel: 'high',
      marketSize: 298000000000
    },
    {
      name: 'Automotive Repair and Maintenance',
      naicsCode: '811111',
      locationCount: 347000,
      description: 'General automotive repair and maintenance services',
      avgRevenue: 920000,
      growthRate: 1.5,
      competitionLevel: 'medium',
      marketSize: 89000000000
    }
  ];

  const mockSubIndustries: SubIndustryData[] = [
    {
      name: 'Commercial Plumbing',
      naicsCode: '238220-02',
      locationCount: 89000,
      description: 'Plumbing services for commercial and industrial properties',
      parentIndustry: 'Plumbing, Heating, and Air-Conditioning Contractors',
      avgRevenue: 1200000,
      marketShare: 21.6
    },
    {
      name: 'Residential Plumbing',
      naicsCode: '238220-01',
      locationCount: 281000,
      description: 'Plumbing services for residential properties',
      parentIndustry: 'Plumbing, Heating, and Air-Conditioning Contractors',
      avgRevenue: 650000,
      marketShare: 68.2
    },
    {
      name: 'Industrial Plumbing',
      naicsCode: '238220-03',
      locationCount: 42000,
      description: 'Specialized plumbing for industrial facilities',
      parentIndustry: 'Plumbing, Heating, and Air-Conditioning Contractors',
      avgRevenue: 2100000,
      marketShare: 10.2
    }
  ];

  const mockProducts: ProductData[] = [
    {
      name: 'High-pressure water jetting systems',
      category: 'Drain Cleaning Equipment',
      description: 'Professional-grade water jetting equipment for clearing commercial drains and sewers',
      targetMarket: 'Commercial plumbing contractors',
      avgPrice: { min: 15000, max: 50000 },
      marketSize: 2400000000,
      keyVendors: ['Spartan Tool', 'General Pipe Cleaners', 'Electric Eel'],
      buyingFrequency: 'every 5-7 years'
    },
    {
      name: 'Pipe inspection cameras',
      category: 'Diagnostic Equipment',
      description: 'Video inspection systems for diagnosing pipe problems',
      targetMarket: 'Commercial plumbing contractors',
      avgPrice: { min: 5000, max: 25000 },
      marketSize: 1800000000,
      keyVendors: ['RIDGID', 'Envirosight', 'Pearpoint'],
      buyingFrequency: 'every 3-5 years'
    }
  ];

  useEffect(() => {
    if (currentStep === 'analysis') {
      performMarketAnalysis();
    }
  }, []);

  const performMarketAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, this would call the Market Analysis API
      // const response = await marketAnalysisService.analyzeMarketSize(criteria);
      
      setIndustries(mockIndustries);
      setCurrentStep('industries');
    } catch (err) {
      setError('Failed to analyze market. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectIndustry = async (industry: IndustryData) => {
    setSelectedIndustry(industry);
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In production: const subIndustries = await marketAnalysisService.getSubIndustries(industry.name);
      setSubIndustries(mockSubIndustries);
      setCurrentStep('subindustries');
    } catch (err) {
      setError('Failed to load sub-industries.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectSubIndustry = async (subIndustry: SubIndustryData) => {
    setSelectedSubIndustry(subIndustry);
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In production: const products = await marketAnalysisService.discoverProducts(selectedIndustry.name, subIndustry.name);
      setProducts(mockProducts);
      setCurrentStep('products');
    } catch (err) {
      setError('Failed to discover products.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectProduct = async (product: ProductData) => {
    setSelectedProduct(product);
    setIsLoading(true);
    
    try {
      // Simulate API call for buyer profile generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setCurrentStep('buyerprofile');
    } catch (err) {
      setError('Failed to generate buyer profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const completeDiscovery = async () => {
    if (!selectedIndustry || !selectedSubIndustry || !selectedProduct) {
      setError('Missing required data to start discovery');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create discovery model name
      const discoveryName = `${selectedSubIndustry.name} - ${selectedProduct.name}`;
      
      // Generate buyer profile (mock for now)
      const buyerProfile = {
        demographics: {
          companySize: { min: 10, max: 100 },
          annualRevenue: { min: 1000000, max: 10000000 },
          employeeCount: { min: 5, max: 50 },
          geography: ['United States', 'Urban and suburban areas']
        },
        firmographics: {
          businessModel: ['B2B service provider', 'Contract-based'],
          primaryServices: ['Commercial plumbing', 'Emergency repairs', 'Maintenance contracts'],
          customerBase: ['Commercial properties', 'Industrial facilities', 'Municipal contracts'],
          operationalScale: 'Regional to metropolitan'
        },
        psychographics: {
          painPoints: ['Equipment downtime', 'High maintenance costs', 'Staff training'],
          motivations: ['Improve efficiency', 'Reduce costs', 'Competitive advantage'],
          decisionCriteria: ['ROI', 'Reliability', 'Vendor support'],
          buyingProcess: 'Research-heavy with multiple stakeholders',
          budgetCycle: 'Annual with emergency provisions'
        },
        behavioral: {
          digitalAdoption: 'mainstream',
          informationSources: ['Trade publications', 'Vendor demos', 'Peer recommendations'],
          buyingTimeline: '3-6 months for planned purchases',
          decisionMakers: ['Business owner', 'Operations manager', 'Lead technicians']
        },
        technographics: {
          currentTech: ['Basic equipment', 'Traditional methods', 'Some digital tools'],
          techStack: ['Scheduling software', 'Invoicing systems', 'Basic diagnostics'],
          adoptionReadiness: 'Open to proven technology with clear ROI',
          integrationRequirements: ['Easy integration', 'Minimal IT changes', 'Training support']
        }
      };

      // Generate search strategy (mock for now)
      const searchStrategy = {
        keywords: {
          primary: [selectedProduct.name, selectedSubIndustry.name],
          secondary: ['commercial', 'professional', 'contractors'],
          negative: ['residential', 'diy', 'home'],
          longTail: [`${selectedProduct.name} for ${selectedSubIndustry.name.toLowerCase()}`]
        },
        targeting: {
          geoTargeting: ['United States'],
          industryTargeting: [selectedIndustry.name],
          sizeTargeting: { min: 10, max: 100 },
          excludeTerms: ['residential', 'home', 'diy']
        },
        sources: {
          searchEngines: ['Google', 'Bing'],
          directories: ['Yellow Pages', 'Google My Business'],
          social: ['LinkedIn'],
          trade: ['Industry associations']
        },
        filters: {
          domainAge: { min: 1 },
          contentQuality: { min: 0.7 },
          contactInfo: true,
          businessIndicators: ['professional website', 'business phone', 'business address']
        }
      };

      // Start discovery execution via API
      const response = await fetch('/api/market-analysis/start-discovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('bbds_access_token')}`
        },
        body: JSON.stringify({
          name: discoveryName,
          industry: selectedIndustry.name,
          subIndustry: selectedSubIndustry.name,
          product: selectedProduct.name,
          buyerProfile,
          searchStrategy,
          marketSize: selectedSubIndustry.locationCount,
          config: {
            targetProspectCount: 5000,
            phases: ['market_research', 'web_scraping', 'content_analysis', 'lead_qualification'],
            budgetLimit: 500,
            timeLimit: '14_days'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start discovery');
      }

      const data = await response.json();
      const { execution } = data.data;

      // Navigate to progress page
      navigate(`/market-discovery/execution/${execution.id}`);

    } catch (err) {
      console.error('Error starting discovery:', err);
      setError(err instanceof Error ? err.message : 'Failed to start discovery');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepNumber = (step: WizardStep): number => {
    const steps: WizardStep[] = ['analysis', 'industries', 'subindustries', 'products', 'buyerprofile', 'complete'];
    return steps.indexOf(step) + 1;
  };

  const isStepCompleted = (step: WizardStep): boolean => {
    const currentStepNumber = getStepNumber(currentStep);
    const stepNumber = getStepNumber(step);
    return stepNumber < currentStepNumber;
  };

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {(['analysis', 'industries', 'subindustries', 'products', 'buyerprofile', 'complete'] as WizardStep[]).map((step, index) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step
                    ? 'bg-blue-600 text-white'
                    : isStepCompleted(step)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {isStepCompleted(step) ? '✓' : index + 1}
              </div>
              <div className="text-xs mt-2 text-center">
                {step === 'analysis' && 'Analysis'}
                {step === 'industries' && 'Industries'}
                {step === 'subindustries' && 'Segments'}
                {step === 'products' && 'Products'}
                {step === 'buyerprofile' && 'Profile'}
                {step === 'complete' && 'Complete'}
              </div>
            </div>
            {index < 5 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  isStepCompleted((['analysis', 'industries', 'subindustries', 'products', 'buyerprofile', 'complete'] as WizardStep[])[index + 1])
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {currentStep === 'analysis' && 'Analyzing Markets...'}
            {currentStep === 'industries' && 'Loading Sub-Industries...'}
            {currentStep === 'subindustries' && 'Discovering Products...'}
            {currentStep === 'products' && 'Generating Buyer Profile...'}
          </h3>
          <p className="text-gray-600">
            Our AI is processing your request. This may take a few moments.
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Analysis Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    switch (currentStep) {
      case 'industries':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🏭 Select Target Industry
            </h2>
            <p className="text-gray-600 mb-8">
              Based on your criteria, we found {industries.length} industries with {criteria.minLocations?.toLocaleString()}+ business locations in {criteria.geography}.
            </p>
            
            <div className="grid gap-6">
              {industries.map((industry, index) => (
                <div
                  key={index}
                  onClick={() => selectIndustry(industry)}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 cursor-pointer transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{industry.name}</h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {industry.locationCount.toLocaleString()} locations
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{industry.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Avg Revenue:</span>
                      <div className="text-green-600">${industry.avgRevenue?.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Growth Rate:</span>
                      <div className="text-blue-600">{industry.growthRate}%</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Competition:</span>
                      <div className={
                        industry.competitionLevel === 'low' ? 'text-green-600' :
                        industry.competitionLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                      }>
                        {industry.competitionLevel}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Market Size:</span>
                      <div className="text-purple-600">${(industry.marketSize! / 1000000000).toFixed(1)}B</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'subindustries':
        return (
          <div>
            <div className="flex items-center mb-6">
              <button
                onClick={() => setCurrentStep('industries')}
                className="mr-4 text-blue-600 hover:text-blue-800"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                🎯 Select Market Segment
              </h2>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-8">
              <h3 className="font-semibold text-blue-900">Selected Industry:</h3>
              <p className="text-blue-800">{selectedIndustry?.name}</p>
            </div>

            <div className="grid gap-6">
              {subIndustries.map((subIndustry, index) => (
                <div
                  key={index}
                  onClick={() => selectSubIndustry(subIndustry)}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 cursor-pointer transition-all duration-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{subIndustry.name}</h3>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      {subIndustry.locationCount.toLocaleString()} locations
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{subIndustry.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Avg Revenue:</span>
                      <div className="text-green-600">${subIndustry.avgRevenue?.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Market Share:</span>
                      <div className="text-blue-600">{subIndustry.marketShare}%</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">NAICS Code:</span>
                      <div className="text-gray-600">{subIndustry.naicsCode}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'products':
        return (
          <div>
            <div className="flex items-center mb-6">
              <button
                onClick={() => setCurrentStep('subindustries')}
                className="mr-4 text-blue-600 hover:text-blue-800"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                🛍️ Select Target Product
              </h2>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-8">
              <h3 className="font-semibold text-blue-900">Market Segment:</h3>
              <p className="text-blue-800">{selectedSubIndustry?.name} ({selectedSubIndustry?.locationCount.toLocaleString()} locations)</p>
            </div>

            <div className="grid gap-6">
              {products.map((product, index) => (
                <div
                  key={index}
                  onClick={() => selectProduct(product)}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 cursor-pointer transition-all duration-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                      <span className="text-blue-600 text-sm">{product.category}</span>
                    </div>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                      ${product.avgPrice?.min.toLocaleString()} - ${product.avgPrice?.max.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{product.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Target Market:</span>
                      <div className="text-blue-600">{product.targetMarket}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Market Size:</span>
                      <div className="text-green-600">${(product.marketSize! / 1000000000).toFixed(1)}B</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Buying Cycle:</span>
                      <div className="text-gray-600">{product.buyingFrequency}</div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <span className="font-medium text-gray-700 text-sm">Key Vendors: </span>
                    <span className="text-gray-600 text-sm">{product.keyVendors?.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'buyerprofile':
        return (
          <div>
            <div className="flex items-center mb-6">
              <button
                onClick={() => setCurrentStep('products')}
                className="mr-4 text-blue-600 hover:text-blue-800"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                👥 AI-Generated Buyer Profile
              </h2>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-8">
              <h3 className="font-semibold text-blue-900">Selected Product:</h3>
              <p className="text-blue-800">{selectedProduct?.name} in {selectedSubIndustry?.name}</p>
            </div>

            <div className="bg-white rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Buyer Profile Generated</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Company Demographics</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Company Size: 10-100 employees</li>
                    <li>• Annual Revenue: $1M-$10M</li>
                    <li>• Geography: United States (Urban/Suburban)</li>
                    <li>• Business Age: 5+ years established</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Key Pain Points</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Equipment downtime affecting service delivery</li>
                    <li>• High equipment maintenance costs</li>
                    <li>• Need for reliable diagnostic tools</li>
                    <li>• Training staff on new technology</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Decision Makers</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Business Owner (final approval)</li>
                    <li>• Operations Manager (evaluation)</li>
                    <li>• Lead Technicians (technical input)</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Buying Process</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Research-heavy approach</li>
                    <li>• 3-6 month buying timeline</li>
                    <li>• Multiple stakeholder involvement</li>
                    <li>• ROI-focused decision criteria</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={completeDiscovery}
                className="px-8 py-4 bg-green-600 text-white font-semibold rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200"
              >
                🚀 Start Prospect Discovery
              </button>
              <p className="text-sm text-gray-500 mt-3">
                This will configure automated discovery to find qualified prospects
              </p>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-12">
            <div className="text-green-500 text-8xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Discovery Configuration Complete!</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Your AI-powered market discovery is now configured and ready to find qualified prospects 
              for {selectedProduct?.name} in the {selectedSubIndustry?.name} market.
            </p>
            
            <div className="bg-white rounded-lg p-6 mb-8 max-w-2xl mx-auto">
              <h3 className="font-semibold text-gray-900 mb-4">Discovery Summary</h3>
              <div className="text-left space-y-2 text-sm">
                <div><strong>Industry:</strong> {selectedIndustry?.name}</div>
                <div><strong>Market Segment:</strong> {selectedSubIndustry?.name} ({selectedSubIndustry?.locationCount.toLocaleString()} locations)</div>
                <div><strong>Target Product:</strong> {selectedProduct?.name}</div>
                <div><strong>Expected Results:</strong> 2,000-5,000 qualified prospects</div>
                <div><strong>Discovery Timeline:</strong> 2-4 weeks</div>
              </div>
            </div>

            <div className="space-x-4">
              <button
                onClick={() => navigate('/market-discovery')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start New Discovery
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {renderProgressBar()}
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
};

export default MarketDiscoveryWizardPage;
