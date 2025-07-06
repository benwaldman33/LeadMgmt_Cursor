import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { leadsAPI, campaignsAPI, usersAPI, teamsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Campaign {
  id: string;
  name: string;
  industry: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  team?: {
    id: string;
    name: string;
  };
}

interface Team {
  id: string;
  name: string;
  industry: string;
}

interface Lead {
  id: string;
  url: string;
  companyName: string;
  domain: string;
  industry: string;
  status: string;
  campaignId: string;
  assignedToId?: string;
  assignedTeamId?: string;
  createdAt: string;
  updatedAt: string;
}

const EditLeadPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lead, setLead] = useState<Lead | null>(null);

  const [formData, setFormData] = useState({
    url: '',
    companyName: '',
    domain: '',
    industry: '',
    campaignId: '',
    status: 'RAW',
    assignedToId: '',
    assignedTeamId: '',
  });

  useEffect(() => {
    if (id) {
      fetchLead();
      fetchCampaigns();
      fetchUsers();
      fetchTeams();
    }
  }, [id]);

  const fetchLead = async () => {
    try {
      setLoading(true);
      const response = await leadsAPI.getById(id!);
      const leadData = response.lead;
      setLead(leadData);
      setFormData({
        url: leadData.url,
        companyName: leadData.companyName,
        domain: leadData.domain,
        industry: leadData.industry,
        campaignId: leadData.campaignId,
        status: leadData.status,
        assignedToId: leadData.assignedToId || '',
        assignedTeamId: leadData.assignedTeamId || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch lead');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await campaignsAPI.getAll();
      setCampaigns(response.campaigns || []);
    } catch (err: any) {
      console.error('Failed to fetch campaigns:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getForAssignment();
      setUsers(response.users || []);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const extractDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return '';
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData(prev => ({
      ...prev,
      url,
      domain: extractDomain(url)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const leadData = {
        url: formData.url,
        companyName: formData.companyName,
        domain: formData.domain,
        industry: formData.industry,
        campaignId: formData.campaignId,
        status: formData.status,
        assignedToId: formData.assignedToId || undefined,
        assignedTeamId: formData.assignedTeamId || undefined,
      };

      await leadsAPI.update(id!, leadData);
      navigate(`/leads/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update lead');
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

  if (!lead) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Lead not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/leads/${id}`)}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Lead</h1>
          <p className="text-gray-600">Update lead information</p>
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
          {/* Campaign */}
          <div className="md:col-span-2">
            <label htmlFor="campaignId" className="block text-sm font-medium text-gray-700 mb-2">
              Campaign *
            </label>
            <select
              id="campaignId"
              name="campaignId"
              required
              value={formData.campaignId}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value="">Select a campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} ({campaign.industry})
                </option>
              ))}
            </select>
          </div>

          {/* URL */}
          <div className="md:col-span-2">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              Website URL *
            </label>
            <input
              type="url"
              id="url"
              name="url"
              required
              value={formData.url}
              onChange={handleUrlChange}
              className="input-field"
              placeholder="https://example.com"
            />
          </div>

          {/* Company Name */}
          <div className="md:col-span-2">
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              required
              value={formData.companyName}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Enter company name"
            />
          </div>

          {/* Domain */}
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
              Domain
            </label>
            <input
              type="text"
              id="domain"
              name="domain"
              value={formData.domain}
              onChange={handleInputChange}
              className="input-field"
              placeholder="example.com"
            />
            <p className="mt-1 text-sm text-gray-500">
              Auto-extracted from URL, but you can edit it
            </p>
          </div>

          {/* Industry */}
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <input
              type="text"
              id="industry"
              name="industry"
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
              <option value="RAW">Raw</option>
              <option value="SCORED">Scored</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="DELIVERED">Delivered</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Assigned To */}
          <div>
            <label htmlFor="assignedToId" className="block text-sm font-medium text-gray-700 mb-2">
              Assigned To
            </label>
            <select
              id="assignedToId"
              name="assignedToId"
              value={formData.assignedToId}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} ({user.email})
                </option>
              ))}
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
              <option value="">No team assignment</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.industry})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(`/leads/${id}`)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditLeadPage; 