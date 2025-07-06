import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { leadsAPI, campaignsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Campaign {
  id: string;
  name: string;
  industry: string;
}

const CreateLeadPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    url: '',
    companyName: '',
    domain: '',
    industry: '',
    campaignId: '',
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await campaignsAPI.getAll();
      setCampaigns(response.campaigns || []);
    } catch (err: any) {
      console.error('Failed to fetch campaigns:', err);
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
    setLoading(true);
    setError('');

    try {
      const leadData = {
        url: formData.url,
        companyName: formData.companyName,
        domain: formData.domain,
        industry: formData.industry,
        campaignId: formData.campaignId,
      };

      await leadsAPI.create(leadData);
      navigate('/leads');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create lead');
    } finally {
      setLoading(false);
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
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Adding...' : 'Add Lead'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateLeadPage; 