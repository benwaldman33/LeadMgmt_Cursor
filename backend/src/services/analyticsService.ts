import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DashboardMetrics {
  totalLeads: number;
  totalCampaigns: number;
  totalUsers: number;
  totalTeams: number;
  qualifiedLeads: number;
  conversionRate: number;
  averageScore: number;
  recentActivity: any[];
}

export interface LeadTrends {
  daily: Array<{ date: string; count: number }>;
  weekly: Array<{ week: string; count: number }>;
  monthly: Array<{ month: string; count: number }>;
}

export interface ScoringAnalytics {
  averageScore: number;
  scoreDistribution: Array<{ range: string; count: number }>;
  qualifiedRate: number;
  topScoringModels: Array<{ name: string; averageScore: number; leadCount: number }>;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  totalLeads: number;
  qualifiedLeads: number;
  averageScore: number;
  conversionRate: number;
  industry: string;
}

export interface TeamPerformance {
  teamId: string;
  teamName: string;
  totalLeads: number;
  qualifiedLeads: number;
  averageScore: number;
  memberCount: number;
}

export interface UserActivity {
  userId: string;
  userName: string;
  actions: number;
  lastActivity: Date;
  leadCount: number;
}

export class AnalyticsService {
  /**
   * Get comprehensive dashboard metrics
   */
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [
      totalLeads,
      totalCampaigns,
      totalUsers,
      totalTeams,
      qualifiedLeads,
      averageScore,
      recentActivity
    ] = await Promise.all([
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
  }

  /**
   * Get lead trends over time
   */
  static async getLeadTrends(days: number = 30): Promise<LeadTrends> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Daily trends
    const dailyData = await prisma.lead.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: {
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Weekly trends
    const weeklyData = await prisma.$queryRaw`
      SELECT 
        strftime('%Y-%W', createdAt) as week,
        COUNT(*) as count
      FROM leads
      WHERE createdAt >= ${startDate}
      GROUP BY week
      ORDER BY week ASC
    `;

    // Monthly trends
    const monthlyData = await prisma.$queryRaw`
      SELECT 
        strftime('%Y-%m', createdAt) as month,
        COUNT(*) as count
      FROM leads
      WHERE createdAt >= ${startDate}
      GROUP BY month
      ORDER BY month ASC
    `;

    return {
      daily: dailyData.map((item: any) => ({
        date: item.createdAt.toISOString().split('T')[0],
        count: item._count.id
      })),
      weekly: (weeklyData as any[]).map(item => ({
        week: item.week.toISOString().split('T')[0],
        count: Number(item.count)
      })),
      monthly: (monthlyData as any[]).map(item => ({
        month: item.month.toISOString().split('T')[0],
        count: Number(item.count)
      }))
    };
  }

  /**
   * Get scoring analytics
   */
  static async getScoringAnalytics(): Promise<ScoringAnalytics> {
    const [
      averageScore,
      scoreDistribution,
      qualifiedCount,
      totalScored,
      topModels
    ] = await Promise.all([
      prisma.lead.aggregate({
        _avg: { score: true },
        where: { score: { not: null } }
      }),
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN score >= 80 THEN '80-100'
            WHEN score >= 60 THEN '60-79'
            WHEN score >= 40 THEN '40-59'
            WHEN score >= 20 THEN '20-39'
            ELSE '0-19'
          END as range,
          COUNT(*) as count
        FROM leads
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

    const topScoringModels = topModels.map((model: any) => {
      const scores = model.leads.map((lead: any) => lead.score).filter(Boolean);
      const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
      
      return {
        name: model.name,
        averageScore: Math.round(avgScore * 100) / 100,
        leadCount: 0 // TODO: Add lead count when relationship is available
      };
    }).sort((a: any, b: any) => b.averageScore - a.averageScore).slice(0, 5);

    return {
      averageScore: averageScore._avg.score || 0,
      scoreDistribution: (scoreDistribution as any[]).map((item: any) => ({
        range: item.range,
        count: Number(item.count)
      })),
      qualifiedRate: Math.round(qualifiedRate * 100) / 100,
      topScoringModels
    };
  }

  /**
   * Get campaign performance analytics
   */
  static async getCampaignPerformance(): Promise<CampaignPerformance[]> {
    const campaigns = await prisma.campaign.findMany({
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

    return campaigns.map((campaign: any) => {
      const totalLeads = campaign.leads.length;
      const qualifiedLeads = campaign.leads.filter((lead: any) => lead.status === 'QUALIFIED').length;
      const scores = campaign.leads.map((lead: any) => lead.score).filter((score: any) => score !== null && score !== undefined);
      const averageScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
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
    }).sort((a: any, b: any) => b.conversionRate - a.conversionRate);
  }

  /**
   * Get team performance analytics
   */
  static async getTeamPerformance(): Promise<TeamPerformance[]> {
    const teams = await prisma.team.findMany({
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
      const scores = team.leads.map(lead => lead.score).filter((score): score is number => score !== null && score !== undefined);
      const averageScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

      return {
        teamId: team.id,
        teamName: team.name,
        totalLeads,
        qualifiedLeads,
        averageScore: Math.round(averageScore * 100) / 100,
        memberCount: team.members.length
      };
    }).sort((a, b) => b.totalLeads - a.totalLeads);
  }

  /**
   * Get user activity analytics
   */
  static async getUserActivity(): Promise<UserActivity[]> {
    const users = await prisma.user.findMany({
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

    return users.map(user => ({
      userId: user.id,
      userName: user.fullName,
      actions: user._count.auditLogs,
      lastActivity: user.auditLogs[0]?.createdAt || user.createdAt,
      leadCount: 0 // TODO: Add lead count when relationship is available
    })).sort((a, b) => b.actions - a.actions);
  }

  /**
   * Get industry distribution
   */
  static async getIndustryDistribution() {
    const distribution = await prisma.lead.groupBy({
      by: ['industry'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });

    return distribution.map(item => ({
      industry: item.industry,
      count: item._count.id
    }));
  }

  /**
   * Get status distribution
   */
  static async getStatusDistribution() {
    const distribution = await prisma.lead.groupBy({
      by: ['status'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });

    return distribution.map(item => ({
      status: item.status,
      count: item._count.id
    }));
  }

  /**
   * Get recent leads with scores
   */
  static async getRecentLeads(limit: number = 10) {
    return await prisma.lead.findMany({
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
  }

  /**
   * Get conversion funnel data
   */
  static async getConversionFunnel() {
    const totalLeads = await prisma.lead.count();
    const qualifiedLeads = await prisma.lead.count({ where: { status: 'QUALIFIED' } });
    const convertedLeads = await prisma.lead.count({ where: { status: 'CONVERTED' } });

    return {
      total: totalLeads,
      qualified: qualifiedLeads,
      converted: convertedLeads,
      qualifiedRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
      conversionRate: qualifiedLeads > 0 ? (convertedLeads / qualifiedLeads) * 100 : 0
    };
  }

  /**
   * Get scoring model performance
   */
  static async getScoringModelPerformance() {
    const models = await prisma.scoringModel.findMany({
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
  }
} 