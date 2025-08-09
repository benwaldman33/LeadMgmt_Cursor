import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { scoringAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

interface ScoringCriterion {
  id?: string;
  name: string;
  description: string;
  searchTerms: string[];
  searchTermsInput: string; // Raw input string for better UX
  weight: number;
  type: string;
}

interface ScoringModel {
  id: string;
  name: string;
  industry: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    fullName: string;
  };
  criteria: ScoringCriterion[];
}

const EditScoringModelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    industry: '',
  });

  const [criteria, setCriteria] = useState<ScoringCriterion[]>([]);

  useEffect(() => {
    if (id) {
      fetchScoringModel();
    }
  }, [id]);

  const fetchScoringModel = async () => {
    try {
      setLoading(true);
      const response = await scoringAPI.getById(id!);
      const model = response.scoringModel;
      
      setFormData({
        name: model.name,
        industry: model.industry,
      });

      // Parse criteria and convert searchTerms from JSON string to array
      const parsedCriteria = model.criteria.map((criterion: any) => {
        const searchTermsArray = typeof criterion.searchTerms === 'string' 
          ? JSON.parse(criterion.searchTerms) 
          : criterion.searchTerms;
        return {
          id: criterion.id,
          name: criterion.name,
          description: criterion.description || '',
          searchTerms: searchTermsArray,
          searchTermsInput: searchTermsArray.join(', '), // Store display string
          weight: criterion.weight,
          type: criterion.type,
        };
      });

      setCriteria(parsedCriteria);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch scoring model');
    } finally {
      setLoading(false);
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
    setSaving(true);
    setError('');

    // Validate total weight equals 100
    if (getTotalWeight() !== 100) {
      setError('Total weight must equal 100%');
      setSaving(false);
      return;
    }

    // Validate all criteria have names
    if (criteria.some(c => !c.name.trim())) {
      setError('All criteria must have names');
      setSaving(false);
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

      await scoringAPI.update(id!, scoringData);
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Scoring model updated successfully'
      });
      navigate('/scoring');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update scoring model');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this scoring model? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      await scoringAPI.delete(id!);
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Scoring model deleted successfully'
      });
      navigate('/scoring');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete scoring model');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    const newName = prompt('Enter a name for the duplicated model:', `${formData.name} (Copy)`);
    if (!newName) return;

    try {
      setSaving(true);
      await scoringAPI.duplicate(id!, newName);
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Scoring model duplicated successfully'
      });
      navigate('/scoring');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to duplicate scoring model');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Edit Scoring Model</h1>
          <p className="text-gray-600">Modify criteria for lead scoring</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDuplicate}
            disabled={saving}
            className="btn-secondary"
          >
            Duplicate
          </button>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="btn-secondary text-red-600 hover:text-red-800"
          >
            Delete
          </button>
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
                  <button
                    type="button"
                    onClick={() => removeCriterion(index)}
                    disabled={criteria.length === 1}
                    className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
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
                      placeholder="e.g., Technology Stack"
                      required
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
                      <option value="DOMAIN">Domain Match</option>
                      <option value="CONTENT">Content Quality</option>
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
                      onChange={(e) => handleCriterionChange(index, 'weight', parseInt(e.target.value))}
                      className="input-field"
                      required
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
                      required
                    />
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-500">
                        Separate multiple search terms with commas. Include spaces for multi-word phrases.
                      </p>
                      <p className="text-xs text-blue-600">
                        ✓ Example: "cone beam computed tomography, dental laser" creates 2 terms
                      </p>
                      {Array.isArray(criterion.searchTerms) && criterion.searchTerms.length > 0 && criterion.searchTerms[0] && (
                        <div className="text-xs">
                          <span className="text-gray-600">Search terms: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {criterion.searchTerms.filter(term => term && term.trim()).map((term, termIndex) => (
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
                      placeholder="Describe what this criterion evaluates..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

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
            disabled={saving || getTotalWeight() !== 100}
            className="btn-primary flex-1"
          >
            {saving ? 'Saving...' : 'Update Scoring Model'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditScoringModelPage; 