import React, { useState, useEffect } from 'react';
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { leadsAPI, campaignsAPI } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';

interface ImportExportProps {
  onImport?: (data: any[]) => void;
  onExport?: () => void;
}

interface Campaign {
  id: string;
  name: string;
  industry: string;
}

const LeadImportExport: React.FC<ImportExportProps> = ({ onImport, onExport }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      previewFile(file);
    }
  };

  const previewFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      
      const preview = lines.slice(1, 6).map((line) => {
        const values = line.split(',');
        const row: any = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || '';
        });
        return row;
      });
      
      setPreview(preview);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile || !selectedCampaignId) {
      addNotification({
        type: 'error',
        title: 'Import Failed',
        message: 'Please select both a CSV file and a campaign.'
      });
      return;
    }
    
    setIsImporting(true);
    try {
      const result = await leadsAPI.importLeads(importFile, selectedCampaignId);
      
      addNotification({
        type: 'success',
        title: 'Import Successful',
        message: `Successfully imported ${result.success} leads. ${result.errors.length > 0 ? `${result.errors.length} errors occurred.` : ''}`
      });
      
      if (onImport) {
        onImport(preview);
      }
      
      setImportFile(null);
      setPreview([]);
      setSelectedCampaignId('');
    } catch (error) {
      console.error('Import failed:', error);
      addNotification({
        type: 'error',
        title: 'Import Failed',
        message: 'Failed to import leads. Please check your CSV format and try again.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onExport) {
        onExport();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Import/Export Leads</h3>
          <p className="text-sm text-gray-500">Import leads from CSV or export existing data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import Section */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-4">
            <ArrowUpTrayIcon className="h-5 w-5 text-blue-500" />
            <h4 className="text-sm font-medium text-gray-900">Import Leads</h4>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Campaign
              </label>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select a campaign...</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            
            {preview.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Preview</h5>
                <div className="bg-gray-50 rounded p-3 max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        {Object.keys(preview[0] || {}).map((header) => (
                          <th key={header} className="text-left py-1 px-2 font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex} className="py-1 px-2">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <button
              onClick={handleImport}
              disabled={!importFile || isImporting}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isImporting ? 'Importing...' : 'Import Leads'}
            </button>
          </div>
        </div>

        {/* Export Section */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-4">
            <ArrowDownTrayIcon className="h-5 w-5 text-green-500" />
            <h4 className="text-sm font-medium text-gray-900">Export Leads</h4>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Export your leads data to CSV format for backup or analysis.
            </p>
            
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isExporting ? 'Exporting...' : 'Export Leads'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadImportExport; 