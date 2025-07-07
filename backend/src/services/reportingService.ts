import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

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

class ReportingService {
  // Generate custom reports based on configuration
  async generateReport(config: ReportConfig): Promise<ReportResult> {
    const { type, filters, metrics, groupBy, sortBy, sortOrder, limit } = config;
    
    let data: any[] = [];
    let summary: any = {};

    switch (type) {
      case 'lead_analysis':
        data = await this.generateLeadAnalysis(filters, metrics, groupBy, sortBy, sortOrder, limit);
        summary = await this.calculateLeadSummary(filters);
        break;
      case 'campaign_performance':
        data = await this.generateCampaignPerformance(filters, metrics, groupBy, sortBy, sortOrder, limit);
        summary = await this.calculateCampaignSummary(filters);
        break;
      case 'team_performance':
        data = await this.generateTeamPerformance(filters, metrics, groupBy, sortBy, sortOrder, limit);
        summary = await this.calculateTeamSummary(filters);
        break;
      case 'scoring_analysis':
        data = await this.generateScoringAnalysis(filters, metrics, groupBy, sortBy, sortOrder, limit);
        summary = await this.calculateScoringSummary(filters);
        break;
      case 'conversion_funnel':
        data = await this.generateConversionFunnel(filters, metrics);
        summary = await this.calculateFunnelSummary(filters);
        break;
    }

    const charts = this.generateCharts(data, config.chartTypes, type);

    return {
      data,
      summary,
      charts,
      metadata: {
        generatedAt: new Date(),
        filters,
        config
      }
    };
  }

  // Lead Analysis Report
  private async generateLeadAnalysis(
    filters: ReportFilter,
    metrics: string[],
    groupBy?: string,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
    limit?: number
  ) {
    const where = this.buildWhereClause(filters);
    
    const leads = await prisma.lead.findMany({
      where,
      include: {
        campaign: true,
        assignedTo: true,
        assignedTeam: true,
        scoringDetails: true,
        enrichment: true,
      },
      orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
      take: limit,
    });

    return this.processLeadData(leads, metrics, groupBy);
  }

  // Campaign Performance Report
  private async generateCampaignPerformance(
    filters: ReportFilter,
    metrics: string[],
    groupBy?: string,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
    limit?: number
  ) {
    const campaigns = await prisma.campaign.findMany({
      include: {
        leads: {
          include: {
            scoringDetails: true,
            enrichment: true,
          }
        }
      }
    });

    return this.processCampaignData(campaigns, metrics, groupBy, sortBy, sortOrder, limit);
  }

  // Team Performance Report
  private async generateTeamPerformance(
    filters: ReportFilter,
    metrics: string[],
    groupBy?: string,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
    limit?: number
  ) {
    const teams = await prisma.team.findMany({
      include: {
        leads: {
          include: {
            scoringDetails: true,
            enrichment: true,
          }
        }
      }
    });

    return this.processTeamData(teams, metrics, groupBy, sortBy, sortOrder, limit);
  }

  // Scoring Analysis Report
  private async generateScoringAnalysis(
    filters: ReportFilter,
    metrics: string[],
    groupBy?: string,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
    limit?: number
  ) {
    const scoringDetails = await prisma.scoringResult.findMany({
      include: {
        lead: {
          include: {
            campaign: true,
            assignedTo: true,
            assignedTeam: true,
          }
        },
        criteriaScores: true,
      }
    });

    return this.processScoringData(scoringDetails, metrics, groupBy, sortBy, sortOrder, limit);
  }

  // Conversion Funnel Report
  private async generateConversionFunnel(filters: ReportFilter, metrics: string[]) {
    const where = this.buildWhereClause(filters);
    
    const leads = await prisma.lead.findMany({
      where,
      include: {
        campaign: true,
        scoringDetails: true,
      }
    });

    return this.processFunnelData(leads, metrics);
  }

  // Build where clause for filtering
  private buildWhereClause(filters: ReportFilter) {
    const where: any = {};

    if (filters.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    if (filters.campaignIds?.length) {
      where.campaignId = { in: filters.campaignIds };
    }

    if (filters.teamIds?.length) {
      where.assignedTeamId = { in: filters.teamIds };
    }

    if (filters.userIds?.length) {
      where.assignedToId = { in: filters.userIds };
    }

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.industry?.length) {
      where.industry = { in: filters.industry };
    }

    return where;
  }

