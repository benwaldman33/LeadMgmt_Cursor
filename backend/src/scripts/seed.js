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
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🌱 Starting database seeding...');
        // Clear existing data
        console.log('🧹 Clearing existing data...');
        yield prisma.auditLog.deleteMany();
        yield prisma.workflowExecution.deleteMany();
        yield prisma.workflowStep.deleteMany();
        yield prisma.workflow.deleteMany();
        yield prisma.businessRule.deleteMany();
        yield prisma.scoringResult.deleteMany();
        yield prisma.criterionScore.deleteMany();
        yield prisma.scoringCriterion.deleteMany();
        yield prisma.scoringModel.deleteMany();
        yield prisma.leadEnrichment.deleteMany();
        yield prisma.contact.deleteMany();
        yield prisma.lead.deleteMany();
        yield prisma.campaign.deleteMany();
        yield prisma.user.deleteMany();
        yield prisma.team.deleteMany();
        yield prisma.aIModel.deleteMany();
        console.log('✅ Data cleared');
        // Create teams
        console.log('🏢 Creating teams...');
        const dentalTeam = yield prisma.team.create({
            data: {
                name: 'Dental Solutions Team',
                industry: 'dental'
            }
        });
        const healthcareTeam = yield prisma.team.create({
            data: {
                name: 'Healthcare Innovations',
                industry: 'healthcare'
            }
        });
        const techTeam = yield prisma.team.create({
            data: {
                name: 'Tech Startups',
                industry: 'technology'
            }
        });
        console.log('✅ Teams created');
        // Create users
        console.log('👥 Creating users...');
        const passwordHash = yield bcryptjs_1.default.hash('password123', 12);
        const adminUser = yield prisma.user.create({
            data: {
                email: 'admin@bbds.com',
                fullName: 'Admin User',
                passwordHash,
                role: 'SUPER_ADMIN',
                status: 'ACTIVE'
            }
        });
        const analystUser = yield prisma.user.create({
            data: {
                email: 'analyst@bbds.com',
                fullName: 'Sarah Johnson',
                passwordHash,
                role: 'ANALYST',
                status: 'ACTIVE',
                teamId: dentalTeam.id
            }
        });
        const viewerUser = yield prisma.user.create({
            data: {
                email: 'viewer@bbds.com',
                fullName: 'Mike Chen',
                passwordHash,
                role: 'VIEWER',
                status: 'ACTIVE',
                teamId: healthcareTeam.id
            }
        });
        const dentalAnalyst = yield prisma.user.create({
            data: {
                email: 'dental@bbds.com',
                fullName: 'Dr. Emily Rodriguez',
                passwordHash,
                role: 'ANALYST',
                status: 'ACTIVE',
                teamId: dentalTeam.id
            }
        });
        const techAnalyst = yield prisma.user.create({
            data: {
                email: 'tech@bbds.com',
                fullName: 'Alex Thompson',
                passwordHash,
                role: 'ANALYST',
                status: 'ACTIVE',
                teamId: techTeam.id
            }
        });
        console.log('✅ Users created');
        // Create scoring models
        console.log('📊 Creating scoring models...');
        const dentalScoringModel = yield prisma.scoringModel.create({
            data: {
                name: 'Dental Practice Scoring v1.0',
                industry: 'dental',
                isActive: true,
                createdById: dentalAnalyst.id
            }
        });
        const healthcareScoringModel = yield prisma.scoringModel.create({
            data: {
                name: 'Healthcare Provider Scoring v1.0',
                industry: 'healthcare',
                isActive: true,
                createdById: analystUser.id
            }
        });
        const techScoringModel = yield prisma.scoringModel.create({
            data: {
                name: 'Tech Startup Scoring v1.0',
                industry: 'technology',
                isActive: true,
                createdById: techAnalyst.id
            }
        });
        console.log('✅ Scoring models created');
        // Create scoring criteria
        console.log('🎯 Creating scoring criteria...');
        const dentalCriteria = [
            {
                name: 'Dental Technology',
                description: 'Advanced dental technology and equipment',
                searchTerms: JSON.stringify(['dental technology', 'digital x-ray', 'CAD/CAM', '3D printing', 'laser dentistry']),
                weight: 20,
                type: 'KEYWORD'
            },
            {
                name: 'Cone Beam Technology',
                description: 'Cone beam computed tomography and advanced imaging',
                searchTerms: JSON.stringify(['cone beam computed tomography', 'CBCT', '3D imaging', 'dental imaging']),
                weight: 15,
                type: 'KEYWORD'
            },
            {
                name: 'Practice Size',
                description: 'Number of dentists and staff',
                searchTerms: JSON.stringify(['multiple dentists', 'dental group', 'large practice', 'dental clinic']),
                weight: 20,
                type: 'KEYWORD'
            },
            {
                name: 'Specializations',
                description: 'Specialized dental services',
                searchTerms: JSON.stringify(['orthodontics', 'endodontics', 'periodontics', 'cosmetic dentistry', 'implant dentistry']),
                weight: 20,
                type: 'KEYWORD'
            },
            {
                name: 'Modern Website',
                description: 'Professional and modern website presence',
                searchTerms: JSON.stringify(['modern website', 'online booking', 'patient portal', 'digital forms']),
                weight: 15,
                type: 'KEYWORD'
            },
            {
                name: 'Patient Reviews',
                description: 'Positive patient reviews and testimonials',
                searchTerms: JSON.stringify(['patient reviews', 'testimonials', '5-star', 'excellent care']),
                weight: 10,
                type: 'KEYWORD'
            }
        ];
        for (const criterion of dentalCriteria) {
            yield prisma.scoringCriterion.create({
                data: Object.assign(Object.assign({}, criterion), { scoringModelId: dentalScoringModel.id })
            });
        }
        const healthcareCriteria = [
            {
                name: 'Medical Technology',
                description: 'Advanced medical technology and equipment',
                searchTerms: JSON.stringify(['medical technology', 'telemedicine', 'electronic health records', 'digital health']),
                weight: 30,
                type: 'KEYWORD'
            },
            {
                name: 'Practice Size',
                description: 'Number of healthcare providers',
                searchTerms: JSON.stringify(['medical group', 'healthcare network', 'multiple providers', 'medical practice']),
                weight: 25,
                type: 'KEYWORD'
            },
            {
                name: 'Specializations',
                description: 'Medical specializations and services',
                searchTerms: JSON.stringify(['cardiology', 'oncology', 'pediatrics', 'orthopedics', 'neurology']),
                weight: 25,
                type: 'KEYWORD'
            },
            {
                name: 'Patient Care',
                description: 'Quality patient care indicators',
                searchTerms: JSON.stringify(['patient care', 'quality care', 'patient satisfaction', 'healthcare excellence']),
                weight: 20,
                type: 'KEYWORD'
            }
        ];
        for (const criterion of healthcareCriteria) {
            yield prisma.scoringCriterion.create({
                data: Object.assign(Object.assign({}, criterion), { scoringModelId: healthcareScoringModel.id })
            });
        }
        const techCriteria = [
            {
                name: 'Technology Stack',
                description: 'Modern technology stack and tools',
                searchTerms: JSON.stringify(['react', 'node.js', 'python', 'aws', 'docker', 'kubernetes', 'machine learning']),
                weight: 30,
                type: 'KEYWORD'
            },
            {
                name: 'Funding Stage',
                description: 'Company funding and growth stage',
                searchTerms: JSON.stringify(['series a', 'series b', 'funding', 'venture capital', 'startup accelerator']),
                weight: 25,
                type: 'KEYWORD'
            },
            {
                name: 'Team Size',
                description: 'Company size and team composition',
                searchTerms: JSON.stringify(['engineering team', 'development team', 'tech team', 'startup team']),
                weight: 20,
                type: 'KEYWORD'
            },
            {
                name: 'Product Innovation',
                description: 'Innovative product features',
                searchTerms: JSON.stringify(['innovative', 'disruptive', 'cutting-edge', 'next-generation', 'revolutionary']),
                weight: 25,
                type: 'KEYWORD'
            }
        ];
        for (const criterion of techCriteria) {
            yield prisma.scoringCriterion.create({
                data: Object.assign(Object.assign({}, criterion), { scoringModelId: techScoringModel.id })
            });
        }
        console.log('✅ Scoring criteria created');
        // Create campaigns
        console.log('📈 Creating campaigns...');
        const dentalCampaign = yield prisma.campaign.create({
            data: {
                name: 'Dental Practice Expansion 2024',
                industry: 'dental',
                status: 'ACTIVE',
                scoringModelId: dentalScoringModel.id,
                assignedTeamId: dentalTeam.id,
                createdById: dentalAnalyst.id,
                targetLeadCount: 500,
                currentLeadCount: 0,
                startDate: new Date('2024-01-01'),
                targetEndDate: new Date('2024-12-31')
            }
        });
        const healthcareCampaign = yield prisma.campaign.create({
            data: {
                name: 'Healthcare Provider Outreach',
                industry: 'healthcare',
                status: 'ACTIVE',
                scoringModelId: healthcareScoringModel.id,
                assignedTeamId: healthcareTeam.id,
                createdById: analystUser.id,
                targetLeadCount: 300,
                currentLeadCount: 0,
                startDate: new Date('2024-01-01'),
                targetEndDate: new Date('2024-12-31')
            }
        });
        const techCampaign = yield prisma.campaign.create({
            data: {
                name: 'Tech Startup Partnership',
                industry: 'technology',
                status: 'ACTIVE',
                scoringModelId: techScoringModel.id,
                assignedTeamId: techTeam.id,
                createdById: techAnalyst.id,
                targetLeadCount: 200,
                currentLeadCount: 0,
                startDate: new Date('2024-01-01'),
                targetEndDate: new Date('2024-12-31')
            }
        });
        console.log('✅ Campaigns created');
        // Create sample leads
        console.log('🎯 Creating sample leads...');
        const dentalLeads = [
            {
                url: 'https://advanceddentalcare.com',
                companyName: 'Advanced Dental Care',
                domain: 'advanceddentalcare.com',
                industry: 'dental',
                status: 'RAW',
                score: 85.5,
                campaignId: dentalCampaign.id,
                assignedToId: dentalAnalyst.id,
                assignedTeamId: dentalTeam.id
            },
            {
                url: 'https://smilebrightdental.com',
                companyName: 'Smile Bright Dental',
                domain: 'smilebrightdental.com',
                industry: 'dental',
                status: 'SCORED',
                score: 92.3,
                campaignId: dentalCampaign.id,
                assignedToId: dentalAnalyst.id,
                assignedTeamId: dentalTeam.id
            },
            {
                url: 'https://modernorthodontics.com',
                companyName: 'Modern Orthodontics',
                domain: 'modernorthodontics.com',
                industry: 'dental',
                status: 'QUALIFIED',
                score: 78.9,
                campaignId: dentalCampaign.id,
                assignedToId: dentalAnalyst.id,
                assignedTeamId: dentalTeam.id
            }
        ];
        const healthcareLeads = [
            {
                url: 'https://cardiologyassociates.com',
                companyName: 'Cardiology Associates',
                domain: 'cardiologyassociates.com',
                industry: 'healthcare',
                status: 'RAW',
                score: 88.2,
                campaignId: healthcareCampaign.id,
                assignedToId: analystUser.id,
                assignedTeamId: healthcareTeam.id
            },
            {
                url: 'https://pediatriccarecenter.com',
                companyName: 'Pediatric Care Center',
                domain: 'pediatriccarecenter.com',
                industry: 'healthcare',
                status: 'SCORED',
                score: 91.7,
                campaignId: healthcareCampaign.id,
                assignedToId: analystUser.id,
                assignedTeamId: healthcareTeam.id
            }
        ];
        const techLeads = [
            {
                url: 'https://innovativetech.ai',
                companyName: 'Innovative Tech AI',
                domain: 'innovativetech.ai',
                industry: 'technology',
                status: 'RAW',
                score: 87.4,
                campaignId: techCampaign.id,
                assignedToId: techAnalyst.id,
                assignedTeamId: techTeam.id
            },
            {
                url: 'https://startupaccelerator.com',
                companyName: 'Startup Accelerator',
                domain: 'startupaccelerator.com',
                industry: 'technology',
                status: 'QUALIFIED',
                score: 94.1,
                campaignId: techCampaign.id,
                assignedToId: techAnalyst.id,
                assignedTeamId: techTeam.id
            }
        ];
        for (const lead of [...dentalLeads, ...healthcareLeads, ...techLeads]) {
            yield prisma.lead.create({
                data: lead
            });
        }
        console.log('✅ Sample leads created');
        // Create AI models
        console.log('🤖 Creating AI models...');
        const aiModels = [
            {
                id: 'ai-model-1',
                name: 'Dental Lead Scoring Model',
                type: 'regression',
                features: JSON.stringify(['companySize', 'technologyCount', 'domainAge', 'socialPresence']),
                performance: JSON.stringify({
                    accuracy: 0.87,
                    precision: 0.85,
                    recall: 0.82,
                    f1Score: 0.83,
                    trainingDate: new Date(),
                    sampleSize: 1000
                }),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'ai-model-2',
                name: 'Healthcare Lead Scoring Model',
                type: 'classification',
                features: JSON.stringify(['industryScore', 'fundingStage', 'growthRate', 'marketCap']),
                performance: JSON.stringify({
                    accuracy: 0.89,
                    precision: 0.87,
                    recall: 0.85,
                    f1Score: 0.86,
                    trainingDate: new Date(),
                    sampleSize: 800
                }),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'ai-model-3',
                name: 'Tech Startup Scoring Model',
                type: 'ensemble',
                features: JSON.stringify(['employeeCount', 'revenue', 'technologyStack', 'fundingAmount']),
                performance: JSON.stringify({
                    accuracy: 0.91,
                    precision: 0.89,
                    recall: 0.88,
                    f1Score: 0.89,
                    trainingDate: new Date(),
                    sampleSize: 600
                }),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        for (const model of aiModels) {
            yield prisma.aIModel.create({
                data: model
            });
        }
        console.log('✅ AI models created');
        // Create business rules
        console.log('📋 Creating business rules...');
        const businessRules = [
            {
                id: 'rule-1',
                name: 'High Score Auto-Qualify',
                description: 'Automatically qualify leads with score above 90',
                type: 'status_change',
                conditions: JSON.stringify({
                    field: 'score',
                    operator: 'gte',
                    value: 90
                }),
                actions: JSON.stringify({
                    type: 'UPDATE_STATUS',
                    value: 'QUALIFIED'
                }),
                isActive: true,
                createdById: adminUser.id,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'rule-2',
                name: 'Low Score Reject',
                description: 'Reject leads with score below 30',
                type: 'status_change',
                conditions: JSON.stringify({
                    field: 'score',
                    operator: 'lte',
                    value: 30
                }),
                actions: JSON.stringify({
                    type: 'UPDATE_STATUS',
                    value: 'REJECTED'
                }),
                isActive: true,
                createdById: adminUser.id,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'rule-3',
                name: 'Dental Technology Focus',
                description: 'Boost score for dental practices with modern technology',
                type: 'scoring',
                conditions: JSON.stringify({
                    field: 'industry',
                    operator: 'eq',
                    value: 'dental'
                }),
                actions: JSON.stringify({
                    type: 'BOOST_SCORE',
                    value: 10
                }),
                isActive: true,
                createdById: dentalAnalyst.id,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        for (const rule of businessRules) {
            yield prisma.businessRule.create({
                data: rule
            });
        }
        console.log('✅ Business rules created');
        // Create workflows
        console.log('🔄 Creating workflows...');
        const leadQualificationWorkflow = yield prisma.workflow.create({
            data: {
                id: 'workflow-1',
                name: 'Lead Qualification Workflow',
                description: 'Automated lead qualification process',
                trigger: 'lead_created',
                isActive: true,
                createdById: adminUser.id,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        const dentalOnboardingWorkflow = yield prisma.workflow.create({
            data: {
                id: 'workflow-2',
                name: 'Dental Practice Onboarding',
                description: 'Onboarding workflow for dental practices',
                trigger: 'lead_scored',
                isActive: true,
                createdById: dentalAnalyst.id,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        console.log('✅ Workflows created');
        // Create workflow steps
        console.log('📝 Creating workflow steps...');
        const workflowSteps = [
            {
                id: 'step-1',
                workflowId: leadQualificationWorkflow.id,
                name: 'Initial Scoring',
                order: 1,
                type: 'SCORING',
                config: JSON.stringify({
                    modelId: 'ai-model-1'
                })
            },
            {
                id: 'step-2',
                workflowId: leadQualificationWorkflow.id,
                name: 'Business Rules',
                order: 2,
                type: 'BUSINESS_RULES',
                config: JSON.stringify({
                    ruleIds: ['rule-1', 'rule-2']
                })
            },
            {
                id: 'step-3',
                workflowId: leadQualificationWorkflow.id,
                name: 'Assignment',
                order: 3,
                type: 'ASSIGNMENT',
                config: JSON.stringify({
                    assignmentType: 'ROUND_ROBIN'
                })
            }
        ];
        for (const step of workflowSteps) {
            yield prisma.workflowStep.create({
                data: step
            });
        }
        console.log('✅ Workflow steps created');
        console.log('🎉 Database seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`- ${yield prisma.user.count()} users created`);
        console.log(`- ${yield prisma.team.count()} teams created`);
        console.log(`- ${yield prisma.campaign.count()} campaigns created`);
        console.log(`- ${yield prisma.lead.count()} leads created`);
        console.log(`- ${yield prisma.scoringModel.count()} scoring models created`);
        console.log(`- ${yield prisma.scoringCriterion.count()} scoring criteria created`);
        console.log(`- ${yield prisma.aIModel.count()} AI models created`);
        console.log(`- ${yield prisma.businessRule.count()} business rules created`);
        console.log(`- ${yield prisma.workflow.count()} workflows created`);
        console.log(`- ${yield prisma.workflowStep.count()} workflow steps created`);
        console.log('\n🔑 Test Accounts:');
        console.log('- Admin: admin@bbds.com / password123');
        console.log('- Analyst: analyst@bbds.com / password123');
        console.log('- Viewer: viewer@bbds.com / password123');
        console.log('- Dental Analyst: dental@bbds.com / password123');
        console.log('- Tech Analyst: tech@bbds.com / password123');
    });
}
main()
    .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
