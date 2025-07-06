import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SearchFilters {
  query?: string;
  entityType?: 'LEAD' | 'CAMPAIGN' | 'USER' | 'TEAM' | 'SCORING_MODEL';
  status?: string;
  campaignId?: string;
  assignedToId?: string;
  assignedTeamId?: string;
  industry?: string;
  dateFrom?: Date;
  dateTo?: Date;
  scoreMin?: number;
  scoreMax?: number;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  type: 'LEAD' | 'CAMPAIGN' | 'USER' | 'TEAM' | 'SCORING_MODEL';
  id: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
  score?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadFilters {
  query?: string;
  status?: string[];
  campaignId?: string;
  assignedToId?: string;
  assignedTeamId?: string;
  industry?: string;
  scoreMin?: number;
  scoreMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  enriched?: boolean;
  scored?: boolean;
  limit?: number;
  offset?: number;
}

export interface CampaignFilters {
  query?: string;
  status?: string[];
  createdById?: string;
  assignedTeamId?: string;
  industry?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export class SearchService {
  /**
   * Global search across all entities
   */
  static async globalSearch(filters: SearchFilters): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const query = filters.query?.toLowerCase();

    if (!query) {
      return results;
    }

    // Search leads
    if (!filters.entityType || filters.entityType === 'LEAD') {
      const leads = await prisma.lead.findMany({
        where: {
          OR: [
            { companyName: { contains: query, mode: 'insensitive' } },
            { domain: { contains: query, mode: 'insensitive' } },
            { industry: { contains: query, mode: 'insensitive' } },
            { url: { contains: query, mode: 'insensitive' } },
          ],
          ...(filters.status && { status: { in: [filters.status] } }),
          ...(filters.campaignId && { campaignId: filters.campaignId }),
          ...(filters.assignedToId && { assignedToId: filters.assignedToId }),
          ...(filters.assignedTeamId && { assignedTeamId: filters.assignedTeamId }),
          ...(filters.industry && { industry: { contains: filters.industry, mode: 'insensitive' } }),
          ...(filters.dateFrom && { createdAt: { gte: filters.dateFrom } }),
          ...(filters.dateTo && { createdAt: { lte: filters.dateTo } }),
          ...(filters.scoreMin && { score: { gte: filters.scoreMin } }),
          ...(filters.scoreMax && { score: { lte: filters.scoreMax } }),
        },
        include: {
          campaign: true,
          assignedTo: true,
          assignedTeam: true,
        },
        take: filters.limit || 20,
        skip: filters.offset || 0,
        orderBy: { createdAt: 'desc' },
      });

      results.push(...leads.map(lead => ({
        type: 'LEAD' as const,
        id: lead.id,
        title: lead.companyName,
        description: `${lead.domain} - ${lead.industry}`,
        metadata: {
          status: lead.status,
          score: lead.score,
          campaign: lead.campaign.name,
          assignedTo: lead.assignedTo?.fullName,
          assignedTeam: lead.assignedTeam?.name,
        },
        score: lead.score,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      })));
    }

    // Search campaigns
    if (!filters.entityType || filters.entityType === 'CAMPAIGN') {
      const campaigns = await prisma.campaign.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { industry: { contains: query, mode: 'insensitive' } },
          ],
          ...(filters.status && { status: { in: [filters.status] } }),
          ...(filters.assignedTeamId && { assignedTeamId: filters.assignedTeamId }),
          ...(filters.industry && { industry: { contains: filters.industry, mode: 'insensitive' } }),
          ...(filters.dateFrom && { createdAt: { gte: filters.dateFrom } }),
          ...(filters.dateTo && { createdAt: { lte: filters.dateTo } }),
        },
        include: {
          createdBy: true,
          assignedTeam: true,
        },
        take: filters.limit || 20,
        skip: filters.offset || 0,
        orderBy: { createdAt: 'desc' },
      });

      results.push(...campaigns.map(campaign => ({
        type: 'CAMPAIGN' as const,
        id: campaign.id,
        title: campaign.name,
        description: `${campaign.industry} - ${campaign.status}`,
        metadata: {
          status: campaign.status,
          industry: campaign.industry,
          createdBy: campaign.createdBy.fullName,
          assignedTeam: campaign.assignedTeam?.name,
          leadCount: campaign.currentLeadCount,
        },
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      })));
    }

    // Search users
    if (!filters.entityType || filters.entityType === 'USER') {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
          ...(filters.status && { status: { in: [filters.status] } }),
          ...(filters.dateFrom && { createdAt: { gte: filters.dateFrom } }),
          ...(filters.dateTo && { createdAt: { lte: filters.dateTo } }),
        },
        include: {
          team: true,
        },
        take: filters.limit || 20,
        skip: filters.offset || 0,
        orderBy: { createdAt: 'desc' },
      });

      results.push(...users.map(user => ({
        type: 'USER' as const,
        id: user.id,
        title: user.fullName,
        description: `${user.email} - ${user.role}`,
        metadata: {
          email: user.email,
          role: user.role,
          status: user.status,
          team: user.team?.name,
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })));
    }

    // Search teams
    if (!filters.entityType || filters.entityType === 'TEAM') {
      const teams = await prisma.team.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { industry: { contains: query, mode: 'insensitive' } },
          ],
          ...(filters.industry && { industry: { contains: filters.industry, mode: 'insensitive' } }),
          ...(filters.dateFrom && { createdAt: { gte: filters.dateFrom } }),
          ...(filters.dateTo && { createdAt: { lte: filters.dateTo } }),
        },
        include: {
          members: true,
        },
        take: filters.limit || 20,
        skip: filters.offset || 0,
        orderBy: { createdAt: 'desc' },
      });

      results.push(...teams.map(team => ({
        type: 'TEAM' as const,
        id: team.id,
        title: team.name,
        description: `${team.industry} - ${team.members.length} members`,
        metadata: {
          industry: team.industry,
          memberCount: team.members.length,
        },
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      })));
    }

    // Search scoring models
    if (!filters.entityType || filters.entityType === 'SCORING_MODEL') {
      const scoringModels = await prisma.scoringModel.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { industry: { contains: query, mode: 'insensitive' } },
          ],
          ...(filters.industry && { industry: { contains: filters.industry, mode: 'insensitive' } }),
          ...(filters.dateFrom && { createdAt: { gte: filters.dateFrom } }),
          ...(filters.dateTo && { createdAt: { lte: filters.dateTo } }),
        },
        include: {
          createdBy: true,
          criteria: true,
        },
        take: filters.limit || 20,
        skip: filters.offset || 0,
        orderBy: { createdAt: 'desc' },
      });

      results.push(...scoringModels.map(model => ({
        type: 'SCORING_MODEL' as const,
        id: model.id,
        title: model.name,
        description: `${model.industry} - ${model.criteria.length} criteria`,
        metadata: {
          industry: model.industry,
          isActive: model.isActive,
          createdBy: model.createdBy.fullName,
          criteriaCount: model.criteria.length,
        },
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
      })));
    }

    return results;
  }

  /**
   * Advanced lead filtering
   */
  static async searchLeads(filters: LeadFilters) {
    const where: any = {};

    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      where.OR = [
        { companyName: { contains: query, mode: 'insensitive' } },
        { domain: { contains: query, mode: 'insensitive' } },
        { industry: { contains: query, mode: 'insensitive' } },
        { url: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    // Campaign filter
    if (filters.campaignId) {
      where.campaignId = filters.campaignId;
    }

    // Assignment filters
    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.assignedTeamId) {
      where.assignedTeamId = filters.assignedTeamId;
    }

    // Industry filter
    if (filters.industry) {
      where.industry = { contains: filters.industry, mode: 'insensitive' };
    }

    // Score range
    if (filters.scoreMin || filters.scoreMax) {
      where.score = {};
      if (filters.scoreMin) where.score.gte = filters.scoreMin;
      if (filters.scoreMax) where.score.lte = filters.scoreMax;
    }

    // Date range
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    // Enrichment filter
    if (filters.enriched !== undefined) {
      if (filters.enriched) {
        where.enrichment = { isNot: null };
      } else {
        where.enrichment = { is: null };
      }
    }

    // Scoring filter
    if (filters.scored !== undefined) {
      if (filters.scored) {
        where.scoringDetails = { isNot: null };
      } else {
        where.scoringDetails = { is: null };
      }
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        campaign: true,
        assignedTo: true,
        assignedTeam: true,
        enrichment: true,
        scoringDetails: true,
      },
      take: filters.limit || 50,
      skip: filters.offset || 0,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.lead.count({ where });

    return {
      leads,
      total,
      hasMore: total > (filters.offset || 0) + (filters.limit || 50),
    };
  }

  /**
   * Advanced campaign filtering
   */
  static async searchCampaigns(filters: CampaignFilters) {
    const where: any = {};

    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { industry: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    // Created by filter
    if (filters.createdById) {
      where.createdById = filters.createdById;
    }

    // Team filter
    if (filters.assignedTeamId) {
      where.assignedTeamId = filters.assignedTeamId;
    }

    // Industry filter
    if (filters.industry) {
      where.industry = { contains: filters.industry, mode: 'insensitive' };
    }

    // Date range
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        createdBy: true,
        assignedTeam: true,
        scoringModel: true,
        _count: {
          select: { leads: true },
        },
      },
      take: filters.limit || 50,
      skip: filters.offset || 0,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.campaign.count({ where });

    return {
      campaigns,
      total,
      hasMore: total > (filters.offset || 0) + (filters.limit || 50),
    };
  }

  /**
   * Get search suggestions
   */
  static async getSearchSuggestions(query: string, entityType?: string) {
    const suggestions: string[] = [];
    const searchQuery = query.toLowerCase();

    if (!entityType || entityType === 'LEAD') {
      // Company name suggestions
      const companies = await prisma.lead.findMany({
        where: {
          companyName: { contains: searchQuery, mode: 'insensitive' },
        },
        select: { companyName: true },
        take: 5,
      });
      suggestions.push(...companies.map(c => c.companyName));

      // Industry suggestions
      const industries = await prisma.lead.findMany({
        where: {
          industry: { contains: searchQuery, mode: 'insensitive' },
        },
        select: { industry: true },
        take: 5,
      });
      suggestions.push(...industries.map(i => i.industry));
    }

    if (!entityType || entityType === 'CAMPAIGN') {
      // Campaign name suggestions
      const campaigns = await prisma.campaign.findMany({
        where: {
          name: { contains: searchQuery, mode: 'insensitive' },
        },
        select: { name: true },
        take: 5,
      });
      suggestions.push(...campaigns.map(c => c.name));
    }

    if (!entityType || entityType === 'USER') {
      // User name suggestions
      const users = await prisma.user.findMany({
        where: {
          fullName: { contains: searchQuery, mode: 'insensitive' },
        },
        select: { fullName: true },
        take: 5,
      });
      suggestions.push(...users.map(u => u.fullName));
    }

    return [...new Set(suggestions)].slice(0, 10);
  }
} 