  // Process lead data for reporting
  private processLeadData(leads: any[], metrics: string[], groupBy?: string) {
    if (groupBy) {
      const grouped = leads.reduce((acc, lead) => {
        const key = lead[groupBy] || 'Unknown';
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(lead);
        return acc;
      }, {});

      return Object.entries(grouped).map(([key, groupLeads]: [string, any]) => ({
        group: key,
        count: groupLeads.length,
        averageScore: this.calculateAverageScore(groupLeads),
        qualifiedCount: groupLeads.filter((l: any) => l.scoringDetails?.totalScore >= 70).length,
        conversionRate: this.calculateConversionRate(groupLeads),
        ...this.calculateMetrics(groupLeads, metrics)
      }));
    }

    return leads.map(lead => ({
      id: lead.id,
      companyName: lead.companyName,
      status: lead.status,
      score: lead.scoringDetails?.totalScore || 0,
      campaign: lead.campaign?.name,
      assignedTo: lead.assignedTo?.fullName,
      assignedTeam: lead.assignedTeam?.name,
      createdAt: lead.createdAt,
      ...this.calculateMetrics([lead], metrics)
    }));
  }

  // Process campaign data for reporting
  private processCampaignData(campaigns: any[], metrics: string[], groupBy?: string, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc', limit?: number) {
    const campaignStats = campaigns.map(campaign => {
      const leads = campaign.leads || [];
      const qualifiedLeads = leads.filter((l: any) => l.scoringDetails?.totalScore >= 70);
      
      return {
        id: campaign.id,
        name: campaign.name,
        industry: campaign.industry,
        totalLeads: leads.length,
        qualifiedLeads: qualifiedLeads.length,
        averageScore: this.calculateAverageScore(leads),
        conversionRate: leads.length > 0 ? (qualifiedLeads.length / leads.length) * 100 : 0,
        createdAt: campaign.createdAt,
        ...this.calculateMetrics(leads, metrics)
      };
    });

    if (sortBy) {
      campaignStats.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    if (limit) {
      return campaignStats.slice(0, limit);
    }

    return campaignStats;
  }

  // Process team data for reporting
  private processTeamData(teams: any[], metrics: string[], groupBy?: string, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc', limit?: number) {
    const teamStats = teams.map(team => {
      const leads = team.leads || [];
      const qualifiedLeads = leads.filter((l: any) => l.scoringDetails?.totalScore >= 70);
      
      return {
        id: team.id,
        name: team.name,
        industry: team.industry,
        memberCount: team.users?.length || 0,
        totalLeads: leads.length,
        qualifiedLeads: qualifiedLeads.length,
        averageScore: this.calculateAverageScore(leads),
        conversionRate: leads.length > 0 ? (qualifiedLeads.length / leads.length) * 100 : 0,
        ...this.calculateMetrics(leads, metrics)
      };
    });

    if (sortBy) {
      teamStats.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    if (limit) {
      return teamStats.slice(0, limit);
    }

    return teamStats;
  }

  // Process scoring data for reporting
  private processScoringData(scoringDetails: any[], metrics: string[], groupBy?: string, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc', limit?: number) {
    const scoringStats = scoringDetails.map(detail => ({
      id: detail.id,
      leadId: detail.leadId,
      totalScore: detail.totalScore,
      qualified: detail.totalScore >= 70,
      lead: detail.lead,
      createdAt: detail.createdAt,
      ...this.calculateMetrics([detail], metrics)
    }));

    if (sortBy) {
      scoringStats.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    if (limit) {
      return scoringStats.slice(0, limit);
    }

    return scoringStats;
  }

  // Process funnel data for reporting
  private processFunnelData(leads: any[], metrics: string[]) {
    const stages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed'];
    const funnelData = stages.map(stage => {
      const stageLeads = leads.filter(lead => lead.status === stage);
      return {
        stage,
        count: stageLeads.length,
        percentage: leads.length > 0 ? (stageLeads.length / leads.length) * 100 : 0,
        averageScore: this.calculateAverageScore(stageLeads),
        ...this.calculateMetrics(stageLeads, metrics)
      };
    });

    return funnelData;
  }

  // Calculate metrics for data
  private calculateMetrics(data: any[], metrics: string[]) {
    const result: any = {};
    
    metrics.forEach(metric => {
      switch (metric) {
        case 'totalValue':
          result.totalValue = data.reduce((sum, item) => sum + (item.enrichment?.revenue || 0), 0);
          break;
        case 'averageCompanySize':
          result.averageCompanySize = data.reduce((sum, item) => sum + (item.enrichment?.companySize || 0), 0) / data.length;
          break;
        case 'technologyCount':
          result.technologyCount = data.reduce((sum, item) => {
            const techs = item.enrichment?.technologies ? JSON.parse(item.enrichment.technologies) : [];
            return sum + techs.length;
          }, 0);
          break;
      }
    });

    return result;
  }

  // Calculate average score
  private calculateAverageScore(data: any[]): number {
    if (data.length === 0) return 0;
    const totalScore = data.reduce((sum, item) => sum + (item.scoringDetails?.totalScore || 0), 0);
    return Math.round((totalScore / data.length) * 100) / 100;
  }

  // Calculate conversion rate
  private calculateConversionRate(data: any[]): number {
    if (data.length === 0) return 0;
    const qualifiedCount = data.filter(item => item.scoringDetails?.totalScore >= 70).length;
    return Math.round((qualifiedCount / data.length) * 100);
  }

  // Generate charts for reports
  private generateCharts(data: any[], chartTypes: string[], reportType: string) {
    const charts: any[] = [];

    chartTypes.forEach(type => {
      switch (type) {
        case 'bar':
          charts.push(this.generateBarChart(data, reportType));
          break;
        case 'line':
          charts.push(this.generateLineChart(data, reportType));
          break;
        case 'pie':
          charts.push(this.generatePieChart(data, reportType));
          break;
        case 'funnel':
          charts.push(this.generateFunnelChart(data, reportType));
          break;
      }
    });

    return charts;
  }

  // Generate bar chart data
  private generateBarChart(data: any[], reportType: string) {
    return {
      type: 'bar',
      data: data.map(item => ({
        name: item.name || item.group || item.stage || item.id,
        value: item.count || item.totalLeads || item.totalScore || 0,
        qualified: item.qualifiedLeads || 0,
        conversionRate: item.conversionRate || 0,
      })),
      config: {
        xAxis: { dataKey: 'name' },
        yAxis: { dataKey: 'value' },
      }
    };
  }

  // Generate line chart data
  private generateLineChart(data: any[], reportType: string) {
    return {
      type: 'line',
      data: data.map(item => ({
        name: item.name || item.group || item.stage || item.id,
        score: item.averageScore || item.totalScore || 0,
        conversion: item.conversionRate || 0,
      })),
      config: {
        xAxis: { dataKey: 'name' },
        yAxis: { dataKey: 'score' },
      }
    };
  }

  // Generate pie chart data
  private generatePieChart(data: any[], reportType: string) {
    return {
      type: 'pie',
      data: data.map(item => ({
        name: item.name || item.group || item.stage || item.id,
        value: item.count || item.totalLeads || 0,
      })),
      config: {
        dataKey: 'value',
        nameKey: 'name',
      }
    };
  }

  // Generate funnel chart data
  private generateFunnelChart(data: any[], reportType: string) {
    return {
      type: 'funnel',
      data: data.map(item => ({
        name: item.stage || item.name,
        value: item.count || item.totalLeads || 0,
        percentage: item.percentage || 0,
      })),
      config: {
        dataKey: 'value',
        nameKey: 'name',
      }
    };
  }

  // Calculate summary statistics
  private async calculateLeadSummary(filters: ReportFilter) {
    const where = this.buildWhereClause(filters);
    const totalLeads = await prisma.lead.count({ where });
    const qualifiedLeads = await prisma.lead.count({
      where: {
        ...where,
        scoringDetails: {
          totalScore: { gte: 70 }
        }
      }
    });

    return {
      totalRecords: totalLeads,
      qualifiedLeads,
      conversionRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
    };
  }

  private async calculateCampaignSummary(filters: ReportFilter) {
    const campaigns = await prisma.campaign.findMany({
      include: {
        leads: {
          include: { scoringDetails: true }
        }
      }
    });

    const totalLeads = campaigns.reduce((sum, campaign) => sum + campaign.leads.length, 0);
    const qualifiedLeads = campaigns.reduce((sum, campaign) => 
      sum + campaign.leads.filter(lead => lead.scoringDetails?.totalScore && lead.scoringDetails.totalScore >= 70).length, 0
    );

    return {
      totalRecords: campaigns.length,
      totalLeads,
      qualifiedLeads,
      conversionRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
    };
  }

  private async calculateTeamSummary(filters: ReportFilter) {
    const teams = await prisma.team.findMany({
      include: {
        leads: {
          include: { scoringDetails: true }
        }
      }
    });

    const totalLeads = teams.reduce((sum, team) => sum + (team.leads?.length || 0), 0);
    const qualifiedLeads = teams.reduce((sum, team) => 
      sum + (team.leads?.filter(lead => lead.scoringDetails?.totalScore && lead.scoringDetails.totalScore >= 70).length || 0), 0
    );

    return {
      totalRecords: teams.length,
      totalLeads,
      qualifiedLeads,
      conversionRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
    };
  }

  private async calculateScoringSummary(filters: ReportFilter) {
    const scoringDetails = await prisma.scoringResult.findMany({
      include: { lead: true }
    });

    const totalScores = scoringDetails.length;
    const qualifiedScores = scoringDetails.filter((detail: any) => detail.totalScore >= 70).length;
    const averageScore = scoringDetails.reduce((sum: number, detail: any) => sum + detail.totalScore, 0) / totalScores;

    return {
      totalRecords: totalScores,
      qualifiedScores,
      averageScore: Math.round(averageScore * 100) / 100,
      conversionRate: totalScores > 0 ? (qualifiedScores / totalScores) * 100 : 0,
    };
  }

  private async calculateFunnelSummary(filters: ReportFilter) {
    const where = this.buildWhereClause(filters);
    const leads = await prisma.lead.findMany({ where });

    const stages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed'];
    const funnelData = stages.map(stage => {
      const stageLeads = leads.filter(lead => lead.status === stage);
      return {
        stage,
        count: stageLeads.length,
        percentage: leads.length > 0 ? (stageLeads.length / leads.length) * 100 : 0,
      };
    });

    return {
      totalRecords: leads.length,
      stages: funnelData,
      conversionRate: leads.length > 0 ? (funnelData.find(s => s.stage === 'Closed')?.count || 0) / leads.length * 100 : 0,
    };
  }

  // Export functionality
  async exportToExcel(reportResult: ReportResult, filename: string): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add headers
    if (reportResult.data.length > 0) {
      const headers = Object.keys(reportResult.data[0]);
      worksheet.addRow(headers);

      // Add data
      reportResult.data.forEach(row => {
        worksheet.addRow(Object.values(row));
      });
    }

    // Add summary
    worksheet.addRow([]);
    worksheet.addRow(['Summary']);
    Object.entries(reportResult.summary).forEach(([key, value]) => {
      worksheet.addRow([key, value]);
    });

    const filePath = path.join(__dirname, '../../exports', `${filename}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  async exportToPDF(reportResult: ReportResult, filename: string): Promise<string> {
    const doc = new PDFDocument();
    const filePath = path.join(__dirname, '../../exports', `${filename}.pdf`);
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Add title
    doc.fontSize(20).text('Report', { align: 'center' });
    doc.moveDown();

    // Add metadata
    doc.fontSize(12).text(`Generated: ${reportResult.metadata.generatedAt.toLocaleString()}`);
    doc.moveDown();

    // Add summary
    doc.fontSize(14).text('Summary');
    Object.entries(reportResult.summary).forEach(([key, value]) => {
      doc.fontSize(10).text(`${key}: ${value}`);
    });
    doc.moveDown();

    // Add data table
    if (reportResult.data.length > 0) {
      doc.fontSize(14).text('Data');
      const headers = Object.keys(reportResult.data[0]);
      
      headers.forEach(header => {
        doc.fontSize(10).text(header, { continued: true });
        doc.text('  ');
      });
      doc.moveDown();

      reportResult.data.forEach(row => {
        Object.values(row).forEach(value => {
          doc.fontSize(10).text(String(value), { continued: true });
          doc.text('  ');
        });
        doc.moveDown();
      });
    }

    doc.end();
    return filePath;
  }

  async exportToCSV(reportResult: ReportResult, filename: string): Promise<string> {
    const filePath = path.join(__dirname, '../../exports', `${filename}.csv`);
    
    if (reportResult.data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(reportResult.data[0]);
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers.map(header => ({ id: header, title: header }))
    });

    await csvWriter.writeRecords(reportResult.data);
    return filePath;
  }
}

export const reportingService = new ReportingService(); 