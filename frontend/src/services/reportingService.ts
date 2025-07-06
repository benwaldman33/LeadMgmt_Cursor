import api from './api';

export interface ReportFilter {
  dateRange?: {
    start: Date;
    end: Date;
  };
  campaignIds?: string[];
  teamIds?: string[];
  userIds?: string[];
  status?: string[];
  industry?: string[];
  scoreRange?: {
    min: number;
    max: number;
  };
}

export interface ReportConfig {
  name: string;
  description?: string;
  type: 'lead_analysis' | 'campaign_performance' | 'team_performance' | 'scoring_analysis' | 'conversion_funnel';
  filters: ReportFilter;
  metrics: string[];
  chartTypes: string[];
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface ReportResult {
  data: any[];
  summary: {
    totalRecords: number;
    totalValue?: number;
    averageScore?: number;
    conversionRate?: number;
  };
  charts: {
    type: string;
    data: any;
    config: any;
  }[];
  metadata: {
    generatedAt: Date;
    filters: ReportFilter;
    config: ReportConfig;
  };
}

export interface ReportType {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  chartTypes: string[];
  groupByOptions: string[];
}

export interface FilterOptions {
  campaigns: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  users: { id: string; name: string }[];
  industries: string[];
  statuses: string[];
}

export interface ExportResult {
  filePath: string;
  filename: string;
  downloadUrl: string;
}

class ReportingService {
  // Generate custom report
  async generateReport(config: ReportConfig): Promise<ReportResult> {
    const response = await api.post('/reports/generate', config);
    return response.data;
  }

  // Export report to Excel
  async exportToExcel(reportResult: ReportResult, filename: string): Promise<ExportResult> {
    const response = await api.post('/reports/export/excel', {
      reportResult,
      filename
    });
    return response.data;
  }

  // Export report to PDF
  async exportToPDF(reportResult: ReportResult, filename: string): Promise<ExportResult> {
    const response = await api.post('/reports/export/pdf', {
      reportResult,
      filename
    });
    return response.data;
  }

  // Export report to CSV
  async exportToCSV(reportResult: ReportResult, filename: string): Promise<ExportResult> {
    const response = await api.post('/reports/export/csv', {
      reportResult,
      filename
    });
    return response.data;
  }

  // Download exported file
  async downloadFile(filename: string): Promise<Blob> {
    const response = await api.get(`/reports/download/${filename}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Get available report types
  async getReportTypes(): Promise<ReportType[]> {
    const response = await api.get('/reports/types');
    return response.data;
  }

  // Get available filters and options
  async getFilterOptions(): Promise<FilterOptions> {
    const response = await api.get('/reports/filters');
    return response.data;
  }

  // Get saved reports
  async getSavedReports(): Promise<any[]> {
    const response = await api.get('/reports/saved');
    return response.data;
  }

  // Save report configuration
  async saveReport(config: ReportConfig): Promise<any> {
    const response = await api.post('/reports/save', config);
    return response.data;
  }

  // Helper function to trigger file download
  async downloadExportedFile(exportResult: ExportResult): Promise<void> {
    try {
      const blob = await this.downloadFile(exportResult.filename);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportResult.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error('Failed to download file');
    }
  }

  // Helper function to format date for API
  formatDateForAPI(date: Date): string {
    return date.toISOString();
  }

  // Helper function to parse date from API
  parseDateFromAPI(dateString: string): Date {
    return new Date(dateString);
  }

  // Helper function to format report data for charts
  formatChartData(data: any[], chartType: string, config: any) {
    switch (chartType) {
      case 'bar':
        return data.map(item => ({
          name: item.name || item.group || item.stage || item.id,
          value: item.count || item.totalLeads || item.totalScore || 0,
          qualified: item.qualifiedLeads || 0,
          conversionRate: item.conversionRate || 0,
        }));
      case 'line':
        return data.map(item => ({
          name: item.name || item.group || item.stage || item.id,
          score: item.averageScore || item.totalScore || 0,
          conversion: item.conversionRate || 0,
        }));
      case 'pie':
        return data.map(item => ({
          name: item.name || item.group || item.stage || item.id,
          value: item.count || item.totalLeads || 0,
        }));
      case 'funnel':
        return data.map(item => ({
          name: item.stage || item.name,
          value: item.count || item.totalLeads || 0,
          percentage: item.percentage || 0,
        }));
      default:
        return data;
    }
  }

  // Helper function to get chart configuration
  getChartConfig(chartType: string, data: any[]) {
    switch (chartType) {
      case 'bar':
        return {
          xAxis: { dataKey: 'name' },
          yAxis: { dataKey: 'value' },
        };
      case 'line':
        return {
          xAxis: { dataKey: 'name' },
          yAxis: { dataKey: 'score' },
        };
      case 'pie':
        return {
          dataKey: 'value',
          nameKey: 'name',
        };
      case 'funnel':
        return {
          dataKey: 'value',
          nameKey: 'name',
        };
      default:
        return {};
    }
  }

  // Helper function to validate report configuration
  validateReportConfig(config: ReportConfig): string[] {
    const errors: string[] = [];

    if (!config.name.trim()) {
      errors.push('Report name is required');
    }

    if (!config.type) {
      errors.push('Report type is required');
    }

    if (!config.metrics || config.metrics.length === 0) {
      errors.push('At least one metric is required');
    }

    if (!config.chartTypes || config.chartTypes.length === 0) {
      errors.push('At least one chart type is required');
    }

    return errors;
  }

  // Helper function to create default report configurations
  getDefaultReportConfigs(): Partial<ReportConfig>[] {
    return [
      {
        name: 'Lead Performance Overview',
        type: 'lead_analysis',
        metrics: ['totalValue', 'averageCompanySize'],
        chartTypes: ['bar', 'line'],
        groupBy: 'status',
        sortBy: 'totalLeads',
        sortOrder: 'desc',
      },
      {
        name: 'Campaign ROI Analysis',
        type: 'campaign_performance',
        metrics: ['totalValue', 'conversionRate'],
        chartTypes: ['bar', 'pie'],
        sortBy: 'conversionRate',
        sortOrder: 'desc',
      },
      {
        name: 'Team Productivity Report',
        type: 'team_performance',
        metrics: ['totalValue', 'averageScore'],
        chartTypes: ['bar', 'line'],
        groupBy: 'industry',
        sortBy: 'averageScore',
        sortOrder: 'desc',
      },
      {
        name: 'Scoring Model Effectiveness',
        type: 'scoring_analysis',
        metrics: ['averageScore', 'qualifiedCount'],
        chartTypes: ['line', 'pie'],
        sortBy: 'averageScore',
        sortOrder: 'desc',
      },
      {
        name: 'Sales Funnel Analysis',
        type: 'conversion_funnel',
        metrics: ['conversionRate', 'stageCount'],
        chartTypes: ['funnel', 'bar'],
      },
    ];
  }
}

export const reportingService = new ReportingService(); 