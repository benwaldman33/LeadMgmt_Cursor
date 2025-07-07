import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  FunnelChart, Funnel, LabelList
} from 'recharts';
import { reportingService } from '../services/reportingService';
import type { ReportConfig, ReportResult, ReportType, FilterOptions } from '../services/reportingService';
import { useNotifications } from '../contexts/NotificationContext';
import {
  ChartBarIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    campaigns: [],
    teams: [],
    users: [],
    industries: [],
    statuses: []
  });
  const [currentReport, setCurrentReport] = useState<ReportResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Report configuration state
  const [reportConfig, setReportConfig] = useState<Partial<ReportConfig>>({
    name: '',
    description: '',
    type: 'lead_analysis',
    filters: {},
    metrics: [],
    chartTypes: ['bar'],
    groupBy: '',
    sortBy: '',
    sortOrder: 'desc',
    limit: 50
  });

  useEffect(() => {
    loadReportTypes();
    loadFilterOptions();
  }, []);

  const loadReportTypes = async () => {
    try {
      const types = await reportingService.getReportTypes();
      setReportTypes(types);
    } catch (error) {
      showNotification('Failed to load report types', 'error');
    }
  };

  const loadFilterOptions = async () => {
    try {
      const options = await reportingService.getFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      showNotification('Failed to load filter options', 'error');
    }
  };

  const handleReportTypeChange = (type: string) => {
    const selectedType = reportTypes.find(t => t.id === type);
    if (selectedType) {
      setReportConfig(prev => ({
        ...prev,
        type: type as any,
        metrics: selectedType.metrics.slice(0, 2),
        chartTypes: selectedType.chartTypes.slice(0, 1),
        groupBy: selectedType.groupByOptions[0] || ''
      }));
    }
  };

  const handleGenerateReport = async () => {
    if (!reportConfig.name || !reportConfig.type) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const config = reportConfig as ReportConfig;
      const report = await reportingService.generateReport(config);
      setCurrentReport(report);
      addNotification({ type: 'success', title: 'Success', message: 'Report generated successfully' });
    } catch (error) {
      showNotification('Failed to generate report', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    if (!currentReport) {
      showNotification('No report to export', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const filename = `${reportConfig.name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
      
      let exportResult;
      switch (format) {
        case 'excel':
          exportResult = await reportingService.exportToExcel(currentReport, filename);
          break;
        case 'pdf':
          exportResult = await reportingService.exportToPDF(currentReport, filename);
          break;
        case 'csv':
          exportResult = await reportingService.exportToCSV(currentReport, filename);
          break;
      }
      
      await reportingService.downloadExportedFile(exportResult);
      showNotification(`${format.toUpperCase()} export completed`, 'success');
    } catch (error) {
      showNotification(`Failed to export to ${format.toUpperCase()}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const renderChart = (chart: any) => {
    const { type, data, config } = chart;
    const formattedData = reportingService.formatChartData(data, type, config);

    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
              <Bar dataKey="qualified" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#8884d8" />
              <Line type="monotone" dataKey="conversion" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={formattedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {formattedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'funnel':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip />
              <Funnel
                dataKey="value"
                data={formattedData}
                isAnimationActive
              >
                <LabelList position="right" fill="#000" stroke="none" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );

      default:
        return <div>Unsupported chart type: {type}</div>;
    }
  };

  const renderReportSummary = () => {
    if (!currentReport) return null;

    const { summary } = currentReport;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Records</h3>
          <p className="text-2xl font-bold text-gray-900">{summary.totalRecords}</p>
        </div>
        {summary.totalValue && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
            <p className="text-2xl font-bold text-green-600">${summary.totalValue.toLocaleString()}</p>
          </div>
        )}
        {summary.averageScore && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Average Score</h3>
            <p className="text-2xl font-bold text-blue-600">{summary.averageScore}</p>
          </div>
        )}
        {summary.conversionRate && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
            <p className="text-2xl font-bold text-purple-600">{summary.conversionRate}%</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Advanced Reporting & Analytics</h1>
          <p className="mt-2 text-gray-600">Generate custom reports and export data in multiple formats</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Report Builder */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Report Builder</h2>
              
              <div className="space-y-4">
                {/* Report Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Name *
                  </label>
                  <input
                    type="text"
                    value={reportConfig.name}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter report name"
                  />
                </div>

                {/* Report Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={reportConfig.description}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter report description"
                  />
                </div>

                {/* Report Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Type *
                  </label>
                  <select
                    value={reportConfig.type}
                    onChange={(e) => handleReportTypeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {reportTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Metrics */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metrics
                  </label>
                  <div className="space-y-2">
                    {reportTypes.find(t => t.id === reportConfig.type)?.metrics.map(metric => (
                      <label key={metric} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportConfig.metrics?.includes(metric)}
                          onChange={(e) => {
                            const metrics = reportConfig.metrics || [];
                            if (e.target.checked) {
                              setReportConfig(prev => ({ ...prev, metrics: [...metrics, metric] }));
                            } else {
                              setReportConfig(prev => ({ ...prev, metrics: metrics.filter(m => m !== metric) }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{metric}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Chart Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chart Types
                  </label>
                  <div className="space-y-2">
                    {reportTypes.find(t => t.id === reportConfig.type)?.chartTypes.map(chartType => (
                      <label key={chartType} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportConfig.chartTypes?.includes(chartType)}
                          onChange={(e) => {
                            const chartTypes = reportConfig.chartTypes || [];
                            if (e.target.checked) {
                              setReportConfig(prev => ({ ...prev, chartTypes: [...chartTypes, chartType] }));
                            } else {
                              setReportConfig(prev => ({ ...prev, chartTypes: chartTypes.filter(c => c !== chartType) }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm capitalize">{chartType}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Group By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group By
                  </label>
                  <select
                    value={reportConfig.groupBy}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, groupBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No grouping</option>
                    {reportTypes.find(t => t.id === reportConfig.type)?.groupByOptions.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </label>
                  <select
                    value={reportConfig.sortBy}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No sorting</option>
                    <option value="totalLeads">Total Leads</option>
                    <option value="conversionRate">Conversion Rate</option>
                    <option value="averageScore">Average Score</option>
                    <option value="totalValue">Total Value</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <select
                    value={reportConfig.sortOrder}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>

                {/* Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Limit
                  </label>
                  <input
                    type="number"
                    value={reportConfig.limit}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, limit: parseInt(e.target.value) || 50 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="1000"
                  />
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>

          {/* Report Results */}
          <div className="lg:col-span-2">
            {currentReport ? (
              <div className="space-y-6">
                {/* Export Controls */}
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Export Options</h3>
                    <div className="space-x-2">
                      <button
                        onClick={() => handleExport('excel')}
                        disabled={isExporting}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {isExporting ? 'Exporting...' : 'Excel'}
                      </button>
                      <button
                        onClick={() => handleExport('pdf')}
                        disabled={isExporting}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {isExporting ? 'Exporting...' : 'PDF'}
                      </button>
                      <button
                        onClick={() => handleExport('csv')}
                        disabled={isExporting}
                        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
                      >
                        {isExporting ? 'Exporting...' : 'CSV'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Report Summary */}
                {renderReportSummary()}

                {/* Charts */}
                <div className="space-y-6">
                  {currentReport.charts.map((chart, index) => (
                    <div key={index} className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold mb-4 capitalize">
                        {chart.type} Chart
                      </h3>
                      {renderChart(chart)}
                    </div>
                  ))}
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Report Data</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {currentReport.data.length > 0 && Object.keys(currentReport.data[0]).map(key => (
                            <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentReport.data.slice(0, 10).map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value, valueIndex) => (
                              <td key={valueIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {typeof value === 'number' ? value.toLocaleString() : String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
                <p className="text-gray-500">Configure your report settings and click "Generate Report" to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage; 