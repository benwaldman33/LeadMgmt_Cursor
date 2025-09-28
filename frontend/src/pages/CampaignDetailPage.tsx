import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { campaignsAPI } from '../services/api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

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

const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchCampaign();
    }
    // eslint-disable-next-line
  }, [id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getAll();
      const found = response.campaigns.find((c: Campaign) => c.id === id);
      if (!found) {
        setError('Campaign not found');
        return;
      }
      setCampaign(found);
    } catch (err: any) {
      setError('Failed to fetch campaign');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  if (error) {
    return <div className="max-w-xl mx-auto mt-16 p-8 bg-white rounded shadow text-center text-red-600">{error}</div>;
  }

  if (!campaign) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/campaigns')} className="text-gray-600 hover:text-gray-900">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
      </div>
      <div className="card p-6 space-y-4">
        <div><strong>Industry:</strong> {campaign.industry}</div>
        <div><strong>Status:</strong> {campaign.status}</div>
        <div><strong>Leads:</strong> {campaign.currentLeadCount}{campaign.targetLeadCount && ` / ${campaign.targetLeadCount}`}</div>
        {campaign.startDate && <div><strong>Start Date:</strong> {new Date(campaign.startDate).toLocaleDateString()}</div>}
        {campaign.targetEndDate && <div><strong>Target End:</strong> {new Date(campaign.targetEndDate).toLocaleDateString()}</div>}
        <div><strong>Created By:</strong> {campaign.createdBy.fullName}</div>
        {campaign.assignedTeam && <div><strong>Assigned Team:</strong> {campaign.assignedTeam.name}</div>}
        {campaign.scoringModel && (
          <div>
            <strong>Scoring Model:</strong> 
            <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 text-sm font-medium rounded">
              {campaign.scoringModel.name}
            </span>
          </div>
        )}
        <div><strong>Created At:</strong> {new Date(campaign.createdAt).toLocaleString()}</div>
      </div>
    </div>
  );
};

export default CampaignDetailPage; 