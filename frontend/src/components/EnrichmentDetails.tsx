import React, { useState, useEffect } from 'react';
import { leadsAPI } from '../services/api';
import { 
  DocumentTextIcon, 
  BuildingOfficeIcon, 
  CogIcon, 
  UserGroupIcon,
  GlobeAltIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface EnrichmentDetailsProps {
  leadId: string;
}

interface EnrichmentData {
  id: string;
  companySize?: number;
  revenue?: string;
  industry?: string;
  technologies: string[];
  scrapedContent?: string;
  pageTitle?: string;
  pageDescription?: string;
  pageKeywords: string[];
  pageLanguage?: string;
  lastModified?: string;
  companyName?: string;
  services: string[];
  certifications: string[];
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  processingTime?: number;
  scrapingSuccess: boolean;
  scrapingError?: string;
  source: string;
  enrichedAt: string;
  contacts: Array<{
    id: string;
    name: string;
    email?: string;
    title?: string;
    linkedinUrl?: string;
    isPrimaryContact: boolean;
  }>;
}

const EnrichmentDetails: React.FC<EnrichmentDetailsProps> = ({ leadId }) => {
  const [enrichment, setEnrichment] = useState<EnrichmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEnrichment();
  }, [leadId]);

  const fetchEnrichment = async () => {
    try {
      setLoading(true);
      const response = await leadsAPI.getEnrichment(leadId);
      setEnrichment(response.enrichment);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch enrichment data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (!enrichment) {
    return (
      <div className="text-center py-8">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No enrichment data</h3>
        <p className="mt-1 text-sm text-gray-500">
          This lead hasn't been enriched yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Enrichment Details</h3>
          <p className="text-sm text-gray-600">
            Data scraped from {enrichment.source} on {new Date(enrichment.enrichedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Status */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        enrichment.scrapingSuccess 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {enrichment.scrapingSuccess ? 'Successfully Enriched' : 'Enrichment Failed'}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <div className="card p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BuildingOfficeIcon className="h-5 w-5" />
            Company Information
          </h4>
          <div className="space-y-3">
            {enrichment.companyName && (
              <div>
                <label className="text-sm font-medium text-gray-700">Company Name</label>
                <p className="text-sm text-gray-900">{enrichment.companyName}</p>
              </div>
            )}
            {enrichment.industry && (
              <div>
                <label className="text-sm font-medium text-gray-700">Industry</label>
                <p className="text-sm text-gray-900">{enrichment.industry}</p>
              </div>
            )}
            {enrichment.companySize && (
              <div>
                <label className="text-sm font-medium text-gray-700">Company Size</label>
                <p className="text-sm text-gray-900">{enrichment.companySize} employees</p>
              </div>
            )}
            {enrichment.revenue && (
              <div>
                <label className="text-sm font-medium text-gray-700">Revenue</label>
                <p className="text-sm text-gray-900">{enrichment.revenue}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="card p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5" />
            Contact Information
          </h4>
          <div className="space-y-3">
            {enrichment.contactEmail && (
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{enrichment.contactEmail}</p>
              </div>
            )}
            {enrichment.contactPhone && (
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="text-sm text-gray-900">{enrichment.contactPhone}</p>
              </div>
            )}
            {enrichment.contactAddress && (
              <div>
                <label className="text-sm font-medium text-gray-700">Address</label>
                <p className="text-sm text-gray-900">{enrichment.contactAddress}</p>
              </div>
            )}
            {enrichment.contacts.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Additional Contacts</label>
                <div className="space-y-1">
                  {enrichment.contacts.map((contact, index) => (
                    <div key={contact.id} className="text-sm text-gray-900">
                      {contact.name} - {contact.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Technologies & Services */}
        <div className="card p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CogIcon className="h-5 w-5" />
            Technologies & Services
          </h4>
          <div className="space-y-4">
            {enrichment.technologies.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Technologies</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {enrichment.technologies.map((tech, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {enrichment.services.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Services</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {enrichment.services.map((service, index) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {enrichment.certifications.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Certifications</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {enrichment.certifications.map((cert, index) => (
                    <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page Metadata */}
        <div className="card p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5" />
            Page Information
          </h4>
          <div className="space-y-3">
            {enrichment.pageTitle && (
              <div>
                <label className="text-sm font-medium text-gray-700">Page Title</label>
                <p className="text-sm text-gray-900">{enrichment.pageTitle}</p>
              </div>
            )}
            {enrichment.pageDescription && (
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900">{enrichment.pageDescription}</p>
              </div>
            )}
            {enrichment.pageLanguage && (
              <div>
                <label className="text-sm font-medium text-gray-700">Language</label>
                <p className="text-sm text-gray-900">{enrichment.pageLanguage}</p>
              </div>
            )}
            {enrichment.lastModified && (
              <div>
                <label className="text-sm font-medium text-gray-700">Last Modified</label>
                <p className="text-sm text-gray-900">{enrichment.lastModified}</p>
              </div>
            )}
            {enrichment.pageKeywords.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Keywords</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {enrichment.pageKeywords.map((keyword, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scraped Content */}
      {enrichment.scrapedContent && (
        <div className="card p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5" />
            Scraped Content
          </h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {enrichment.scrapedContent.length > 1000 
                ? `${enrichment.scrapedContent.substring(0, 1000)}...`
                : enrichment.scrapedContent
              }
            </p>
            {enrichment.scrapedContent.length > 1000 && (
              <p className="text-xs text-gray-500 mt-2">
                Content truncated. Full content available in database.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Processing Information */}
      <div className="card p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          Processing Information
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Processing Time</label>
            <p className="text-sm text-gray-900">{enrichment.processingTime}ms</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Source</label>
            <p className="text-sm text-gray-900">{enrichment.source}</p>
          </div>
        </div>
        {enrichment.scrapingError && (
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700">Error</label>
            <p className="text-sm text-red-600">{enrichment.scrapingError}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnrichmentDetails; 