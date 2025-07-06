import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { leadsAPI, campaignsAPI, usersAPI, teamsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useFormValidation } from '../hooks/useFormValidation';
import { leadValidationSchema } from '../utils/validation';
import FormField from '../components/FormField';

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

const CreateLeadPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState('');

  const {
    values: formData,
    errors,
    touched,
    isValid,
    isSubmitting,
    handleChange,
    handleBlur,
    validateAll,
    setSubmitting,
    reset
  } = useFormValidation({
    schema: leadValidationSchema,
    initialValues: {
      url: '',
      companyName: '',
      domain: '',
      industry: '',
      campaignId: '',
      assignedToId: '',
      assignedTeamId: '',
    }
  });

  useEffect(() => {
    fetchCampaigns();
    fetchUsers();
    fetchTeams();
  }, []);

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
    handleChange(name as keyof typeof formData, value);
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
    const domain = extractDomain(url);
    handleChange('url', url);
    handleChange('domain', domain);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const validationErrors = await validateAll();
      if (Object.keys(validationErrors).length > 0) {
        setError('Please fix the validation errors');
        return;
      }

      const leadData = {
        url: formData.url,
        companyName: formData.companyName,
        domain: formData.domain,
        industry: formData.industry,
        campaignId: formData.campaignId,
        assignedToId: formData.assignedToId || undefined,
        assignedTeamId: formData.assignedTeamId || undefined,
      };

      await leadsAPI.create(leadData);
      navigate('/leads');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create lead');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/leads')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Lead</h1>
          <p className="text-gray-600">Add a new lead to a campaign</p>
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
            <FormField
              label="Campaign"
              name="campaignId"
              error={errors.campaignId}
              touched={touched.campaignId}
              required
            >
              <select
                id="campaignId"
                name="campaignId"
                required
                value={formData.campaignId}
                onChange={handleInputChange}
                onBlur={() => handleBlur('campaignId')}
                className={`input-field ${errors.campaignId && touched.campaignId ? 'border-red-500' : ''}`}
              >
                <option value="">Select a campaign</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name} ({campaign.industry})
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* URL */}
          <div className="md:col-span-2">
            <FormField
              label="Website URL"
              name="url"
              error={errors.url}
              touched={touched.url}
              required
            >
              <input
                type="url"
                id="url"
                name="url"
                required
                value={formData.url}
                onChange={handleUrlChange}
                onBlur={() => handleBlur('url')}
                className={`input-field ${errors.url && touched.url ? 'border-red-500' : ''}`}
                placeholder="https://example.com"
              />
            </FormField>
          </div>

          {/* Company Name */}
          <div className="md:col-span-2">
            <FormField
              label="Company Name"
              name="companyName"
              error={errors.companyName}
              touched={touched.companyName}
              required
            >
              <input
                type="text"
                id="companyName"
                name="companyName"
                required
                value={formData.companyName}
                onChange={handleInputChange}
                onBlur={() => handleBlur('companyName')}
                className={`input-field ${errors.companyName && touched.companyName ? 'border-red-500' : ''}`}
                placeholder="Enter company name"
              />
            </FormField>
          </div>

          {/* Domain */}
          <div>
            <FormField
              label="Domain"
              name="domain"
              error={errors.domain}
              touched={touched.domain}
              required
            >
              <input
                type="text"
                id="domain"
                name="domain"
                value={formData.domain}
                onChange={handleInputChange}
                onBlur={() => handleBlur('domain')}
                className={`input-field ${errors.domain && touched.domain ? 'border-red-500' : ''}`}
                placeholder="example.com"
              />
              <p className="mt-1 text-sm text-gray-500">
                Auto-extracted from URL, but you can edit it
              </p>
            </FormField>
          </div>

          {/* Industry */}
          <div>
            <FormField
              label="Industry"
              name="industry"
              error={errors.industry}
              touched={touched.industry}
              required
            >
              <input
                type="text"
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                onBlur={() => handleBlur('industry')}
                className={`input-field ${errors.industry && touched.industry ? 'border-red-500' : ''}`}
                placeholder="e.g., Dental Equipment"
              />
            </FormField>
          </div>

          {/* Assigned To */}
          <div>
            <FormField
              label="Assign To User"
              name="assignedToId"
              error={errors.assignedToId}
              touched={touched.assignedToId}
            >
              <select
                id="assignedToId"
                name="assignedToId"
                value={formData.assignedToId}
                onChange={handleInputChange}
                onBlur={() => handleBlur('assignedToId')}
                className={`input-field ${errors.assignedToId && touched.assignedToId ? 'border-red-500' : ''}`}
              >
                <option value="">No assignment</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} ({user.email})
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Assigned Team */}
          <div>
            <FormField
              label="Assign To Team"
              name="assignedTeamId"
              error={errors.assignedTeamId}
              touched={touched.assignedTeamId}
            >
              <select
                id="assignedTeamId"
                name="assignedTeamId"
                value={formData.assignedTeamId}
                onChange={handleInputChange}
                onBlur={() => handleBlur('assignedTeamId')}
                className={`input-field ${errors.assignedTeamId && touched.assignedTeamId ? 'border-red-500' : ''}`}
              >
                <option value="">No team assignment</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.industry})
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/leads')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex-1"
          >
            {isSubmitting ? 'Adding...' : 'Add Lead'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateLeadPage; 