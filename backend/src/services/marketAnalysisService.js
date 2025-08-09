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
exports.marketAnalysisService = exports.MarketAnalysisService = void 0;
const client_1 = require("@prisma/client");
const auditLogService_1 = require("./auditLogService");
const aiScoringService_1 = require("./aiScoringService");
const prisma = new client_1.PrismaClient();
class MarketAnalysisService {
    constructor() {
        this.aiScoringService = new aiScoringService_1.AIScoringService();
    }
    /**
     * Analyze market size based on criteria
     */
    analyzeMarketSize(criteria, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get market data from multiple sources
                const marketData = yield this.getMarketData(criteria);
                // Filter and rank industries based on criteria
                const filteredIndustries = this.filterIndustries(marketData, criteria);
                // Get AI analysis for recommendations
                const aiAnalysis = yield this.getAIMarketAnalysis(filteredIndustries, criteria);
                // Save analysis to database
                const analysis = yield prisma.marketAnalysis.create({
                    data: {
                        name: `Market Analysis - ${criteria.geography || 'US'} - ${criteria.minLocations}+ locations`,
                        criteria: JSON.stringify(criteria),
                        results: JSON.stringify({
                            industries: filteredIndustries,
                            aiRecommendations: aiAnalysis.recommendations,
                            metadata: {
                                totalIndustriesAnalyzed: marketData.length,
                                criteriaMatched: filteredIndustries.length,
                                analysisDate: new Date(),
                                dataSourcesUsed: ['naics', 'census', 'sba', 'ai_analysis']
                            }
                        }),
                        status: 'completed',
                        createdById: userId
                    }
                });
                // Log the analysis
                yield auditLogService_1.AuditLogService.logActivity({
                    action: 'CREATE',
                    entityType: 'MARKET_ANALYSIS',
                    entityId: analysis.id,
                    description: `Created market analysis: ${criteria.minLocations}+ location industries in ${criteria.geography || 'US'}`,
                    userId
                });
                return {
                    analysisId: analysis.id,
                    industries: filteredIndustries,
                    totalMarkets: filteredIndustries.length,
                    recommendedIndustries: aiAnalysis.recommendations.slice(0, 10) // Top 10
                };
            }
            catch (error) {
                console.error('Error analyzing market size:', error);
                throw new Error('Failed to analyze market size');
            }
        });
    }
    /**
     * Get sub-industries for a specific industry
     */
    getSubIndustries(industry, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get sub-industry data
                const subIndustries = yield this.getSubIndustryData(industry);
                // Enhance with AI analysis
                const enhancedSubIndustries = yield this.enhanceSubIndustriesWithAI(industry, subIndustries);
                // Log the analysis
                yield auditLogService_1.AuditLogService.logActivity({
                    action: 'ANALYZE',
                    entityType: 'INDUSTRY',
                    entityId: industry,
                    description: `Analyzed sub-industries for ${industry}`,
                    userId
                });
                return enhancedSubIndustries;
            }
            catch (error) {
                console.error('Error getting sub-industries:', error);
                throw new Error('Failed to get sub-industries');
            }
        });
    }
    /**
     * Discover products for a sub-industry
     */
    discoverProducts(industry, subIndustry, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get product data from AI analysis
                const productData = yield this.getProductDataFromAI(industry, subIndustry);
                // Get market insights
                const marketInsights = yield this.getMarketInsights(industry, subIndustry);
                // Log the discovery
                yield auditLogService_1.AuditLogService.logActivity({
                    action: 'DISCOVER',
                    entityType: 'PRODUCT',
                    entityId: `${industry}-${subIndustry}`,
                    description: `Discovered products for ${subIndustry} in ${industry}`,
                    userId
                });
                return {
                    suggestedProducts: productData,
                    marketInsights
                };
            }
            catch (error) {
                console.error('Error discovering products:', error);
                throw new Error('Failed to discover products');
            }
        });
    }
    /**
     * Generate buyer profile for a product
     */
    generateBuyerProfile(product, industry, subIndustry, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Use AI to generate comprehensive buyer profile
                const profile = yield this.generateAIBuyerProfile(product, industry, subIndustry);
                // Validate and enhance profile
                const enhancedProfile = yield this.enhanceBuyerProfile(profile, industry);
                // Log the generation
                yield auditLogService_1.AuditLogService.logActivity({
                    action: 'GENERATE',
                    entityType: 'BUYER_PROFILE',
                    entityId: `${product}-${industry}`,
                    description: `Generated buyer profile for ${product} in ${industry}`,
                    userId
                });
                return enhancedProfile;
            }
            catch (error) {
                console.error('Error generating buyer profile:', error);
                throw new Error('Failed to generate buyer profile');
            }
        });
    }
    /**
     * Create search strategy for discovery
     */
    createSearchStrategy(buyerProfile, product, industry) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Generate AI-driven search strategy
                const strategy = yield this.generateAISearchStrategy(buyerProfile, product, industry);
                // Optimize strategy based on historical performance
                const optimizedStrategy = yield this.optimizeSearchStrategy(strategy, industry);
                return optimizedStrategy;
            }
            catch (error) {
                console.error('Error creating search strategy:', error);
                throw new Error('Failed to create search strategy');
            }
        });
    }
    // Private helper methods
    /**
     * Get market data from various sources
     */
    getMarketData(criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            // This would integrate with external APIs in production
            // For now, return mock data that matches the expected structure
            const mockIndustries = [
                {
                    name: 'Plumbing, Heating, and Air-Conditioning Contractors',
                    naicsCode: '238220',
                    locationCount: 412000,
                    description: 'Contractors specializing in plumbing, heating, and air conditioning systems',
                    avgRevenue: 850000,
                    growthRate: 3.2,
                    competitionLevel: 'medium',
                    marketSize: 124000000000, // $124B
                    subIndustries: [
                        {
                            name: 'Residential Plumbing',
                            naicsCode: '238220-01',
                            locationCount: 281000,
                            description: 'Plumbing services for residential properties',
                            parentIndustry: 'Plumbing, Heating, and Air-Conditioning Contractors',
                            avgRevenue: 650000,
                            marketShare: 68.2
                        },
                        {
                            name: 'Commercial Plumbing',
                            naicsCode: '238220-02',
                            locationCount: 89000,
                            description: 'Plumbing services for commercial and industrial properties',
                            parentIndustry: 'Plumbing, Heating, and Air-Conditioning Contractors',
                            avgRevenue: 1200000,
                            marketShare: 21.6
                        },
                        {
                            name: 'Industrial Plumbing',
                            naicsCode: '238220-03',
                            locationCount: 42000,
                            description: 'Specialized plumbing for industrial facilities',
                            parentIndustry: 'Plumbing, Heating, and Air-Conditioning Contractors',
                            avgRevenue: 2100000,
                            marketShare: 10.2
                        }
                    ],
                    keyCharacteristics: [
                        'Local service businesses',
                        'License required',
                        'Emergency services',
                        'Seasonal demand variations'
                    ]
                },
                {
                    name: 'Full-Service Restaurants',
                    naicsCode: '722511',
                    locationCount: 653000,
                    description: 'Restaurants providing food services to patrons who order and are served while seated',
                    avgRevenue: 1200000,
                    growthRate: 2.8,
                    competitionLevel: 'high',
                    marketSize: 298000000000, // $298B
                    keyCharacteristics: [
                        'High competition',
                        'Labor intensive',
                        'Location dependent',
                        'Trend sensitive'
                    ]
                },
                {
                    name: 'Automotive Repair and Maintenance',
                    naicsCode: '811111',
                    locationCount: 347000,
                    description: 'General automotive repair and maintenance services',
                    avgRevenue: 920000,
                    growthRate: 1.5,
                    competitionLevel: 'medium',
                    marketSize: 89000000000, // $89B
                    keyCharacteristics: [
                        'Equipment intensive',
                        'Certification requirements',
                        'Technology evolution',
                        'Franchise opportunities'
                    ]
                }
            ];
            // Filter based on criteria
            return mockIndustries.filter(industry => {
                if (criteria.minLocations && industry.locationCount < criteria.minLocations)
                    return false;
                if (criteria.maxLocations && industry.locationCount > criteria.maxLocations)
                    return false;
                return true;
            });
        });
    }
    /**
     * Filter and rank industries based on criteria
     */
    filterIndustries(industries, criteria) {
        var _a;
        let filtered = [...industries];
        // Apply location count filter
        if (criteria.minLocations) {
            filtered = filtered.filter(industry => industry.locationCount >= criteria.minLocations);
        }
        // Apply growth rate filter
        if ((_a = criteria.filters) === null || _a === void 0 ? void 0 : _a.growthRate) {
            filtered = filtered.filter(industry => {
                var _a, _b, _c, _d;
                const growth = industry.growthRate || 0;
                if (((_b = (_a = criteria.filters) === null || _a === void 0 ? void 0 : _a.growthRate) === null || _b === void 0 ? void 0 : _b.min) && growth < criteria.filters.growthRate.min)
                    return false;
                if (((_d = (_c = criteria.filters) === null || _c === void 0 ? void 0 : _c.growthRate) === null || _d === void 0 ? void 0 : _d.max) && growth > criteria.filters.growthRate.max)
                    return false;
                return true;
            });
        }
        // Sort by location count (descending)
        filtered.sort((a, b) => b.locationCount - a.locationCount);
        return filtered;
    }
    /**
     * Get AI analysis for market recommendations
     */
    getAIMarketAnalysis(industries, criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            // This would use Claude AI in production
            // For now, return logical recommendations based on the data
            const recommendations = industries
                .filter(industry => industry.growthRate && industry.growthRate > 2)
                .slice(0, 10);
            const insights = [
                'Plumbing industry shows strong growth potential with increasing construction activity',
                'Service-based industries demonstrate resilience during economic fluctuations',
                'Industries with licensing requirements often have reduced competition barriers'
            ];
            const opportunities = [
                'Digital transformation opportunities in traditional industries',
                'B2B equipment and software solutions have high demand',
                'Professional services targeting SMBs show consistent growth'
            ];
            return { recommendations, insights, opportunities };
        });
    }
    /**
     * Get detailed sub-industry data
     */
    getSubIndustryData(industry) {
        return __awaiter(this, void 0, void 0, function* () {
            // This would query external APIs or databases
            // Return the sub-industries from the mock data for now
            const marketData = yield this.getMarketData({});
            const industryData = marketData.find(ind => ind.name.toLowerCase().includes(industry.toLowerCase()) ||
                industry.toLowerCase().includes(ind.name.toLowerCase().split(' ')[0]));
            return (industryData === null || industryData === void 0 ? void 0 : industryData.subIndustries) || [];
        });
    }
    /**
     * Enhance sub-industries with AI analysis
     */
    enhanceSubIndustriesWithAI(industry, subIndustries) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Use Claude AI to analyze and enhance sub-industry data
                const aiAnalysis = yield this.aiScoringService.analyzeIndustryLandscape(industry);
                // Merge AI insights with existing sub-industry data
                return subIndustries.map(sub => {
                    const aiSubIndustry = aiAnalysis.subIndustries.find(ai => ai.name.toLowerCase().includes(sub.name.toLowerCase()) ||
                        sub.name.toLowerCase().includes(ai.name.toLowerCase()));
                    return Object.assign(Object.assign({}, sub), { keyPlayers: aiSubIndustry ? ['Based on AI analysis'] : ['Company A', 'Company B', 'Company C'], buyingPatterns: ['Annual budget cycles', 'Emergency purchases', 'Seasonal demand'], description: (aiSubIndustry === null || aiSubIndustry === void 0 ? void 0 : aiSubIndustry.description) || sub.description });
                });
            }
            catch (error) {
                console.error('Error enhancing sub-industries with AI:', error);
                // Fallback to original data with basic enhancements
                return subIndustries.map(sub => (Object.assign(Object.assign({}, sub), { keyPlayers: ['Company A', 'Company B', 'Company C'], buyingPatterns: ['Annual budget cycles', 'Emergency purchases', 'Seasonal demand'] })));
            }
        });
    }
    /**
     * Get product data using AI analysis
     */
    getProductDataFromAI(industry, subIndustry) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Use Claude AI to discover products for the sub-industry
                const aiProductData = yield this.aiScoringService.discoverIndustryProducts(industry, subIndustry);
                // Convert AI response to our ProductData format
                return aiProductData.products.map(product => ({
                    name: product.name,
                    category: product.category,
                    description: product.description,
                    targetMarket: product.targetMarket,
                    avgPrice: product.priceRange,
                    marketSize: product.marketSize,
                    keyVendors: product.keyVendors,
                    buyingFrequency: product.buyingPattern,
                    decisionMakers: ['Owner', 'Operations Manager'], // Default values
                    painPoints: ['Cost concerns', 'Implementation challenges', 'Training requirements'] // Default values
                }));
            }
            catch (error) {
                console.error('Error getting AI product data:', error);
                // Fallback to mock data for commercial plumbing as example
                if (subIndustry.toLowerCase().includes('commercial plumbing')) {
                    return [
                        {
                            name: 'High-pressure water jetting systems',
                            category: 'Drain Cleaning Equipment',
                            description: 'Professional-grade water jetting equipment for clearing commercial drains and sewers',
                            targetMarket: 'Commercial plumbing contractors',
                            avgPrice: { min: 15000, max: 50000 },
                            marketSize: 2400000000,
                            keyVendors: ['Spartan Tool', 'General Pipe Cleaners', 'Electric Eel'],
                            buyingFrequency: 'every 5-7 years',
                            decisionMakers: ['Owner', 'Operations Manager', 'Lead Technician'],
                            painPoints: ['Equipment reliability', 'Training requirements', 'Maintenance costs']
                        },
                        {
                            name: 'Pipe inspection cameras',
                            category: 'Diagnostic Equipment',
                            description: 'Video inspection systems for diagnosing pipe problems',
                            targetMarket: 'Commercial plumbing contractors',
                            avgPrice: { min: 5000, max: 25000 },
                            marketSize: 1800000000,
                            keyVendors: ['RIDGID', 'Envirosight', 'Pearpoint'],
                            buyingFrequency: 'every 3-5 years',
                            decisionMakers: ['Owner', 'Operations Manager'],
                            painPoints: ['Image quality', 'Equipment durability', 'Software integration']
                        }
                    ];
                }
                return [];
            }
        });
    }
    /**
     * Get market insights for industry/sub-industry
     */
    getMarketInsights(industry, subIndustry) {
        return __awaiter(this, void 0, void 0, function* () {
            // This would use AI and market research APIs
            return {
                marketSize: 2400000000, // $2.4B
                growthRate: 4.2,
                keyTrends: [
                    'Increasing adoption of video inspection technology',
                    'Growing demand for preventive maintenance',
                    'Shift towards eco-friendly cleaning solutions'
                ],
                opportunityAreas: [
                    'Integration with property management software',
                    'Remote monitoring and diagnostics',
                    'Training and certification programs'
                ]
            };
        });
    }
    /**
     * Generate comprehensive buyer profile using AI
     */
    generateAIBuyerProfile(product, industry, subIndustry) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
            try {
                // Use Claude AI to generate detailed buyer profile
                const aiBuyerProfile = yield this.aiScoringService.generateBuyerProfile(product, industry, subIndustry);
                // Convert AI response to our BuyerProfile format
                return {
                    demographics: {
                        companySize: ((_a = aiBuyerProfile.demographics) === null || _a === void 0 ? void 0 : _a.companySize) || { min: 10, max: 100 },
                        annualRevenue: ((_b = aiBuyerProfile.demographics) === null || _b === void 0 ? void 0 : _b.annualRevenue) || { min: 1000000, max: 10000000 },
                        employeeCount: ((_c = aiBuyerProfile.demographics) === null || _c === void 0 ? void 0 : _c.companySize) || { min: 5, max: 50 },
                        geography: ((_d = aiBuyerProfile.demographics) === null || _d === void 0 ? void 0 : _d.geography) || ['United States']
                    },
                    firmographics: {
                        businessModel: ((_e = aiBuyerProfile.firmographics) === null || _e === void 0 ? void 0 : _e.businessModel) || ['B2B service provider'],
                        primaryServices: ((_f = aiBuyerProfile.firmographics) === null || _f === void 0 ? void 0 : _f.primaryServices) || ['Professional services'],
                        customerBase: ((_g = aiBuyerProfile.firmographics) === null || _g === void 0 ? void 0 : _g.customerBase) || ['Commercial clients'],
                        operationalScale: ((_h = aiBuyerProfile.firmographics) === null || _h === void 0 ? void 0 : _h.operationalScale) || 'Regional'
                    },
                    psychographics: {
                        painPoints: ((_j = aiBuyerProfile.psychographics) === null || _j === void 0 ? void 0 : _j.painPoints) || ['Cost management', 'Efficiency challenges'],
                        motivations: ((_k = aiBuyerProfile.psychographics) === null || _k === void 0 ? void 0 : _k.motivations) || ['Improve operations', 'Reduce costs'],
                        decisionCriteria: ((_l = aiBuyerProfile.decisionProcess) === null || _l === void 0 ? void 0 : _l.criteria) || ['ROI', 'Reliability'],
                        buyingProcess: 'Research-heavy with multiple stakeholder involvement',
                        budgetCycle: 'Annual with emergency provisions'
                    },
                    behavioral: {
                        digitalAdoption: ((_m = aiBuyerProfile.technographics) === null || _m === void 0 ? void 0 : _m.digitalAdoption) || 'mainstream',
                        informationSources: ((_o = aiBuyerProfile.behavioral) === null || _o === void 0 ? void 0 : _o.informationSources) || ['Industry publications', 'Vendor websites'],
                        buyingTimeline: ((_p = aiBuyerProfile.decisionProcess) === null || _p === void 0 ? void 0 : _p.timeline) || '3-6 months',
                        decisionMakers: ((_q = aiBuyerProfile.decisionProcess) === null || _q === void 0 ? void 0 : _q.stakeholders) || ['Owner', 'Manager']
                    },
                    technographics: {
                        currentTech: ((_r = aiBuyerProfile.technographics) === null || _r === void 0 ? void 0 : _r.currentTech) || ['Basic tools', 'Traditional systems'],
                        techStack: ((_s = aiBuyerProfile.technographics) === null || _s === void 0 ? void 0 : _s.currentTech) || ['Basic software'],
                        adoptionReadiness: 'Open to proven technology with clear ROI',
                        integrationRequirements: ((_t = aiBuyerProfile.technographics) === null || _t === void 0 ? void 0 : _t.integrationNeeds) || ['Easy integration', 'Training support']
                    }
                };
            }
            catch (error) {
                console.error('Error generating AI buyer profile:', error);
                // Fallback to mock profile for commercial plumbing example
                return {
                    demographics: {
                        companySize: { min: 10, max: 100 },
                        annualRevenue: { min: 1000000, max: 10000000 },
                        employeeCount: { min: 5, max: 50 },
                        geography: ['United States', 'Urban and suburban areas']
                    },
                    firmographics: {
                        businessModel: ['B2B service provider', 'Contract-based'],
                        primaryServices: ['Commercial plumbing', 'Emergency repairs', 'Maintenance contracts'],
                        customerBase: ['Commercial properties', 'Industrial facilities', 'Municipal contracts'],
                        operationalScale: 'Regional to metropolitan'
                    },
                    psychographics: {
                        painPoints: [
                            'Equipment downtime affecting service delivery',
                            'High equipment maintenance costs',
                            'Need for reliable diagnostic tools',
                            'Training staff on new technology'
                        ],
                        motivations: [
                            'Improve service efficiency',
                            'Reduce operational costs',
                            'Enhance competitive advantage',
                            'Expand service capabilities'
                        ],
                        decisionCriteria: [
                            'Return on investment',
                            'Equipment reliability',
                            'Vendor support quality',
                            'Training and documentation'
                        ],
                        buyingProcess: 'Research-heavy with multiple stakeholder involvement',
                        budgetCycle: 'Annual with emergency provisions'
                    },
                    behavioral: {
                        digitalAdoption: 'mainstream',
                        informationSources: [
                            'Industry trade publications',
                            'Vendor websites and demos',
                            'Peer recommendations',
                            'Trade shows and conferences'
                        ],
                        buyingTimeline: '3-6 months for planned purchases',
                        decisionMakers: [
                            'Business owner (final approval)',
                            'Operations manager (evaluation)',
                            'Lead technicians (technical input)'
                        ]
                    },
                    technographics: {
                        currentTech: [
                            'Basic drain cleaning equipment',
                            'Hand tools and traditional methods',
                            'Some digital documentation'
                        ],
                        techStack: [
                            'Scheduling software',
                            'Invoicing systems',
                            'Basic diagnostic tools'
                        ],
                        adoptionReadiness: 'Open to proven technology with clear ROI',
                        integrationRequirements: [
                            'Easy integration with existing workflows',
                            'Minimal IT infrastructure changes',
                            'Comprehensive training support'
                        ]
                    }
                };
            }
        });
    }
    /**
     * Enhance buyer profile with additional insights
     */
    enhanceBuyerProfile(profile, industry) {
        return __awaiter(this, void 0, void 0, function* () {
            // This would use AI to add industry-specific enhancements
            return profile; // Return as-is for now
        });
    }
    /**
     * Generate AI-driven search strategy
     */
    generateAISearchStrategy(buyerProfile, product, industry) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
            try {
                // Use Claude AI to generate optimal search strategy
                const aiSearchStrategy = yield this.aiScoringService.generateSearchStrategy(buyerProfile, product, industry);
                // Convert AI response to our SearchStrategy format
                return {
                    keywords: {
                        primary: ((_a = aiSearchStrategy.keywords) === null || _a === void 0 ? void 0 : _a.primary) || [],
                        secondary: ((_b = aiSearchStrategy.keywords) === null || _b === void 0 ? void 0 : _b.secondary) || [],
                        negative: ((_c = aiSearchStrategy.keywords) === null || _c === void 0 ? void 0 : _c.negative) || [],
                        longTail: ((_d = aiSearchStrategy.keywords) === null || _d === void 0 ? void 0 : _d.longTail) || []
                    },
                    targeting: {
                        geoTargeting: ((_e = aiSearchStrategy.targeting) === null || _e === void 0 ? void 0 : _e.geoTargeting) || ['United States'],
                        industryTargeting: ((_f = aiSearchStrategy.targeting) === null || _f === void 0 ? void 0 : _f.industryFilters) || [],
                        sizeTargeting: ((_g = aiSearchStrategy.targeting) === null || _g === void 0 ? void 0 : _g.sizeFilters) || { min: 10, max: 100 },
                        excludeTerms: ((_h = aiSearchStrategy.targeting) === null || _h === void 0 ? void 0 : _h.excludeTerms) || []
                    },
                    sources: {
                        searchEngines: ((_j = aiSearchStrategy.sources) === null || _j === void 0 ? void 0 : _j.searchEngines) || ['google'],
                        directories: ((_k = aiSearchStrategy.sources) === null || _k === void 0 ? void 0 : _k.directories) || [],
                        social: ((_l = aiSearchStrategy.sources) === null || _l === void 0 ? void 0 : _l.socialPlatforms) || [],
                        trade: ((_m = aiSearchStrategy.sources) === null || _m === void 0 ? void 0 : _m.tradeSources) || []
                    },
                    filters: {
                        domainAge: { min: 1 },
                        contentQuality: { min: 70 },
                        contactInfo: true,
                        businessIndicators: ((_o = aiSearchStrategy.contentFilters) === null || _o === void 0 ? void 0 : _o.businessSignals) || [
                            'professional services',
                            'business registration',
                            'service areas listed'
                        ]
                    }
                };
            }
            catch (error) {
                console.error('Error generating AI search strategy:', error);
                // Fallback to default search strategy
                return {
                    keywords: {
                        primary: [
                            'commercial plumbing services',
                            'commercial plumber',
                            'industrial plumbing contractor',
                            'commercial drain cleaning'
                        ],
                        secondary: [
                            'sewer line repair',
                            'pipe inspection services',
                            'commercial water heater',
                            'backflow testing'
                        ],
                        negative: [
                            'residential',
                            'home',
                            'DIY',
                            'homeowner'
                        ],
                        longTail: [
                            'commercial plumbing contractor near me',
                            'industrial pipe cleaning services',
                            'commercial sewer line maintenance'
                        ]
                    },
                    targeting: {
                        geoTargeting: ['United States', 'Major metropolitan areas'],
                        industryTargeting: ['Commercial plumbing', 'Industrial services'],
                        sizeTargeting: { min: 10, max: 100 },
                        excludeTerms: ['residential only', 'homeowner', 'DIY']
                    },
                    sources: {
                        searchEngines: ['google', 'bing'],
                        directories: ['yellowpages', 'angieslist', 'bbb'],
                        social: ['linkedin'],
                        trade: ['plumbing trade associations', 'contractor directories']
                    },
                    filters: {
                        domainAge: { min: 1 },
                        contentQuality: { min: 70 },
                        contactInfo: true,
                        businessIndicators: [
                            'commercial services',
                            'licensed contractor',
                            'business registration',
                            'service areas listed'
                        ]
                    }
                };
            }
        });
    }
    /**
     * Optimize search strategy based on historical performance
     */
    optimizeSearchStrategy(strategy, industry) {
        return __awaiter(this, void 0, void 0, function* () {
            // This would analyze historical performance data to optimize
            return strategy; // Return as-is for now
        });
    }
    /**
     * Get market analysis by ID
     */
    getMarketAnalysisById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const analysis = yield prisma.marketAnalysis.findUnique({
                where: { id },
                include: {
                    createdBy: {
                        select: { id: true, fullName: true, email: true }
                    },
                    discoveryModels: {
                        select: { id: true, name: true, product: true, isActive: true }
                    }
                }
            });
            if (!analysis) {
                throw new Error('Market analysis not found');
            }
            return Object.assign(Object.assign({}, analysis), { criteria: JSON.parse(analysis.criteria), results: JSON.parse(analysis.results) });
        });
    }
    /**
     * Get all market analyses for a user
     */
    getUserMarketAnalyses(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const analyses = yield prisma.marketAnalysis.findMany({
                where: { createdById: userId },
                orderBy: { createdAt: 'desc' },
                include: {
                    discoveryModels: {
                        select: { id: true, name: true, product: true, isActive: true }
                    }
                }
            });
            return analyses.map(analysis => (Object.assign(Object.assign({}, analysis), { criteria: JSON.parse(analysis.criteria), results: JSON.parse(analysis.results) })));
        });
    }
}
exports.MarketAnalysisService = MarketAnalysisService;
exports.marketAnalysisService = new MarketAnalysisService();
