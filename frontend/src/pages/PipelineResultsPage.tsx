import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, ChartBarIcon, EyeIcon } from '@heroicons/react/24/outline';
import { leadsAPI } from '../services/api';

interface CriterionScore {
  criterionName: string;
  criterionDescription?: string;
  score: number;
  matchedContent: string[];
  confidence: number;
  weight: number;
}

interface Lead {
  id: string;
  url: string;
  companyName: string;
  domain: string;
  score: number;
  confidence: number;
  criteriaScores: CriterionScore[];
  createdAt: string;
}

interface ScoringModel {
  id: string;
  name: string;
  industry: string;
}

interface PipelineResults {
  leads: Lead[];
  scoringModel: ScoringModel;
}

const PipelineResultsPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [results, setResults] = useState<PipelineResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (campaignId) {
      fetchResults();
    }
  }, [campaignId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const data = await leadsAPI.getDetailedPipelineResults(campaignId!);
      setResults(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch pipeline results');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    if (score >= 10) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'High';
    if (score >= 40) return 'Medium';
    if (score >= 10) return 'Low';
    return 'Very Low';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 bg-white rounded shadow text-center text-red-600">
        {error}
      </div>
    );
  }

  if (!results) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/campaigns" className="text-gray-600 hover:text-gray-900">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Results</h1>
          <p className="text-gray-600">
            Detailed scoring breakdown for {results.scoringModel.name} ({results.scoringModel.industry})
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900">{results.leads.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold text-sm">H</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">High Score (70+)</p>
              <p className="text-2xl font-bold text-gray-900">
                {results.leads.filter(l => l.score >= 70).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 font-bold text-sm">M</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Medium Score (40-69)</p>
              <p className="text-2xl font-bold text-gray-900">
                {results.leads.filter(l => l.score >= 40 && l.score < 70).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold text-sm">L</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Low Score (&lt;40)</p>
              <p className="text-2xl font-bold text-gray-900">
                {results.leads.filter(l => l.score < 40).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Leads List - Ranked by Score */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Leads Ranked by Score</h3>
          <p className="text-sm text-gray-500">Sorted from highest to lowest score</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {results.leads.map((lead, index) => (
            <div key={lead.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <h4 className="text-lg font-semibold text-gray-900">{lead.companyName}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScoreColor(lead.score)}`}>
                      {getScoreLabel(lead.score)} ({lead.score}pts)
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    <p><strong>Domain:</strong> {lead.domain}</p>
                    <p><strong>URL:</strong> <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{lead.url}</a></p>
                    <p><strong>Confidence:</strong> {lead.confidence.toFixed(1)}%</p>
                  </div>

                  {/* Criteria Scores */}
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Scoring Breakdown:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {lead.criteriaScores.map((criterion, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{criterion.criterionName}</span>
                            <span className="text-sm font-bold text-gray-900">{criterion.score}pts</span>
                          </div>
                          <div className="text-xs text-gray-500 mb-1">
                            Weight: {criterion.weight}% | Confidence: {criterion.confidence.toFixed(1)}%
                          </div>
                          {criterion.criterionDescription && (
                            <div className="text-xs text-gray-600 mb-1">{criterion.criterionDescription}</div>
                          )}
                          {criterion.matchedContent.length > 0 && (
                            <div className="text-xs">
                              <span className="text-gray-500">Matched:</span>
                              <span className="text-green-600 font-medium ml-1">
                                {criterion.matchedContent.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex-shrink-0">
                  <Link
                    to={`/leads/${lead.id}`}
                    className="btn-secondary flex items-center gap-1"
                  >
                    <EyeIcon className="h-4 w-4" />
                    View Lead
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {results.leads.length === 0 && (
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No leads have been processed for this campaign yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PipelineResultsPage;
