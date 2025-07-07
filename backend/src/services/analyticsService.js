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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AnalyticsService {
    /**
     * Get comprehensive dashboard metrics
     */
    static getDashboardMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            const [totalLeads, totalCampaigns, totalUsers, totalTeams, qualifiedLeads, averageScore, recentActivity] = yield Promise.all([
                prisma.lead.count(),
                prisma.campaign.count(),
                prisma.user.count(),
                prisma.team.count(),
                prisma.lead.count({ where: { status: 'QUALIFIED' } }),
                prisma.lead.aggregate({
                    _avg: { score: true },
                    where: { score: { not: null } }
                }),
                prisma.auditLog.findMany({
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: { fullName: true, email: true }
                        }
                    }
                })
            ]);
            const conversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;
            return {
                totalLeads,
                totalCampaigns,
                totalUsers,
                totalTeams,
                qualifiedLeads,
                conversionRate: Math.round(conversionRate * 100) / 100,
                averageScore: averageScore._avg.score || 0,
                recentActivity
            };
        });
    }
    /**
     * Get lead trends over time
     */
    static getLeadTrends() {
        return __awaiter(this, arguments, void 0, function* (days = 30) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            // Daily trends
            const dailyData = yield prisma.lead.groupBy({
                by: ['createdAt'],
                _count: { id: true },
                where: {
                    createdAt: { gte: startDate }
                },
                orderBy: { createdAt: 'asc' }
            });
            // Weekly trends
            const weeklyData = yield prisma.$queryRaw `
      SELECT 
        DATE_TRUNC('week', "createdAt") as week,
        COUNT(*) as count
      FROM "Lead"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('week', "createdAt")
      ORDER BY week ASC
    `;
            // Monthly trends
            const monthlyData = yield prisma.$queryRaw `
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as count
      FROM "Lead"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `;
            return {
                daily: dailyData.map((item) => ({
                    date: item.createdAt.toISOString().split('T')[0],
                    count: item._count.id
                })),
                weekly: weeklyData.map(item => ({
                    week: item.week.toISOString().split('T')[0],
                    count: Number(item.count)
                })),
                monthly: monthlyData.map(item => ({
                    month: item.month.toISOString().split('T')[0],
                    count: Number(item.count)
                }))
            };
        });
    }
    /**
     * Get scoring analytics
     */
    static getScoringAnalytics() {
        return __awaiter(this, void 0, void 0, function* () {
            const [averageScore, scoreDistribution, qualifiedCount, totalScored, topModels] = yield Promise.all([
                prisma.lead.aggregate({
                    _avg: { score: true },
                    where: { score: { not: null } }
                }),
                prisma.$queryRaw `
        SELECT 
          CASE 
            WHEN score >= 80 THEN '80-100'
            WHEN score >= 60 THEN '60-79'
            WHEN score >= 40 THEN '40-59'
            WHEN score >= 20 THEN '20-39'
            ELSE '0-19'
          END as range,
          COUNT(*) as count
        FROM "Lead"
        WHERE score IS NOT NULL
        GROUP BY range
        ORDER BY range DESC
      `,
                prisma.lead.count({ where: { status: 'QUALIFIED' } }),
                prisma.lead.count({ where: { score: { not: null } } }),
                prisma.scoringModel.findMany({
                    include: {
                        _count: {
                            select: {
                                criteria: true
                            }
                        }
                    }
                })
            ]);
            const qualifiedRate = totalScored > 0 ? (qualifiedCount / totalScored) * 100 : 0;
            const topScoringModels = topModels.map((model) => {
                const scores = model.leads.map((lead) => lead.score).filter(Boolean);
                const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                return {
                    name: model.name,
                    averageScore: Math.round(avgScore * 100) / 100,
                    leadCount: 0 // TODO: Add lead count when relationship is available
                };
            }).sort((a, b) => b.averageScore - a.averageScore).slice(0, 5);
            return {
                averageScore: averageScore._avg.score || 0,
                scoreDistribution: scoreDistribution.map((item) => ({
                    range: item.range,
                    count: Number(item.count)
                })),
                qualifiedRate: Math.round(qualifiedRate * 100) / 100,
                topScoringModels
            };
        });
    }
    /**
     * Get campaign performance analytics
     */
    static getCampaignPerformance() {
        return __awaiter(this, void 0, void 0, function* () {
            const campaigns = yield prisma.campaign.findMany({
                include: {
                    leads: {
                        select: {
                            id: true,
                            status: true,
                            score: true
                        }
                    }
                }
            });
            return campaigns.map((campaign) => {
                const totalLeads = campaign.leads.length;
                const qualifiedLeads = campaign.leads.filter((lead) => lead.status === 'QUALIFIED').length;
                const scores = campaign.leads.map((lead) => lead.score).filter((score) => score !== null && score !== undefined);
                const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                const conversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;
                return {
                    campaignId: campaign.id,
                    campaignName: campaign.name,
                    totalLeads,
                    qualifiedLeads,
                    averageScore: Math.round(averageScore * 100) / 100,
                    conversionRate: Math.round(conversionRate * 100) / 100,
                    industry: campaign.industry
                };
            }).sort((a, b) => b.conversionRate - a.conversionRate);
        });
    }
    /**
     * Get team performance analytics
     */
    static getTeamPerformance() {
        return __awaiter(this, void 0, void 0, function* () {
            const teams = yield prisma.team.findMany({
                include: {
                    members: true,
                    leads: {
                        select: {
                            id: true,
                            status: true,
                            score: true
                        }
                    }
                }
            });
            return teams.map(team => {
                const totalLeads = team.leads.length;
                const qualifiedLeads = team.leads.filter(lead => lead.status === 'QUALIFIED').length;
                const scores = team.leads.map(lead => lead.score).filter((score) => score !== null && score !== undefined);
                const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                return {
                    teamId: team.id,
                    teamName: team.name,
                    totalLeads,
                    qualifiedLeads,
                    averageScore: Math.round(averageScore * 100) / 100,
                    memberCount: team.members.length
                };
            }).sort((a, b) => b.totalLeads - a.totalLeads);
        });
    }
    /**
     * Get user activity analytics
     */
    static getUserActivity() {
        return __awaiter(this, void 0, void 0, function* () {
            const users = yield prisma.user.findMany({
                include: {
                    _count: {
                        select: {
                            auditLogs: true
                        }
                    },
                    auditLogs: {
                        take: 1,
                        orderBy: { createdAt: 'desc' },
                        select: { createdAt: true }
                    }
                }
            });
            return users.map(user => {
                var _a;
                return ({
                    userId: user.id,
                    userName: user.fullName,
                    actions: user._count.auditLogs,
                    lastActivity: ((_a = user.auditLogs[0]) === null || _a === void 0 ? void 0 : _a.createdAt) || user.createdAt,
                    leadCount: 0 // TODO: Add lead count when relationship is available
                });
            }).sort((a, b) => b.actions - a.actions);
        });
    }
    /**
     * Get industry distribution
     */
    static getIndustryDistribution() {
        return __awaiter(this, void 0, void 0, function* () {
            const distribution = yield prisma.lead.groupBy({
                by: ['industry'],
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } }
            });
            return distribution.map(item => ({
                industry: item.industry,
                count: item._count.id
            }));
        });
    }
    /**
     * Get status distribution
     */
    static getStatusDistribution() {
        return __awaiter(this, void 0, void 0, function* () {
            const distribution = yield prisma.lead.groupBy({
                by: ['status'],
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } }
            });
            return distribution.map(item => ({
                status: item.status,
                count: item._count.id
            }));
        });
    }
    /**
     * Get recent leads with scores
     */
    static getRecentLeads() {
        return __awaiter(this, arguments, void 0, function* (limit = 10) {
            return yield prisma.lead.findMany({
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    campaign: {
                        select: { name: true }
                    },
                    assignedTo: {
                        select: { fullName: true }
                    },
                    assignedTeam: {
                        select: { name: true }
                    }
                }
            });
        });
    }
    /**
     * Get conversion funnel data
     */
    static getConversionFunnel() {
        return __awaiter(this, void 0, void 0, function* () {
            const totalLeads = yield prisma.lead.count();
            const qualifiedLeads = yield prisma.lead.count({ where: { status: 'QUALIFIED' } });
            const convertedLeads = yield prisma.lead.count({ where: { status: 'CONVERTED' } });
            return {
                total: totalLeads,
                qualified: qualifiedLeads,
                converted: convertedLeads,
                qualifiedRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
                conversionRate: qualifiedLeads > 0 ? (convertedLeads / qualifiedLeads) * 100 : 0
            };
        });
    }
    /**
     * Get scoring model performance
     */
    static getScoringModelPerformance() {
        return __awaiter(this, void 0, void 0, function* () {
            const models = yield prisma.scoringModel.findMany({
                include: {
                    _count: {
                        select: {
                            criteria: true
                        }
                    }
                }
            });
            return models.map(model => ({
                id: model.id,
                name: model.name,
                industry: model.industry,
                criteriaCount: model._count.criteria,
                isActive: model.isActive,
                createdAt: model.createdAt
            }));
        });
    }
}
exports.AnalyticsService = AnalyticsService;
