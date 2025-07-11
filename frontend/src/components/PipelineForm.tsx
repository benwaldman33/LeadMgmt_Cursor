import React, { useState, useEffect } from 'react';
import { leadsAPI, campaignsAPI } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  PlayIcon, 
  DocumentTextIcon,
  BuildingOfficeIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface PipelineFormProps {
  onPipelineComplete?: () => void;
}

interface Campaign {
  id: string;
  name: string;
  industry: string;
  scoringModel?: {
    id: string;
    name: string;
  };
}

const PipelineForm: React.FC<PipelineFormProps> = ({ onPipelineComplete }) => {
  const [urls, setUrls] = useState<string>('');
  const [campaignId, setCampaignId] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await campaignsAPI.getAll();
      setCampaigns(response.campaigns || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    }
  };

  const validateUrls = (urlText: string): string[] => {
    const urlList = urlText
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    const validUrls: string[] = [];
    const invalidUrls: string[] = [];

    urlList.forEach(url => {
      try {
        // Add protocol if missing
        let processedUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          processedUrl = 'https://' + url;
        }
        new URL(processedUrl);
        validUrls.push(processedUrl);
      } catch {
        invalidUrls.push(url);
      }
    });

    if (invalidUrls.length > 0) {
      addNotification({
        type: 'error',
        title: 'Invalid URLs',
        message: `The following URLs are invalid: ${invalidUrls.join(', ')}`
      });
    }

    return validUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!urls.trim()) {
      addNotification({
        type: 'error',
        title: 'No URLs',
        message: 'Please enter at least one URL'
      });
      return;
    }

    if (!campaignId) {
      addNotification({
        type: 'error',
        title: 'No Campaign',
        message: 'Please select a campaign'
      });
      return;
    }

    // Validate URLs
    setValidating(true);
    const validUrls = validateUrls(urls);
    setValidating(false);

    if (validUrls.length === 0) {
      return;
    }

    // Check if selected campaign has a scoring model
    const selectedCampaign = campaigns.find(c => c.id === campaignId);
    if (!selectedCampaign?.scoringModel) {
      addNotification({
        type: 'error',
        title: 'No Scoring Model',
        message: 'Selected campaign must have a scoring model assigned'
      });
      return;
    }

    try {
      setLoading(true);
      
      const response = await leadsAPI.startPipeline({
        urls: validUrls,
        campaignId,
        industry: industry || undefined
      });

      addNotification({
        type: 'success',
        title: 'Pipeline Started',
        message: `Processing ${validUrls.length} URLs for campaign: ${selectedCampaign.name}`
      });

      // Clear form
      setUrls('');
      setCampaignId('');
      setIndustry('');

      // Notify parent component
      if (onPipelineComplete) {
        onPipelineComplete();
      }

    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Pipeline Failed',
        message: error.response?.data?.error || 'Failed to start pipeline'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCampaignsWithScoringModels = () => {
    return campaigns.filter(campaign => campaign.scoringModel);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <CogIcon className="h-6 w-6 text-primary-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Automated Pipeline</h3>
          <p className="text-sm text-gray-600">
            Process URLs through the complete workflow: Import → Scrape → Analyze → Score
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URLs Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URLs (one per line)
          </label>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            className="input-field w-full h-32"
            placeholder="https://example.com&#10;https://company.com&#10;https://business.org"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter URLs with or without protocol (https:// will be added automatically)
          </p>
        </div>

        {/* Campaign Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Campaign *
          </label>
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="input-field"
            required
          >
            <option value="">Select a campaign</option>
            {getCampaignsWithScoringModels().map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name} ({campaign.scoringModel?.name})
              </option>
            ))}
          </select>
          {campaigns.length > 0 && getCampaignsWithScoringModels().length === 0 && (
            <p className="text-sm text-red-600 mt-1">
              No campaigns have scoring models assigned. Please assign a scoring model to a campaign first.
            </p>
          )}
        </div>

        {/* Industry Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Industry (Optional)
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="input-field"
          >
            <option value="">Auto-detect from campaign</option>
            <option value="Dental Equipment">Dental Equipment</option>
            <option value="Medical Devices">Medical Devices</option>
            <option value="Pharmaceuticals">Pharmaceuticals</option>
            <option value="Healthcare IT">Healthcare IT</option>
            <option value="Biotechnology">Biotechnology</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to use the campaign's industry setting
          </p>
        </div>

        {/* Pipeline Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Pipeline Process</h4>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <DocumentTextIcon className="h-4 w-4" />
              <span>1. Import URLs and create leads</span>
            </div>
            <div className="flex items-center gap-2">
              <BuildingOfficeIcon className="h-4 w-4" />
              <span>2. Scrape websites and extract data</span>
            </div>
            <div className="flex items-center gap-2">
              <CogIcon className="h-4 w-4" />
              <span>3. Analyze content and apply scoring model</span>
            </div>
            <div className="flex items-center gap-2">
              <PlayIcon className="h-4 w-4" />
              <span>4. Generate scored leads with qualification status</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || validating}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Starting Pipeline...
              </>
            ) : validating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Validating URLs...
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4" />
                Start Pipeline
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PipelineForm; 