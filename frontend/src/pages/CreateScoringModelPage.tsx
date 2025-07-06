import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { scoringAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ScoringCriterion {
  name: string;
  description: string;
  searchTerms: string[];
  weight: number;
  type: string;
}

const CreateScoringModelPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    industry: '',
  });

  const [criteria, setCriteria] = useState<ScoringCriterion[]>([
    {
      name: '',
      description: '',
      searchTerms: [''],
      weight: 0,
      type: 'KEYWORD',
    },
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCriterionChange = (index: number, field: keyof ScoringCriterion, value: string | number) => {
    const updatedCriteria = [...criteria];
    if (field === 'searchTerms') {
      updatedCriteria[index][field] = (value as string).split(',').map((term: string) => term.trim());
    } else {
      (updatedCriteria[index] as any)[field] = value;
    }
    setCriteria(updatedCriteria);
  };

  const addCriterion = () => {
    setCriteria([
      ...criteria,
      {
        name: '',
        description: '',
        searchTerms: [''],
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
      const scoringData = {
        name: formData.name,
        industry: formData.industry,
        criteria: criteria.map(c => ({
          ...c,
          searchTerms: c.searchTerms.filter(term => term.trim() !== ''),
        })),
      };

      await scoringAPI.create(scoringData);
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
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                Industry *
              </label>
              <select
                id="industry"
                name="industry"
                required
                value={formData.industry}
                onChange={handleInputChange}
                className="input-field"
              >
                <option value="">Select Industry</option>
                <option value="Dental Equipment">Dental Equipment</option>
                <option value="Medical Devices">Medical Devices</option>
                <option value="Pharmaceuticals">Pharmaceuticals</option>
                <option value="Healthcare IT">Healthcare IT</option>
                <option value="Biotechnology">Biotechnology</option>
              </select>
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
                      value={criterion.searchTerms.join(', ')}
                      onChange={(e) => handleCriterionChange(index, 'searchTerms', e.target.value)}
                      className="input-field"
                      placeholder="dental, equipment, practice (comma separated)"
                    />
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