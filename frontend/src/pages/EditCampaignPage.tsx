import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { campaignsAPI, teamsAPI, scoringAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Team {
  id: string;
  name: string;
  industry: string;
}

interface ScoringModel {
  id: string;
  name: string;
  industry: string;
}

interface Campaign {
  id: string;
  name: string;
  industry: string;
  status: string;
  targetLeadCount?: number;
  currentLeadCount: number;
  startDate?: string;
  targetEndDate?: string;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
  };
  assignedTeam?: {
    id: string;
    name: string;
  };
  scoringModel?: {
    id: string;
    name: string;
  };
}

const EditCampaignPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [scoringModels, setScoringModels] = useState<ScoringModel[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    status: 'PLANNING',
    assignedTeamId: '',
    scoringModelId: '',
    targetLeadCount: '',
    startDate: '',
    targetEndDate: '',
  });

  useEffect(() => {
    if (id) {
      fetchCampaign();
      fetchTeams();
      fetchScoringModels();
    }
  }, [id]);

  const fetchCampaign = async () => {
    try {
      const response = await campaignsAPI.getAll();
      const found = response.campaigns.find((c: Campaign) => c.id === id);
      if (!found) {
        setError('Campaign not found');
        return;
      }
      setCampaign(found);
      setFormData({
        name: found.name,
        industry: found.industry,
        status: found.status,
        assignedTeamId: found.assignedTeam?.id || '',
        scoringModelId: found.scoringModel?.id || '',
        targetLeadCount: found.targetLeadCount?.toString() || '',
        startDate: found.startDate ? new Date(found.startDate).toISOString().split('T')[0] : '',
        targetEndDate: found.targetEndDate ? new Date(found.targetEndDate).toISOString().split('T')[0] : '',
      });
    } catch (err: any) {
      setError('Failed to fetch campaign');
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await teamsAPI.getAll();
      setTeams(response.teams || []);
    } catch (err: any) {
      console.error('Failed to fetch teams:', err);
    }
  };

  const fetchScoringModels = async () => {
    try {
      const response = await scoringAPI.getAll();
      setScoringModels(response.scoringModels || []);
    } catch (err: any) {
      console.error('Failed to fetch scoring models:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const campaignData = {
        name: formData.name,
        industry: formData.industry,
        status: formData.status,
        assignedTeamId: formData.assignedTeamId || undefined,
        scoringModelId: formData.scoringModelId || undefined,
        targetLeadCount: formData.targetLeadCount ? parseInt(formData.targetLeadCount) : undefined,
        startDate: formData.startDate || undefined,
        targetEndDate: formData.targetEndDate || undefined,
      };

      await campaignsAPI.update(id!, campaignData);
      navigate('/campaigns');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update campaign');
    } finally {
      setLoading(false);
    }
  };

  if (!campaign) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/campaigns')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Campaign</h1>
          <p className="text-gray-600">Update campaign settings and scoring model</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campaign Name */}
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Enter campaign name"
            />
          </div>

          {/* Industry */}
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
              Industry *
            </label>
            <input
              type="text"
              id="industry"
              name="industry"
              required
              value={formData.industry}
              onChange={handleInputChange}
              className="input-field"
              placeholder="e.g., Dental Equipment"
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Assigned Team */}
          <div>
            <label htmlFor="assignedTeamId" className="block text-sm font-medium text-gray-700 mb-2">
              Assigned Team
            </label>
            <select
              id="assignedTeamId"
              name="assignedTeamId"
              value={formData.assignedTeamId}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value="">Select a team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.industry})
                </option>
              ))}
            </select>
          </div>

          {/* Scoring Model */}
          <div>
            <label htmlFor="scoringModelId" className="block text-sm font-medium text-gray-700 mb-2">
              Scoring Model
            </label>
            <select
              id="scoringModelId"
              name="scoringModelId"
              value={formData.scoringModelId}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value="">Select a scoring model (optional)</option>
              {scoringModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.industry})
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Choose a scoring model to automatically score leads in this campaign
            </p>
          </div>

          {/* Target Lead Count */}
          <div>
            <label htmlFor="targetLeadCount" className="block text-sm font-medium text-gray-700 mb-2">
              Target Lead Count
            </label>
            <input
              type="number"
              id="targetLeadCount"
              name="targetLeadCount"
              value={formData.targetLeadCount}
              onChange={handleInputChange}
              className="input-field"
              placeholder="e.g., 100"
              min="1"
            />
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="input-field"
            />
          </div>

          {/* Target End Date */}
          <div>
            <label htmlFor="targetEndDate" className="block text-sm font-medium text-gray-700 mb-2">
              Target End Date
            </label>
            <input
              type="date"
              id="targetEndDate"
              name="targetEndDate"
              value={formData.targetEndDate}
              onChange={handleInputChange}
              className="input-field"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/campaigns')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Updating...' : 'Update Campaign'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCampaignPage;
