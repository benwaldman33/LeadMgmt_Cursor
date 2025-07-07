import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { scoringAPI } from '../services/api';
import {
  PlusIcon,
  PencilIcon,
  EyeIcon,
  TrashIcon,
  ChartBarIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

interface ScoringCriterion {
  id: string;
  name: string;
  description?: string;
  searchTerms: string | string[];
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

const ScoringModelsPage: React.FC = () => {
  const [scoringModels, setScoringModels] = useState<ScoringModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    industry: '',
  });

  useEffect(() => {
    fetchScoringModels();
  }, [filters]);

  const fetchScoringModels = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {};
      if (filters.industry) params.industry = filters.industry;
      
      const response = await scoringAPI.getAll(params);
      setScoringModels(response.scoringModels || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch scoring models';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getIndustryColor = (industry: string) => {
    const colors = {
      'Dental Equipment': 'bg-blue-100 text-blue-800',
      'Medical Devices': 'bg-green-100 text-green-800',
      'Pharmaceuticals': 'bg-purple-100 text-purple-800',
      'Healthcare IT': 'bg-orange-100 text-orange-800',
      'Biotechnology': 'bg-red-100 text-red-800',
    };
    return colors[industry as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleFilterChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      industry: value
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scoring Models</h1>
          <p className="text-gray-600">Define how leads should be scored</p>
        </div>
        <Link
          to="/scoring/new"
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Create Model
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry
            </label>
            <select
              value={filters.industry}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="input-field"
            >
              <option value="">All Industries</option>
              <option value="Dental Equipment">Dental Equipment</option>
              <option value="Medical Devices">Medical Devices</option>
              <option value="Pharmaceuticals">Pharmaceuticals</option>
              <option value="Healthcare IT">Healthcare IT</option>
              <option value="Biotechnology">Biotechnology</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ industry: '' })}
              className="btn-secondary w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Scoring Models Grid */}
      {scoringModels.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <PlusIcon className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No scoring models found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.industry 
              ? 'Try adjusting your filters or create a new scoring model.'
              : 'Get started by creating your first scoring model.'
            }
          </p>
          <div className="mt-6">
            <Link to="/scoring/new" className="btn-primary">
              Create Model
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scoringModels.map((model) => (
            <div key={model.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {model.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getIndustryColor(model.industry)}`}>
                    {model.industry}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/scoring/${model.id}`}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Link>
                  <Link
                    to={`/scoring/${model.id}/edit`}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Criteria</p>
                  <p className="text-sm font-medium text-gray-900">
                    {model.criteria.length} criteria
                  </p>
                  <p className="text-xs text-gray-500">
                    {typeof model.criteria[0]?.searchTerms === 'string' 
                      ? JSON.parse(model.criteria[0].searchTerms as string).length + ' terms'
                      : 'Multiple terms'
                    }
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Weight</p>
                  <p className="text-sm font-medium text-gray-900">
                    {model.criteria.reduce((sum, criterion) => sum + criterion.weight, 0)}%
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Created by</p>
                  <p className="text-sm font-medium text-gray-900">
                    {model.createdBy.fullName}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Created</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(model.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    model.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {model.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Link
                    to={`/scoring/${model.id}`}
                    className="text-sm text-primary-600 hover:text-primary-900 font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScoringModelsPage; 