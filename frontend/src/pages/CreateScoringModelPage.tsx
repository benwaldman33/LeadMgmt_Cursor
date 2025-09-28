import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { scoringAPI, campaignsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { aiDiscoveryService } from '../services/aiDiscoveryService';

interface ScoringCriterion {
  name: string;
  description: string;
  searchTerms: string[];
  searchTermsInput: string; // Raw input string for better UX
  weight: number;
  type: string;
}

const CreateScoringModelPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    campaignId: '',
  });

  // New state for enhanced industry selection
  const [availableIndustries, setAvailableIndustries] = useState<Array<{ value: string; label: string; source: 'database' | 'hardcoded' }>>([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; industry: string }>>([]);
  const [industryInputMode, setIndustryInputMode] = useState<'select' | 'custom'>('select');
  const [customIndustry, setCustomIndustry] = useState('');

  const [criteria, setCriteria] = useState<ScoringCriterion[]>([
    {
      name: '',
      description: '',
      searchTerms: [''],
      searchTermsInput: '',
      weight: 0,
      type: 'KEYWORD',
    },
  ]);

  // Load data on component mount
  useEffect(() => {
    loadAvailableIndustries();
    loadCampaigns();
  }, []);

  // Auto-detect industry when campaign is selected
  useEffect(() => {
    if (formData.campaignId) {
      const selectedCampaign = campaigns.find(c => c.id === formData.campaignId);
      if (selectedCampaign) {
        setFormData(prev => ({ ...prev, industry: selectedCampaign.industry }));
        addNotification({
          type: 'info',
          title: 'Industry Auto-Detected',
          message: `Industry set to "${selectedCampaign.industry}" from campaign "${selectedCampaign.name}"`
        });
      }
    }
  }, [formData.campaignId, campaigns, addNotification]);

  const loadAvailableIndustries = async () => {
    try {
      const industries = await aiDiscoveryService.getAvailableIndustriesForScoring();
      setAvailableIndustries(industries);
    } catch (error) {
      console.error('Failed to load industries:', error);
      addNotification({
        type: 'error',
        title: 'Failed to Load Industries',
        message: 'Using default industry list. You can still enter a custom industry.'
      });
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await campaignsAPI.getAll();
      setCampaigns(response.campaigns || []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCriterionChange = (index: number, field: keyof ScoringCriterion, value: string | number) => {
    const updatedCriteria = [...criteria];
    if (field === 'searchTermsInput') {
      // Store the raw input string for immediate display
      updatedCriteria[index].searchTermsInput = value as string;
      // Parse search terms for the actual data structure
      const parsedTerms = parseSearchTerms(value as string);
      updatedCriteria[index].searchTerms = parsedTerms;
    } else {
      (updatedCriteria[index] as any)[field] = value;
    }
    setCriteria(updatedCriteria);
  };

  // Helper function to parse search terms intelligently
  const parseSearchTerms = (input: string): string[] => {
    if (!input.trim()) return [''];
    
    // Split by comma but preserve spaces within terms
    const terms = input.split(',').map(term => term.trim()).filter(term => term.length > 0);
    
    // If no terms found, return empty array with one empty string
    if (terms.length === 0) return [''];
    
    return terms;
  };

  const addCriterion = () => {
    setCriteria([
      ...criteria,
      {
        name: '',
        description: '',
        searchTerms: [''],
        searchTermsInput: '',
        weight: 0,
        type: 'KEYWORD',
      },
    ]);
  };

  const removeCriterion = (index: number) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter((_, i) => i !== index));
    }
  };

  const getTotalWeight = () => {
    return criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate total weight equals 100
    if (getTotalWeight() !== 100) {
      setError('Total weight must equal 100%');
      setLoading(false);
      return;
    }

    // Validate all criteria have names
    if (criteria.some(c => !c.name.trim())) {
      setError('All criteria must have names');
      setLoading(false);
      return;
    }

    try {
      // Determine the final industry value
      const finalIndustry = industryInputMode === 'custom' ? customIndustry : formData.industry;
      
      if (!finalIndustry.trim()) {
        setError('Please select or enter an industry');
        setLoading(false);
        return;
      }

      const scoringData = {
        name: formData.name,
        industry: finalIndustry,
        criteria: criteria.map(c => ({
          ...c,
          searchTerms: c.searchTerms.filter(term => term.trim() !== ''),
        })),
      };

      await scoringAPI.create(scoringData);
      addNotification({
        type: 'success',
        title: 'Scoring Model Created',
        message: `"${formData.name}" has been created successfully for ${finalIndustry} industry`
      });
      navigate('/scoring');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create scoring model');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/scoring')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Scoring Model</h1>
          <p className="text-gray-600">Define criteria for lead scoring</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Model Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="input-field"
                placeholder="e.g., Dental Equipment Scoring Model"
              />
            </div>

            <div>
              <label htmlFor="campaignId" className="block text-sm font-medium text-gray-700 mb-2">
                Auto-detect from Campaign (Optional)
              </label>
              <select
                id="campaignId"
                name="campaignId"
                value={formData.campaignId}
                onChange={handleInputChange}
                className="input-field"
              >
                <option value="">No campaign selected</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name} ({campaign.industry})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select a campaign to automatically set the industry
              </p>
            </div>

            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                Industry *
              </label>
              
              {/* Industry Input Mode Toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setIndustryInputMode('select')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    industryInputMode === 'select'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Select from List
                </button>
                <button
                  type="button"
                  onClick={() => setIndustryInputMode('custom')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    industryInputMode === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Enter Custom
                </button>
              </div>

              {/* Industry Selection */}
              {industryInputMode === 'select' ? (
                <select
                  id="industry"
                  name="industry"
                  required
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="">Select Industry</option>
                  {availableIndustries.map((industry) => (
                    <option key={industry.value} value={industry.value}>
                      {industry.label} {industry.source === 'database' ? '📊' : '🔧'}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id="customIndustry"
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  className="input-field"
                  placeholder="Enter custom industry name"
                  required
                />
              )}
            </div>
          </div>
        </div>

        {/* Scoring Criteria */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Scoring Criteria</h2>
            <button
              type="button"
              onClick={addCriterion}
              className="btn-secondary flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add Criterion
            </button>
          </div>

          <div className="space-y-6">
            {criteria.map((criterion, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-md font-medium text-gray-900">
                    Criterion {index + 1}
                  </h3>
                  {criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCriterion(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={criterion.name}
                      onChange={(e) => handleCriterionChange(index, 'name', e.target.value)}
                      className="input-field"
                      placeholder="e.g., Dental Equipment Keywords"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      value={criterion.type}
                      onChange={(e) => handleCriterionChange(index, 'type', e.target.value)}
                      className="input-field"
                    >
                      <option value="KEYWORD">Keyword Match</option>
                      <option value="DOMAIN">Domain Analysis</option>
                      <option value="CONTENT">Content Analysis</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (%) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={criterion.weight}
                      onChange={(e) => handleCriterionChange(index, 'weight', parseInt(e.target.value) || 0)}
                      className="input-field"
                      placeholder="0-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Terms *
                    </label>
                    <input
                      type="text"
                      value={criterion.searchTermsInput}
                      onChange={(e) => handleCriterionChange(index, 'searchTermsInput', e.target.value)}
                      className="input-field"
                      placeholder="cone beam computed tomography, dental laser, CAD/CAM"
                    />
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-500">
                        Separate multiple search terms with commas. Include spaces for multi-word phrases.
                      </p>
                      <p className="text-xs text-blue-600">
                        ✓ Example: "cone beam computed tomography, dental laser" creates 2 terms
                      </p>
                      {criterion.searchTerms.length > 0 && criterion.searchTerms[0] && (
                        <div className="text-xs">
                          <span className="text-gray-600">Search terms: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {criterion.searchTerms.filter(term => term.trim()).map((term, termIndex) => (
                              <span
                                key={termIndex}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                "{term}"
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={criterion.description}
                      onChange={(e) => handleCriterionChange(index, 'description', e.target.value)}
                      className="input-field"
                      rows={2}
                      placeholder="Describe what this criterion looks for..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Weight Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Weight:</span>
              <span className={`text-lg font-bold ${
                getTotalWeight() === 100 ? 'text-green-600' : 'text-red-600'
              }`}>
                {getTotalWeight()}%
              </span>
            </div>
            {getTotalWeight() !== 100 && (
              <p className="text-sm text-red-600 mt-1">
                Total weight must equal 100%
              </p>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/scoring')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || getTotalWeight() !== 100}
            className="btn-primary flex-1"
          >
            {loading ? 'Creating...' : 'Create Scoring Model'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateScoringModelPage; 