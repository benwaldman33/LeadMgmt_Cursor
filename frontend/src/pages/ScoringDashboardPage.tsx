import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlayIcon, ChartBarIcon, EyeIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { scoringAPI, campaignsAPI, leadsAPI } from '../services/api';

interface Campaign {
  id: string;
  name: string;
  industry: string;
  status: string;
  currentLeadCount: number;
  scoringModel?: {
    id: string;
    name: string;
  };
}

interface ScoringStats {
  totalLeads: number;
  scoredLeads: number;
  qualifiedLeads: number;
  averageScore: number;
}

const ScoringDashboardPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<ScoringStats>({
    totalLeads: 0,
    scoredLeads: 0,
    qualifiedLeads: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [scoringLoading, setScoringLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campaignsResponse, leadsResponse] = await Promise.all([
        campaignsAPI.getAll(),
        leadsAPI.getAll()
      ]);

      setCampaigns(campaignsResponse.campaigns || []);
      
      // Calculate stats from leads
      const leads = leadsResponse.leads || [];
      const scoredLeads = leads.filter((lead: any) => lead.status !== 'RAW').length;
      const qualifiedLeads = leads.filter((lead: any) => lead.status === 'QUALIFIED').length;
      const scoredLeadScores = leads.filter((lead: any) => lead.score !== null).map((lead: any) => lead.score || 0);
      const averageScore = scoredLeadScores.length > 0 
        ? Math.round(scoredLeadScores.reduce((sum: number, score: number) => sum + score, 0) / scoredLeadScores.length)
        : 0;

      setStats({
        totalLeads: leads.length,
        scoredLeads,
        qualifiedLeads,
        averageScore,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreCampaign = async (campaignId: string) => {
    try {
      setScoringLoading(campaignId);
      await scoringAPI.scoreCampaign(campaignId);
      await fetchData(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to score campaign');
    } finally {
      setScoringLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return 'bg-gray-100 text-gray-800';
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
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
          <h1 className="text-2xl font-bold text-gray-900">Scoring Dashboard</h1>
          <p className="text-gray-600">Monitor and manage lead scoring</p>
        </div>
        <Link
          to="/scoring"
          className="btn-primary flex items-center gap-2"
        >
          <ChartBarIcon className="h-5 w-5" />
          Scoring Models
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalLeads}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Scored Leads</p>
              <p className="text-2xl font-bold text-gray-900">{stats.scoredLeads}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <EyeIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Qualified Leads</p>
              <p className="text-2xl font-bold text-gray-900">{stats.qualifiedLeads}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
                {stats.averageScore}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns with Scoring Models */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaigns Ready for Scoring</h2>
        
        {campaigns.filter(c => c.scoringModel).length === 0 ? (
          <div className="text-center py-8">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns ready for scoring</h3>
            <p className="mt-1 text-sm text-gray-500">
              Campaigns need scoring models assigned to be scored.
            </p>
            <div className="mt-6">
              <Link to="/campaigns" className="btn-primary">
                Manage Campaigns
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scoring Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leads
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns
                  .filter(campaign => campaign.scoringModel)
                  .map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {campaign.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {campaign.industry}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {campaign.scoringModel?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {campaign.currentLeadCount} leads
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleScoreCampaign(campaign.id)}
                          disabled={scoringLoading === campaign.id || campaign.currentLeadCount === 0}
                          className="btn-secondary flex items-center gap-2 ml-auto"
                        >
                          {scoringLoading === campaign.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <PlayIcon className="h-4 w-4" />
                          )}
                          {scoringLoading === campaign.id ? 'Scoring...' : 'Score Campaign'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/leads"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">View All Leads</p>
                <p className="text-sm text-gray-500">See scoring results and lead status</p>
              </div>
              <EyeIcon className="h-5 w-5 text-gray-400" />
            </Link>
            
            <Link
              to="/scoring"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">Manage Scoring Models</p>
                <p className="text-sm text-gray-500">Create and edit scoring criteria</p>
              </div>
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scoring Insights</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Scoring Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalLeads > 0 ? Math.round((stats.scoredLeads / stats.totalLeads) * 100) : 0}%
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Qualification Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.scoredLeads > 0 ? Math.round((stats.qualifiedLeads / stats.scoredLeads) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoringDashboardPage; 