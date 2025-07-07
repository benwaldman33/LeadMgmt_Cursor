"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportingService = void 0;
const client_1 = require("@prisma/client");
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const csv_writer_1 = require("csv-writer");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
class ReportingService {
    // Generate custom reports based on configuration
    generateReport(config) {
        return __awaiter(this, void 0, void 0, function* () {
            const { type, filters, metrics, groupBy, sortBy, sortOrder, limit } = config;
            let data = [];
            let summary = {};
            switch (type) {
                case 'lead_analysis':
                    data = yield this.generateLeadAnalysis(filters, metrics, groupBy, sortBy, sortOrder, limit);
                    summary = yield this.calculateLeadSummary(filters);
                    break;
                case 'campaign_performance':
                    data = yield this.generateCampaignPerformance(filters, metrics, groupBy, sortBy, sortOrder, limit);
                    summary = yield this.calculateCampaignSummary(filters);
                    break;
                case 'team_performance':
                    data = yield this.generateTeamPerformance(filters, metrics, groupBy, sortBy, sortOrder, limit);
                    summary = yield this.calculateTeamSummary(filters);
                    break;
                case 'scoring_analysis':
                    data = yield this.generateScoringAnalysis(filters, metrics, groupBy, sortBy, sortOrder, limit);
                    summary = yield this.calculateScoringSummary(filters);
                    break;
                case 'conversion_funnel':
                    data = yield this.generateConversionFunnel(filters, metrics);
                    summary = yield this.calculateFunnelSummary(filters);
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
        });
    }
    // Lead Analysis Report
    generateLeadAnalysis(filters_1, metrics_1, groupBy_1, sortBy_1) {
        return __awaiter(this, arguments, void 0, function* (filters, metrics, groupBy, sortBy, sortOrder = 'desc', limit) {
            const where = this.buildWhereClause(filters);
            const leads = yield prisma.lead.findMany({
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
        });
    }
    // Campaign Performance Report
    generateCampaignPerformance(filters_1, metrics_1, groupBy_1, sortBy_1) {
        return __awaiter(this, arguments, void 0, function* (filters, metrics, groupBy, sortBy, sortOrder = 'desc', limit) {
            const campaigns = yield prisma.campaign.findMany({
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
        });
    }
    // Team Performance Report
    generateTeamPerformance(filters_1, metrics_1, groupBy_1, sortBy_1) {
        return __awaiter(this, arguments, void 0, function* (filters, metrics, groupBy, sortBy, sortOrder = 'desc', limit) {
            const teams = yield prisma.team.findMany({
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
        });
    }
    // Scoring Analysis Report
    generateScoringAnalysis(filters_1, metrics_1, groupBy_1, sortBy_1) {
        return __awaiter(this, arguments, void 0, function* (filters, metrics, groupBy, sortBy, sortOrder = 'desc', limit) {
            const scoringDetails = yield prisma.scoringResult.findMany({
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
        });
    }
    // Conversion Funnel Report
    generateConversionFunnel(filters, metrics) {
        return __awaiter(this, void 0, void 0, function* () {
            const where = this.buildWhereClause(filters);
            const leads = yield prisma.lead.findMany({
                where,
                include: {
                    campaign: true,
                    scoringDetails: true,
                }
            });
            return this.processFunnelData(leads, metrics);
        });
    }
    // Build where clause for filtering
    buildWhereClause(filters) {
        var _a, _b, _c, _d, _e;
        const where = {};
        if (filters.dateRange) {
            where.createdAt = {
                gte: filters.dateRange.start,
                lte: filters.dateRange.end,
            };
        }
        if ((_a = filters.campaignIds) === null || _a === void 0 ? void 0 : _a.length) {
            where.campaignId = { in: filters.campaignIds };
        }
        if ((_b = filters.teamIds) === null || _b === void 0 ? void 0 : _b.length) {
            where.assignedTeamId = { in: filters.teamIds };
        }
        if ((_c = filters.userIds) === null || _c === void 0 ? void 0 : _c.length) {
            where.assignedToId = { in: filters.userIds };
        }
        if ((_d = filters.status) === null || _d === void 0 ? void 0 : _d.length) {
            where.status = { in: filters.status };
        }
        if ((_e = filters.industry) === null || _e === void 0 ? void 0 : _e.length) {
            where.industry = { in: filters.industry };
        }
        return where;
    }
    // Process lead data for reporting
    processLeadData(leads, metrics, groupBy) {
        if (groupBy) {
            const grouped = leads.reduce((acc, lead) => {
                const key = lead[groupBy] || 'Unknown';
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(lead);
                return acc;
            }, {});
            return Object.entries(grouped).map(([key, groupLeads]) => (Object.assign({ group: key, count: groupLeads.length, averageScore: this.calculateAverageScore(groupLeads), qualifiedCount: groupLeads.filter((l) => { var _a; return ((_a = l.scoringDetails) === null || _a === void 0 ? void 0 : _a.totalScore) >= 70; }).length, conversionRate: this.calculateConversionRate(groupLeads) }, this.calculateMetrics(groupLeads, metrics))));
        }
        return leads.map(lead => {
            var _a, _b, _c, _d;
            return (Object.assign({ id: lead.id, companyName: lead.companyName, status: lead.status, score: ((_a = lead.scoringDetails) === null || _a === void 0 ? void 0 : _a.totalScore) || 0, campaign: (_b = lead.campaign) === null || _b === void 0 ? void 0 : _b.name, assignedTo: (_c = lead.assignedTo) === null || _c === void 0 ? void 0 : _c.fullName, assignedTeam: (_d = lead.assignedTeam) === null || _d === void 0 ? void 0 : _d.name, createdAt: lead.createdAt }, this.calculateMetrics([lead], metrics)));
        });
    }
    // Process campaign data for reporting
    processCampaignData(campaigns, metrics, groupBy, sortBy, sortOrder = 'desc', limit) {
        const campaignStats = campaigns.map(campaign => {
            const leads = campaign.leads || [];
            const qualifiedLeads = leads.filter((l) => { var _a; return ((_a = l.scoringDetails) === null || _a === void 0 ? void 0 : _a.totalScore) >= 70; });
            return Object.assign({ id: campaign.id, name: campaign.name, industry: campaign.industry, totalLeads: leads.length, qualifiedLeads: qualifiedLeads.length, averageScore: this.calculateAverageScore(leads), conversionRate: leads.length > 0 ? (qualifiedLeads.length / leads.length) * 100 : 0, createdAt: campaign.createdAt }, this.calculateMetrics(leads, metrics));
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
    processTeamData(teams, metrics, groupBy, sortBy, sortOrder = 'desc', limit) {
        const teamStats = teams.map(team => {
            var _a;
            const leads = team.leads || [];
            const qualifiedLeads = leads.filter((l) => { var _a; return ((_a = l.scoringDetails) === null || _a === void 0 ? void 0 : _a.totalScore) >= 70; });
            return Object.assign({ id: team.id, name: team.name, industry: team.industry, memberCount: ((_a = team.users) === null || _a === void 0 ? void 0 : _a.length) || 0, totalLeads: leads.length, qualifiedLeads: qualifiedLeads.length, averageScore: this.calculateAverageScore(leads), conversionRate: leads.length > 0 ? (qualifiedLeads.length / leads.length) * 100 : 0 }, this.calculateMetrics(leads, metrics));
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
    processScoringData(scoringDetails, metrics, groupBy, sortBy, sortOrder = 'desc', limit) {
        const scoringStats = scoringDetails.map(detail => (Object.assign({ id: detail.id, leadId: detail.leadId, totalScore: detail.totalScore, qualified: detail.totalScore >= 70, lead: detail.lead, createdAt: detail.createdAt }, this.calculateMetrics([detail], metrics))));
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
    processFunnelData(leads, metrics) {
        const stages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed'];
        const funnelData = stages.map(stage => {
            const stageLeads = leads.filter(lead => lead.status === stage);
            return Object.assign({ stage, count: stageLeads.length, percentage: leads.length > 0 ? (stageLeads.length / leads.length) * 100 : 0, averageScore: this.calculateAverageScore(stageLeads) }, this.calculateMetrics(stageLeads, metrics));
        });
        return funnelData;
    }
    // Calculate metrics for data
    calculateMetrics(data, metrics) {
        const result = {};
        metrics.forEach(metric => {
            switch (metric) {
                case 'totalValue':
                    result.totalValue = data.reduce((sum, item) => { var _a; return sum + (((_a = item.enrichment) === null || _a === void 0 ? void 0 : _a.revenue) || 0); }, 0);
                    break;
                case 'averageCompanySize':
                    result.averageCompanySize = data.reduce((sum, item) => { var _a; return sum + (((_a = item.enrichment) === null || _a === void 0 ? void 0 : _a.companySize) || 0); }, 0) / data.length;
                    break;
                case 'technologyCount':
                    result.technologyCount = data.reduce((sum, item) => {
                        var _a;
                        const techs = ((_a = item.enrichment) === null || _a === void 0 ? void 0 : _a.technologies) ? JSON.parse(item.enrichment.technologies) : [];
                        return sum + techs.length;
                    }, 0);
                    break;
            }
        });
        return result;
    }
    // Calculate average score
    calculateAverageScore(data) {
        if (data.length === 0)
            return 0;
        const totalScore = data.reduce((sum, item) => { var _a; return sum + (((_a = item.scoringDetails) === null || _a === void 0 ? void 0 : _a.totalScore) || 0); }, 0);
        return Math.round((totalScore / data.length) * 100) / 100;
    }
    // Calculate conversion rate
    calculateConversionRate(data) {
        if (data.length === 0)
            return 0;
        const qualifiedCount = data.filter(item => { var _a; return ((_a = item.scoringDetails) === null || _a === void 0 ? void 0 : _a.totalScore) >= 70; }).length;
        return Math.round((qualifiedCount / data.length) * 100);
    }
    // Generate charts for reports
    generateCharts(data, chartTypes, reportType) {
        const charts = [];
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
    generateBarChart(data, reportType) {
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
    generateLineChart(data, reportType) {
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
    generatePieChart(data, reportType) {
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
    generateFunnelChart(data, reportType) {
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
    calculateLeadSummary(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const where = this.buildWhereClause(filters);
            const totalLeads = yield prisma.lead.count({ where });
            const qualifiedLeads = yield prisma.lead.count({
                where: Object.assign(Object.assign({}, where), { scoringDetails: {
                        totalScore: { gte: 70 }
                    } })
            });
            return {
                totalRecords: totalLeads,
                qualifiedLeads,
                conversionRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
            };
        });
    }
    calculateCampaignSummary(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const campaigns = yield prisma.campaign.findMany({
                include: {
                    leads: {
                        include: { scoringDetails: true }
                    }
                }
            });
            const totalLeads = campaigns.reduce((sum, campaign) => sum + campaign.leads.length, 0);
            const qualifiedLeads = campaigns.reduce((sum, campaign) => sum + campaign.leads.filter(lead => { var _a; return ((_a = lead.scoringDetails) === null || _a === void 0 ? void 0 : _a.totalScore) && lead.scoringDetails.totalScore >= 70; }).length, 0);
            return {
                totalRecords: campaigns.length,
                totalLeads,
                qualifiedLeads,
                conversionRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
            };
        });
    }
    calculateTeamSummary(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const teams = yield prisma.team.findMany({
                include: {
                    leads: {
                        include: { scoringDetails: true }
                    }
                }
            });
            const totalLeads = teams.reduce((sum, team) => { var _a; return sum + (((_a = team.leads) === null || _a === void 0 ? void 0 : _a.length) || 0); }, 0);
            const qualifiedLeads = teams.reduce((sum, team) => { var _a; return sum + (((_a = team.leads) === null || _a === void 0 ? void 0 : _a.filter(lead => { var _a; return ((_a = lead.scoringDetails) === null || _a === void 0 ? void 0 : _a.totalScore) && lead.scoringDetails.totalScore >= 70; }).length) || 0); }, 0);
            return {
                totalRecords: teams.length,
                totalLeads,
                qualifiedLeads,
                conversionRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
            };
        });
    }
    calculateScoringSummary(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const scoringDetails = yield prisma.scoringResult.findMany({
                include: { lead: true }
            });
            const totalScores = scoringDetails.length;
            const qualifiedScores = scoringDetails.filter((detail) => detail.totalScore >= 70).length;
            const averageScore = scoringDetails.reduce((sum, detail) => sum + detail.totalScore, 0) / totalScores;
            return {
                totalRecords: totalScores,
                qualifiedScores,
                averageScore: Math.round(averageScore * 100) / 100,
                conversionRate: totalScores > 0 ? (qualifiedScores / totalScores) * 100 : 0,
            };
        });
    }
    calculateFunnelSummary(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const where = this.buildWhereClause(filters);
            const leads = yield prisma.lead.findMany({ where });
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
                conversionRate: leads.length > 0 ? (((_a = funnelData.find(s => s.stage === 'Closed')) === null || _a === void 0 ? void 0 : _a.count) || 0) / leads.length * 100 : 0,
            };
        });
    }
    // Export functionality
    exportToExcel(reportResult, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const workbook = new exceljs_1.default.Workbook();
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
            const filePath = path_1.default.join(__dirname, '../../exports', `${filename}.xlsx`);
            yield workbook.xlsx.writeFile(filePath);
            return filePath;
        });
    }
    exportToPDF(reportResult, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = new pdfkit_1.default();
            const filePath = path_1.default.join(__dirname, '../../exports', `${filename}.pdf`);
            const stream = fs_1.default.createWriteStream(filePath);
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
        });
    }
    exportToCSV(reportResult, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = path_1.default.join(__dirname, '../../exports', `${filename}.csv`);
            if (reportResult.data.length === 0) {
                throw new Error('No data to export');
            }
            const headers = Object.keys(reportResult.data[0]);
            const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
                path: filePath,
                header: headers.map(header => ({ id: header, title: header }))
            });
            yield csvWriter.writeRecords(reportResult.data);
            return filePath;
        });
    }
}
exports.reportingService = new ReportingService();
