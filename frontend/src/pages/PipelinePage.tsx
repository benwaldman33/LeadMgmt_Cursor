import React, { useState } from 'react';
import PipelineForm from '../components/PipelineForm';
import { 
  CogIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const PipelinePage: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);

  const handlePipelineComplete = () => {
    // This will be called when pipeline completes
    // Could refresh leads list or show results
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <CogIcon className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Automated Pipeline</h1>
              <p className="text-gray-600">
                Process URLs through the complete lead generation workflow
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
          >
            <InformationCircleIcon className="h-4 w-4" />
            {showInfo ? 'Hide' : 'Show'} Pipeline Information
          </button>
        </div>

        {/* Information Panel */}
        {showInfo && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">How the Pipeline Works</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-blue-800 mb-3">Pipeline Steps</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">URL Import</h4>
                      <p className="text-sm text-blue-700">
                        Validates URLs and creates basic lead records in the system
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">Web Scraping</h4>
                      <p className="text-sm text-blue-700">
                        Scrapes each website to extract company information, contact details, and content
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">Data Analysis</h4>
                      <p className="text-sm text-blue-700">
                        Analyzes scraped content to identify industry, services, and company details
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">Lead Scoring</h4>
                      <p className="text-sm text-blue-700">
                        Applies the campaign's scoring model to evaluate lead quality and qualification
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-blue-800 mb-3">Requirements</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Valid URLs</h4>
                      <p className="text-sm text-blue-700">
                        URLs must be accessible and contain company websites
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Campaign with Scoring Model</h4>
                      <p className="text-sm text-blue-700">
                        Selected campaign must have a scoring model assigned
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Processing Time</h4>
                      <p className="text-sm text-blue-700">
                        Each URL takes 10-30 seconds to process depending on website size
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Real-time Updates</h4>
                      <p className="text-sm text-blue-700">
                        Progress notifications will appear in real-time during processing
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-100 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Results</h3>
              <p className="text-sm text-blue-700">
                After processing, leads will be available in the Leads page with full enrichment data, 
                scoring results, and qualification status. Qualified leads (score ≥ 70) will be marked 
                for immediate follow-up.
              </p>
            </div>
          </div>
        )}

        {/* Pipeline Form */}
        <PipelineForm onPipelineComplete={handlePipelineComplete} />
      </div>
    </div>
  );
};

export default PipelinePage; 