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
exports.ScoringService = void 0;
const index_1 = require("../index");
class ScoringService {
    /**
     * Score a lead using the specified scoring model
     */
    static scoreLead(leadId, scoringModelId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the lead and scoring model
            const lead = yield index_1.prisma.lead.findUnique({
                where: { id: leadId },
                include: { campaign: true }
            });
            if (!lead) {
                throw new Error('Lead not found');
            }
            const scoringModel = yield index_1.prisma.scoringModel.findUnique({
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
                const criterionScore = yield this.scoreCriterion(lead, criterion);
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
        });
    }
    /**
     * Score a single criterion against a lead
     */
    static scoreCriterion(lead, criterion) {
        return __awaiter(this, void 0, void 0, function* () {
            const searchTerms = JSON.parse(criterion.searchTerms);
            const matchedContent = [];
            let score = 0;
            let confidence = 0;
            // Get enrichment data if available
            const enrichment = yield index_1.prisma.leadEnrichment.findUnique({
                where: { leadId: lead.id }
            });
            // Combine all text content for analysis - now including enhanced enrichment data
            const contentToAnalyze = [
                lead.companyName,
                lead.domain,
                lead.industry,
                lead.url,
                // Enhanced enrichment data
                enrichment === null || enrichment === void 0 ? void 0 : enrichment.companyName,
                enrichment === null || enrichment === void 0 ? void 0 : enrichment.pageTitle,
                enrichment === null || enrichment === void 0 ? void 0 : enrichment.pageDescription,
                enrichment === null || enrichment === void 0 ? void 0 : enrichment.scrapedContent, // Full scraped content
                (enrichment === null || enrichment === void 0 ? void 0 : enrichment.pageKeywords) ? JSON.parse(enrichment.pageKeywords).join(' ') : '',
                (enrichment === null || enrichment === void 0 ? void 0 : enrichment.services) ? JSON.parse(enrichment.services).join(' ') : '',
                (enrichment === null || enrichment === void 0 ? void 0 : enrichment.certifications) ? JSON.parse(enrichment.certifications).join(' ') : '',
                enrichment === null || enrichment === void 0 ? void 0 : enrichment.contactEmail,
                enrichment === null || enrichment === void 0 ? void 0 : enrichment.contactPhone,
                enrichment === null || enrichment === void 0 ? void 0 : enrichment.contactAddress,
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
                    score = this.scoreKeywordMatch(contentToAnalyze, searchTerms, matchedContent);
                    break;
                default:
                    score = this.scoreKeywordMatch(contentToAnalyze, searchTerms, matchedContent);
            }
            // Calculate confidence based on content richness
            const contentLength = contentToAnalyze.length;
            const uniqueTerms = new Set(searchTerms).size;
            const matchRatio = matchedContent.length / uniqueTerms;
            confidence = Math.min(100, Math.max(0, (contentLength / 1000) * 30 + // Content richness
                (matchRatio * 40) + // Term matching
                (enrichment ? 30 : 0) // Enrichment availability
            ));
            return {
                criterionId: criterion.id,
                score,
                matchedContent,
                confidence
            };
        });
    }
    /**
     * Score keyword matches in content
     */
    static scoreKeywordMatch(content, searchTerms, matchedContent) {
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
    static scoreDomainMatch(domain, searchTerms, matchedContent) {
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
    static scoreContentMatch(content, searchTerms, matchedContent) {
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
    static saveScoringResult(leadId, scoringResult) {
        return __awaiter(this, void 0, void 0, function* () {
            // Delete existing scoring result if any
            yield index_1.prisma.scoringResult.deleteMany({
                where: { leadId }
            });
            // Create new scoring result
            const result = yield index_1.prisma.scoringResult.create({
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
            yield index_1.prisma.lead.update({
                where: { id: leadId },
                data: {
                    score: scoringResult.totalScore,
                    status: scoringResult.totalScore >= 70 ? 'QUALIFIED' : 'SCORED',
                    lastScoredAt: new Date()
                }
            });
        });
    }
    /**
     * Score all leads in a campaign
     */
    static scoreCampaignLeads(campaignId) {
        return __awaiter(this, void 0, void 0, function* () {
            const campaign = yield index_1.prisma.campaign.findUnique({
                where: { id: campaignId },
                include: { scoringModel: true }
            });
            if (!campaign || !campaign.scoringModel) {
                throw new Error('Campaign not found or no scoring model assigned');
            }
            const leads = yield index_1.prisma.lead.findMany({
                where: {
                    campaignId,
                    status: { in: ['RAW', 'SCORED'] } // Only score raw or previously scored leads
                }
            });
            let scoredLeads = 0;
            let qualifiedLeads = 0;
            for (const lead of leads) {
                try {
                    const scoringResult = yield this.scoreLead(lead.id, campaign.scoringModel.id);
                    yield this.saveScoringResult(lead.id, scoringResult);
                    scoredLeads++;
                    if (scoringResult.totalScore >= 70) {
                        qualifiedLeads++;
                    }
                }
                catch (error) {
                    console.error(`Failed to score lead ${lead.id}:`, error);
                }
            }
            return {
                totalLeads: leads.length,
                scoredLeads,
                qualifiedLeads
            };
        });
    }
}
exports.ScoringService = ScoringService;
