import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { campaignsAPI } from '../services/api';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  PencilIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

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
}

const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getAll();
      setCampaigns(response.campaigns || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch campaigns';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PLANNING':
        return 'bg-blue-100 text-blue-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600">Manage your lead scoring campaigns</p>
        </div>
        <Link
          to="/campaigns/new"
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          New Campaign
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <PlusIcon className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first campaign.
          </p>
          <div className="mt-6">
            <Link to="/campaigns/new" className="btn-primary">
              Create Campaign
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {campaign.name}
                  </h3>
                  <p className="text-sm text-gray-600">{campaign.industry}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                  {campaign.status}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Leads:</span>
                  <span className="font-medium">
                    {campaign.currentLeadCount}
                    {campaign.targetLeadCount && ` / ${campaign.targetLeadCount}`}
                  </span>
                </div>
                {campaign.startDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Start Date:</span>
                    <span>{formatDate(campaign.startDate)}</span>
                  </div>
                )}
                {campaign.targetEndDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Target End:</span>
                    <span>{formatDate(campaign.targetEndDate)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Created by:</span>
                  <span>{campaign.createdBy.fullName}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/campaigns/${campaign.id}`}
                  className="flex-1 btn-secondary flex items-center justify-center gap-1"
                >
                  <EyeIcon className="h-4 w-4" />
                  View
                </Link>
                <Link
                  to={`/campaigns/${campaign.id}/edit`}
                  className="flex-1 btn-secondary flex items-center justify-center gap-1"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CampaignsPage; 