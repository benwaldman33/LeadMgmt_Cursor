import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, ChartBarIcon, GlobeAltIcon, BuildingOfficeIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { leadsAPI, scoringAPI } from '../services/api';

interface Contact {
  id: string;
  name: string;
  email?: string;
  title?: string;
  linkedinUrl?: string;
  isPrimaryContact: boolean;
}

interface LeadEnrichment {
  id: string;
  companySize?: number;
  revenue?: string;
  industry?: string;
  technologies: string;
  source: string;
  enrichedAt: string;
  contacts: Contact[];
}

interface CriterionScore {
  id: string;
  criterionId: string;
  score: number;
  matchedContent: string;
  confidence: number;
}

interface ScoringResult {
  id: string;
  totalScore: number;
  confidence: number;
  scoredAt: string;
  scoringModelVersion: string;
  criteriaScores: CriterionScore[];
}

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
    industry: string;
    scoringModel?: {
      id: string;
      name: string;
    };
  };
  assignedTo?: {
    id: string;
    fullName: string;
  };
  assignedTeam?: {
    id: string;
    name: string;
  };
  scoringDetails?: ScoringResult;
  enrichment?: LeadEnrichment;
}

const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchLeadData();
    }
  }, [id]);

  const fetchLeadData = async () => {
    try {
      setLoading(true);
      
      // Get lead data
      const leadsResponse = await leadsAPI.getAll();
      const foundLead = leadsResponse.leads.find((l: Lead) => l.id === id);
      
      if (!foundLead) {
        setError('Lead not found');
        return;
      }

      setLead(foundLead);

      // Get scoring results if available
      if (foundLead.scoringDetails) {
        try {
          const scoringResponse = await scoringAPI.getResults(id!);
          setScoringResult(scoringResponse.scoringResult);
        } catch (err) {
          console.error('Failed to fetch scoring results:', err);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch lead data');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrichLead = async () => {
    if (!id) return;
    
    try {
      setEnriching(true);
      await leadsAPI.enrich(id);
      // Refresh lead data to get the new enrichment
      await fetchLeadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to enrich lead');
    } finally {
      setEnriching(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const parseMatchedContent = (matchedContent: string) => {
    try {
      return JSON.parse(matchedContent);
    } catch {
      return [];
    }
  };

  const parseTechnologies = (technologies: string) => {
    try {
      return JSON.parse(technologies);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
        <p className="text-gray-600 mb-4">{error || 'Lead not found'}</p>
        <Link to="/leads" className="btn-primary">
          Back to Leads
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/leads')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{lead.companyName}</h1>
          <p className="text-gray-600">Lead details and scoring results</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEnrichLead}
            disabled={enriching}
            className="btn-secondary flex items-center gap-2"
          >
            <SparklesIcon className="h-4 w-4" />
            {enriching ? 'Enriching...' : 'Enrich Lead'}
          </button>
          <Link
            to={`/leads/${lead.id}/edit`}
            className="btn-secondary flex items-center gap-2"
          >
            <PencilIcon className="h-4 w-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Lead Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <p className="text-sm text-gray-900">{lead.companyName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                <p className="text-sm text-gray-900">{lead.domain}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <p className="text-sm text-gray-900">{lead.industry}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <a 
                  href={lead.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-900 break-all"
                >
                  {lead.url}
                </a>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <p className="text-sm text-gray-900">
                  {lead.assignedTo?.fullName || 'Unassigned'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Team</label>
                <p className="text-sm text-gray-900">
                  {lead.assignedTeam?.name || 'No team assignment'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                <p className="text-sm text-gray-900">{formatDate(lead.createdAt)}</p>
              </div>
              {lead.lastScoredAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Scored</label>
                  <p className="text-sm text-gray-900">{formatDate(lead.lastScoredAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Campaign Information */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
                <p className="text-sm text-gray-900">{lead.campaign.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Industry</label>
                <p className="text-sm text-gray-900">{lead.campaign.industry}</p>
              </div>
              {lead.campaign.scoringModel && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scoring Model</label>
                  <p className="text-sm text-gray-900">{lead.campaign.scoringModel.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Enrichment Information */}
          {lead.enrichment && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Enrichment Data</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {lead.enrichment.companySize && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                    <p className="text-sm text-gray-900">{lead.enrichment.companySize} employees</p>
                  </div>
                )}
                {lead.enrichment.revenue && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Revenue</label>
                    <p className="text-sm text-gray-900">{lead.enrichment.revenue}</p>
                  </div>
                )}
                {lead.enrichment.industry && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enriched Industry</label>
                    <p className="text-sm text-gray-900">{lead.enrichment.industry}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enriched At</label>
                  <p className="text-sm text-gray-900">{formatDate(lead.enrichment.enrichedAt)}</p>
                </div>
                {lead.enrichment.technologies && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Technologies</label>
                    <div className="flex flex-wrap gap-2">
                      {parseTechnologies(lead.enrichment.technologies).map((tech: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Contacts */}
              {lead.enrichment.contacts && lead.enrichment.contacts.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-3">Contacts</h3>
                  <div className="space-y-3">
                    {lead.enrichment.contacts.map((contact) => (
                      <div key={contact.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                            {contact.title && (
                              <p className="text-sm text-gray-500">{contact.title}</p>
                            )}
                            {contact.email && (
                              <p className="text-sm text-gray-500">{contact.email}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {contact.isPrimaryContact && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                Primary
                              </span>
                            )}
                            {contact.linkedinUrl && (
                              <a
                                href={contact.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-900"
                              >
                                <GlobeAltIcon className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scoring Summary */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Scoring Summary</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overall Score</label>
                <p className={`text-3xl font-bold ${getScoreColor(lead.score || 0)}`}>
                  {lead.score || 0}%
                </p>
              </div>
              {scoringResult && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confidence</label>
                    <p className="text-2xl font-bold text-gray-900">
                      {scoringResult.confidence}%
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scored At</label>
                    <p className="text-sm text-gray-900">{formatDate(scoringResult.scoredAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model Version</label>
                    <p className="text-sm text-gray-900">{scoringResult.scoringModelVersion}</p>
                  </div>
                </>
              )}
              {!scoringResult && (
                <div className="text-center py-4">
                  <ChartBarIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">No scoring results available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scoring Details */}
      {scoringResult && scoringResult.criteriaScores.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scoring Criteria Breakdown</h2>
          <div className="space-y-4">
            {scoringResult.criteriaScores.map((criterionScore, index) => (
              <div key={criterionScore.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-md font-medium text-gray-900">
                      Criterion {index + 1}
                    </h3>
                    <p className="text-sm text-gray-500">ID: {criterionScore.criterionId}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${getScoreColor(criterionScore.score)}`}>
                      {criterionScore.score}%
                    </p>
                    <p className="text-sm text-gray-500">Confidence: {criterionScore.confidence}%</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Matched Content</label>
                  <div className="flex flex-wrap gap-2">
                    {parseMatchedContent(criterionScore.matchedContent).length > 0 ? (
                      parseMatchedContent(criterionScore.matchedContent).map((term: string, termIndex: number) => (
                        <span
                          key={termIndex}
                          className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
                        >
                          {term}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No matches found</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/leads"
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">Back to Leads</p>
              <p className="text-sm text-gray-500">View all leads</p>
            </div>
            <ArrowLeftIcon className="h-5 w-5 text-gray-400" />
          </Link>
          
          <Link
            to={`/campaigns/${lead.campaign.id}`}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">View Campaign</p>
              <p className="text-sm text-gray-500">See campaign details</p>
            </div>
            <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
          </Link>
          
          {lead.campaign.scoringModel && (
            <Link
              to={`/scoring/${lead.campaign.scoringModel.id}`}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">Scoring Model</p>
                <p className="text-sm text-gray-500">View scoring criteria</p>
              </div>
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadDetailPage; 