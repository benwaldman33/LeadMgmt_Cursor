import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, EyeIcon, PencilIcon, MagnifyingGlassIcon, TrashIcon, SparklesIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { leadsAPI, campaignsAPI, scoringAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  showBulkStatusUpdated, 
  showBulkScored, 
  showBulkEnriched, 
  showBulkDeleted,
  showNetworkError 
} from '../utils/notifications';

interface Lead {
  id: string;
  url: string;
  companyName: string;
  domain: string;
  industry: string;
  status: string;
  score?: number;
  createdAt: string;
  lastScoredAt?: string;
  campaign: {
    id: string;
    name: string;
  };
  assignedTo?: {
    id: string;
    fullName: string;
  };
  assignedTeam?: {
    id: string;
    name: string;
  };
}

interface Campaign {
  id: string;
  name: string;
  industry: string;
}

interface ScoringModel {
  id: string;
  name: string;
  industry: string;
}

const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [scoringModels, setScoringModels] = useState<ScoringModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const { addNotification } = useNotifications();
  const [filters, setFilters] = useState({
    campaignId: '',
    status: '',
    search: '',
  });

  useEffect(() => {
    fetchLeads();
    fetchCampaigns();
    fetchScoringModels();
  }, [filters]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.campaignId) params.campaignId = filters.campaignId;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      
      const response = await leadsAPI.getAll(params);
      setLeads(response.leads || []);
    } catch (err: any) {
      addNotification(showNetworkError());
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

  const fetchScoringModels = async () => {
    try {
      const response = await scoringAPI.getAll();
      setScoringModels(response.scoringModels || []);
    } catch (err: any) {
      console.error('Failed to fetch scoring models:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RAW':
        return 'bg-gray-100 text-gray-800';
      case 'SCORED':
        return 'bg-blue-100 text-blue-800';
      case 'QUALIFIED':
        return 'bg-green-100 text-green-800';
      case 'DELIVERED':
        return 'bg-purple-100 text-purple-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(lead => lead.id));
    }
  };

  const handleBulkAction = async (action: string, additionalData?: any) => {
    if (selectedLeads.length === 0) return;

    try {
      setBulkActionLoading(true);
      
      switch (action) {
        case 'status':
          const statusResponse = await leadsAPI.bulkUpdateStatus(selectedLeads, additionalData.status);
          addNotification(showBulkStatusUpdated(statusResponse.updatedCount));
          break;
        case 'score':
          const scoreResponse = await leadsAPI.bulkScore(selectedLeads, additionalData.scoringModelId);
          addNotification(showBulkScored(scoreResponse.scoredCount, scoreResponse.qualifiedCount));
          break;
        case 'enrich':
          const enrichResponse = await leadsAPI.bulkEnrich(selectedLeads);
          addNotification(showBulkEnriched(enrichResponse.enrichedCount));
          break;
        case 'delete':
          if (window.confirm(`Are you sure you want to delete ${selectedLeads.length} leads? This action cannot be undone.`)) {
            const deleteResponse = await leadsAPI.bulkDelete(selectedLeads);
            addNotification(showBulkDeleted(deleteResponse.deletedCount));
          } else {
            return;
          }
          break;
      }

      // Refresh leads and clear selection
      await fetchLeads();
      setSelectedLeads([]);
    } catch (err: any) {
      addNotification(showNetworkError());
    } finally {
      setBulkActionLoading(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">Manage and score your leads</p>
        </div>
        <Link
          to="/leads/new"
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Lead
        </Link>
      </div>

      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedLeads([])}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear selection
              </button>
            </div>
            <div className="flex gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkAction('status', { status: e.target.value });
                    e.target.value = '';
                  }
                }}
                disabled={bulkActionLoading}
                className="input-field text-sm"
              >
                <option value="">Update Status</option>
                <option value="RAW">Raw</option>
                <option value="SCORED">Scored</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="DELIVERED">Delivered</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkAction('score', { scoringModelId: e.target.value });
                    e.target.value = '';
                  }
                }}
                disabled={bulkActionLoading}
                className="input-field text-sm"
              >
                <option value="">Score with Model</option>
                {scoringModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleBulkAction('enrich')}
                disabled={bulkActionLoading}
                className="btn-secondary text-sm flex items-center gap-1"
              >
                <SparklesIcon className="h-4 w-4" />
                {bulkActionLoading ? 'Enriching...' : 'Enrich'}
              </button>

              <button
                onClick={() => handleBulkAction('delete')}
                disabled={bulkActionLoading}
                className="btn-secondary text-sm flex items-center gap-1 text-red-600 hover:text-red-800"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign
            </label>
            <select
              value={filters.campaignId}
              onChange={(e) => handleFilterChange('campaignId', e.target.value)}
              className="input-field"
            >
              <option value="">All Campaigns</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input-field"
            >
              <option value="">All Statuses</option>
              <option value="RAW">Raw</option>
              <option value="SCORED">Scored</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="DELIVERED">Delivered</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input-field pl-10"
                placeholder="Company name or domain..."
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ campaignId: '', status: '', search: '' })}
              className="btn-secondary w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>



      {/* Leads Table */}
      {leads.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <PlusIcon className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.campaignId || filters.status || filters.search 
              ? 'Try adjusting your filters or add new leads.'
              : 'Get started by adding your first lead.'
            }
          </p>
          <div className="mt-6">
            <Link to="/leads/new" className="btn-primary">
              Add Lead
            </Link>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedLeads.length === leads.length && leads.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lead.companyName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {lead.domain}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {lead.campaign.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {lead.score ? `${lead.score.toFixed(1)}%` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {lead.assignedTo?.fullName || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {lead.assignedTeam?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(lead.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/leads/${lead.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/leads/${lead.id}/edit`}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage; 