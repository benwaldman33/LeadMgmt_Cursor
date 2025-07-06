import { prisma } from '../index';

interface ScoringResult {
  totalScore: number;
  confidence: number;
  criteriaScores: Array<{
    criterionId: string;
    score: number;
    matchedContent: string[];
    confidence: number;
  }>;
}

export class ScoringService {
  /**
   * Score a lead using the specified scoring model
   */
  static async scoreLead(leadId: string, scoringModelId: string): Promise<ScoringResult> {
    // Get the lead and scoring model
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { campaign: true }
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    const scoringModel = await prisma.scoringModel.findUnique({
      where: { id: scoringModelId },
      include: { criteria: true }
    });

    if (!scoringModel) {
      throw new Error('Scoring model not found');
    }

    // Score each criterion
    const criteriaScores = [];
    let totalScore = 0;
    let totalConfidence = 0;

    for (const criterion of scoringModel.criteria) {
      const criterionScore = await this.scoreCriterion(lead, criterion);
      criteriaScores.push(criterionScore);
      
      // Weight the score by the criterion weight
      const weightedScore = (criterionScore.score / 100) * criterion.weight;
      totalScore += weightedScore;
      totalConfidence += criterionScore.confidence;
    }

    // Calculate average confidence
    const averageConfidence = totalConfidence / scoringModel.criteria.length;

    return {
      totalScore: Math.round(totalScore),
      confidence: Math.round(averageConfidence),
      criteriaScores
    };
  }

  /**
   * Score a single criterion against a lead
   */
  private static async scoreCriterion(lead: any, criterion: any): Promise<{
    criterionId: string;
    score: number;
    matchedContent: string[];
    confidence: number;
  }> {
    const searchTerms = JSON.parse(criterion.searchTerms);
    const matchedContent: string[] = [];
    let score = 0;
    let confidence = 0;

    // Combine all text content for analysis
    const contentToAnalyze = [
      lead.companyName,
      lead.domain,
      lead.industry,
      lead.url
    ].filter(Boolean).join(' ').toLowerCase();

    // Score based on criterion type
    switch (criterion.type) {
      case 'KEYWORD':
        score = this.scoreKeywordMatch(contentToAnalyze, searchTerms, matchedContent);
        break;
      case 'DOMAIN':
        score = this.scoreDomainMatch(lead.domain, searchTerms, matchedContent);
        break;
      case 'CONTENT':
        score = this.scoreContentMatch(contentToAnalyze, searchTerms, matchedContent);
        break;
      default:
        score = 0;
    }

    // Calculate confidence based on number of matches
    confidence = Math.min(100, (matchedContent.length / searchTerms.length) * 100);

    return {
      criterionId: criterion.id,
      score,
      matchedContent,
      confidence
    };
  }

  /**
   * Score keyword matches in content
   */
  private static scoreKeywordMatch(content: string, searchTerms: string[], matchedContent: string[]): number {
    let matches = 0;
    
    for (const term of searchTerms) {
      if (content.includes(term.toLowerCase())) {
        matches++;
        matchedContent.push(term);
      }
    }

    return Math.round((matches / searchTerms.length) * 100);
  }

  /**
   * Score domain matches
   */
  private static scoreDomainMatch(domain: string, searchTerms: string[], matchedContent: string[]): number {
    const domainLower = domain.toLowerCase();
    let matches = 0;
    
    for (const term of searchTerms) {
      if (domainLower.includes(term.toLowerCase())) {
        matches++;
        matchedContent.push(term);
      }
    }

    return Math.round((matches / searchTerms.length) * 100);
  }

  /**
   * Score content quality matches
   */
  private static scoreContentMatch(content: string, searchTerms: string[], matchedContent: string[]): number {
    let matches = 0;
    
    for (const term of searchTerms) {
      if (content.includes(term.toLowerCase())) {
        matches++;
        matchedContent.push(term);
      }
    }

    // Content quality gets a bonus for multiple matches
    const baseScore = (matches / searchTerms.length) * 100;
    const bonus = matches > 1 ? Math.min(20, (matches - 1) * 10) : 0;
    
    return Math.round(Math.min(100, baseScore + bonus));
  }

  /**
   * Save scoring results to database
   */
  static async saveScoringResult(leadId: string, scoringResult: ScoringResult): Promise<void> {
    // Delete existing scoring result if any
    await prisma.scoringResult.deleteMany({
      where: { leadId }
    });

    // Create new scoring result
    const result = await prisma.scoringResult.create({
      data: {
        leadId,
        totalScore: scoringResult.totalScore,
        confidence: scoringResult.confidence,
        scoringModelVersion: '1.0', // We could track model versions later
        criteriaScores: {
          create: scoringResult.criteriaScores.map(cs => ({
            criterionId: cs.criterionId,
            score: cs.score,
            matchedContent: JSON.stringify(cs.matchedContent),
            confidence: cs.confidence
          }))
        }
      }
    });

    // Update lead with score and status
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        score: scoringResult.totalScore,
        status: scoringResult.totalScore >= 70 ? 'QUALIFIED' : 'SCORED',
        lastScoredAt: new Date()
      }
    });
  }

  /**
   * Score all leads in a campaign
   */
  static async scoreCampaignLeads(campaignId: string): Promise<{
    totalLeads: number;
    scoredLeads: number;
    qualifiedLeads: number;
  }> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { scoringModel: true }
    });

    if (!campaign || !campaign.scoringModel) {
      throw new Error('Campaign not found or no scoring model assigned');
    }

    const leads = await prisma.lead.findMany({
      where: { 
        campaignId,
        status: { in: ['RAW', 'SCORED'] } // Only score raw or previously scored leads
      }
    });

    let scoredLeads = 0;
    let qualifiedLeads = 0;

    for (const lead of leads) {
      try {
        const scoringResult = await this.scoreLead(lead.id, campaign.scoringModel!.id);
        await this.saveScoringResult(lead.id, scoringResult);
        
        scoredLeads++;
        if (scoringResult.totalScore >= 70) {
          qualifiedLeads++;
        }
      } catch (error) {
        console.error(`Failed to score lead ${lead.id}:`, error);
      }
    }

    return {
      totalLeads: leads.length,
      scoredLeads,
      qualifiedLeads
    };
  }
} 