import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import { scoringAPI } from '../services/api';

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

const ScoringModelDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scoringModel, setScoringModel] = useState<ScoringModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchScoringModel();
    }
  }, [id]);

  const fetchScoringModel = async () => {
    try {
      setLoading(true);
      // For now, we'll get all models and filter by ID since we don't have a single model endpoint
      const response = await scoringAPI.getAll();
      const model = response.scoringModels.find((m: ScoringModel) => m.id === id);
      if (model) {
        setScoringModel(model);
      } else {
        setError('Scoring model not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch scoring model');
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

  const getTypeColor = (type: string) => {
    const colors = {
      'KEYWORD': 'bg-blue-100 text-blue-800',
      'DOMAIN': 'bg-green-100 text-green-800',
      'CONTENT': 'bg-purple-100 text-purple-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const parseSearchTerms = (searchTerms: string | string[]) => {
    if (typeof searchTerms === 'string') {
      try {
        return JSON.parse(searchTerms);
      } catch {
        return [];
      }
    }
    return searchTerms;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !scoringModel) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
        <p className="text-gray-600 mb-4">{error || 'Scoring model not found'}</p>
        <Link to="/scoring" className="btn-primary">
          Back to Scoring Models
        </Link>
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
          <h1 className="text-2xl font-bold text-gray-900">{scoringModel.name}</h1>
          <p className="text-gray-600">Scoring model details and criteria</p>
        </div>
        <Link
          to={`/scoring/${scoringModel.id}/edit`}
          className="btn-secondary flex items-center gap-2"
        >
          <PencilIcon className="h-4 w-4" />
          Edit
        </Link>
      </div>

      {/* Model Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Model Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Industry</label>
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${getIndustryColor(scoringModel.industry)}`}>
                {scoringModel.industry}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                scoringModel.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {scoringModel.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Created by</label>
              <p className="text-sm text-gray-900 mt-1">{scoringModel.createdBy.fullName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Created</label>
              <p className="text-sm text-gray-900 mt-1">{formatDate(scoringModel.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Criteria</label>
              <p className="text-2xl font-bold text-gray-900">{scoringModel.criteria.length}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Weight</label>
              <p className="text-2xl font-bold text-gray-900">
                {scoringModel.criteria.reduce((sum, criterion) => sum + criterion.weight, 0)}%
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Average Weight</label>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(scoringModel.criteria.reduce((sum, criterion) => sum + criterion.weight, 0) / scoringModel.criteria.length)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Criteria List */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Scoring Criteria</h2>
        <div className="space-y-4">
          {scoringModel.criteria.map((criterion, index) => (
            <div key={criterion.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{criterion.name}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(criterion.type)}`}>
                      {criterion.type}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {criterion.weight}%
                    </span>
                  </div>
                </div>
              </div>

              {criterion.description && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-sm text-gray-900">{criterion.description}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Terms</label>
                <div className="flex flex-wrap gap-2">
                  {parseSearchTerms(criterion.searchTerms).map((term: string, termIndex: number) => (
                    <span
                      key={termIndex}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScoringModelDetailPage; 