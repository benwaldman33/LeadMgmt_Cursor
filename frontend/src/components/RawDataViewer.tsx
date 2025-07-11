import React, { useState } from 'react';
import { 
  DocumentTextIcon, 
  CodeBracketIcon,
  InformationCircleIcon,
  BuildingOfficeIcon,
  UserIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface RawDataViewerProps {
  enrichment: {
    id: string;
    companySize?: number;
    revenue?: string;
    industry?: string;
    technologies: string;
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
    // Raw scraped data fields
    scrapedContent?: string;
    pageTitle?: string;
    pageDescription?: string;
    pageKeywords?: string;
    pageLanguage?: string;
    lastModified?: string;
    companyName?: string;
    services?: string;
    certifications?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactAddress?: string;
    processingTime?: number;
    scrapingSuccess?: boolean;
    scrapingError?: string;
  };
}

const RawDataViewer: React.FC<RawDataViewerProps> = ({ enrichment }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['metadata']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const parseJsonField = (field: string | undefined) => {
    if (!field) return [];
    try {
      return JSON.parse(field);
    } catch {
      return [];
    }
  };

  const formatContent = (content: string | undefined, maxLength: number = 500) => {
    if (!content) return 'No content available';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const renderSection = (title: string, IconComponent: React.ComponentType<any>, content: React.ReactNode, sectionKey: string) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <IconComponent className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">{title}</span>
          </div>
          {isExpanded ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          )}
        </button>
        {isExpanded && (
          <div className="p-4 border-t border-gray-200">
            {content}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CodeBracketIcon className="h-6 w-6 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">Raw Scraped Data</h3>
      </div>

      {/* Page Metadata */}
      {renderSection(
        'Page Metadata',
        InformationCircleIcon,
        <div className="space-y-3">
          {enrichment.pageTitle && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{enrichment.pageTitle}</p>
            </div>
          )}
          {enrichment.pageDescription && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Page Description</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{enrichment.pageDescription}</p>
            </div>
          )}
          {enrichment.pageLanguage && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <p className="text-sm text-gray-900">{enrichment.pageLanguage}</p>
            </div>
          )}
          {enrichment.lastModified && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Modified</label>
              <p className="text-sm text-gray-900">{enrichment.lastModified}</p>
            </div>
          )}
          {enrichment.processingTime && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Processing Time</label>
              <p className="text-sm text-gray-900">{enrichment.processingTime}ms</p>
            </div>
          )}
          {enrichment.pageKeywords && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
              <div className="flex flex-wrap gap-1">
                {parseJsonField(enrichment.pageKeywords).map((keyword: string, index: number) => (
                  <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>,
        'metadata'
      )}

      {/* Company Information */}
      {renderSection(
        'Company Information',
        BuildingOfficeIcon,
        <div className="space-y-3">
          {enrichment.companyName && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{enrichment.companyName}</p>
            </div>
          )}
          {enrichment.industry && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <p className="text-sm text-gray-900">{enrichment.industry}</p>
            </div>
          )}
          {enrichment.companySize && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
              <p className="text-sm text-gray-900">{enrichment.companySize} employees</p>
            </div>
          )}
          {enrichment.revenue && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Revenue</label>
              <p className="text-sm text-gray-900">{enrichment.revenue}</p>
            </div>
          )}
          {enrichment.services && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Services</label>
              <div className="flex flex-wrap gap-1">
                {parseJsonField(enrichment.services).map((service: string, index: number) => (
                  <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}
          {enrichment.certifications && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
              <div className="flex flex-wrap gap-1">
                {parseJsonField(enrichment.certifications).map((cert: string, index: number) => (
                  <span key={index} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>,
        'company'
      )}

      {/* Contact Information */}
      {renderSection(
        'Contact Information',
        UserIcon,
        <div className="space-y-3">
          {enrichment.contactEmail && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{enrichment.contactEmail}</p>
            </div>
          )}
          {enrichment.contactPhone && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{enrichment.contactPhone}</p>
            </div>
          )}
          {enrichment.contactAddress && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Address</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{enrichment.contactAddress}</p>
            </div>
          )}
          {enrichment.contacts && enrichment.contacts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Extracted Contacts</label>
              <div className="space-y-2">
                {enrichment.contacts.map((contact) => (
                  <div key={contact.id} className="border border-gray-200 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                        {contact.title && <p className="text-sm text-gray-600">{contact.title}</p>}
                        {contact.email && <p className="text-sm text-gray-600">{contact.email}</p>}
                      </div>
                      {contact.isPrimaryContact && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>,
        'contacts'
      )}

      {/* Technologies */}
      {enrichment.technologies && (
        renderSection(
          'Technologies',
          GlobeAltIcon,
          <div>
            <div className="flex flex-wrap gap-1">
              {parseJsonField(enrichment.technologies).map((tech: string, index: number) => (
                <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  {tech}
                </span>
              ))}
            </div>
          </div>,
          'technologies'
        )
      )}

      {/* Raw Content */}
      {enrichment.scrapedContent && (
        renderSection(
          'Raw Page Content',
          DocumentTextIcon,
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scraped Content (First 1000 characters)</label>
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-900 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
              {formatContent(enrichment.scrapedContent, 1000)}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Total length: {enrichment.scrapedContent.length} characters
            </p>
          </div>,
          'content'
        )
      )}

      {/* Scraping Status */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <InformationCircleIcon className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-900">Scraping Status</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Success</label>
            <span className={`px-2 py-1 text-xs rounded ${
              enrichment.scrapingSuccess 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {enrichment.scrapingSuccess ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <span className="text-gray-900">{enrichment.source}</span>
          </div>
          {enrichment.scrapingError && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Error</label>
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{enrichment.scrapingError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RawDataViewer; 