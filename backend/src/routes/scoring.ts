import { Router, Request, Response } from 'express';
import { authenticateToken, requireAnalyst } from '../middleware/auth';
import { prisma } from '../index';
import { ScoringService } from '../services/scoringService';

const router = Router();

// Get all scoring models
router.get('/', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { industry } = req.query;

    const where: any = { isActive: true };
    if (industry) where.industry = industry as string;

    const scoringModels = await prisma.scoringModel.findMany({
      where,
      include: {
        criteria: true,
        createdBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ scoringModels });
  } catch (error) {
    console.error('Get scoring models error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create scoring model
router.post('/', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { name, industry, criteria } = req.body;

    const scoringModel = await prisma.scoringModel.create({
      data: {
        name,
        industry,
        createdById: req.user!.id,
        criteria: {
          create: criteria.map((criterion: any) => ({
            name: criterion.name,
            description: criterion.description,
            searchTerms: JSON.stringify(criterion.searchTerms),
            weight: criterion.weight,
            type: criterion.type,
          })),
        },
      },
      include: {
        criteria: true,
        createdBy: true,
      },
    });

    res.status(201).json({ scoringModel });
  } catch (error) {
    console.error('Create scoring model error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Score a single lead
router.post('/score-lead', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { leadId, scoringModelId } = req.body;

    if (!leadId || !scoringModelId) {
      return res.status(400).json({ error: 'Lead ID and Scoring Model ID are required' });
    }

    const scoringResult = await ScoringService.scoreLead(leadId, scoringModelId);
    await ScoringService.saveScoringResult(leadId, scoringResult);

    res.json({ 
      success: true,
      scoringResult,
      message: 'Lead scored successfully'
    });
  } catch (error: any) {
    console.error('Score lead error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Score all leads in a campaign
router.post('/score-campaign', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    const result = await ScoringService.scoreCampaignLeads(campaignId);

    res.json({ 
      success: true,
      result,
      message: `Scored ${result.scoredLeads} leads, ${result.qualifiedLeads} qualified`
    });
  } catch (error: any) {
    console.error('Score campaign error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get scoring results for a lead
router.get('/results/:leadId', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    const scoringResult = await prisma.scoringResult.findUnique({
      where: { leadId },
      include: {
        criteriaScores: true,
        lead: {
          include: {
            campaign: {
              include: {
                scoringModel: true
              }
            }
          }
        }
      }
    });

    if (!scoringResult) {
      return res.status(404).json({ error: 'Scoring result not found' });
    }

    res.json({ scoringResult });
  } catch (error) {
    console.error('Get scoring results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single scoring model by ID
router.get('/:id', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const scoringModel = await prisma.scoringModel.findUnique({
      where: { id },
      include: {
        criteria: true,
        createdBy: true,
      },
    });

    if (!scoringModel) {
      return res.status(404).json({ error: 'Scoring model not found' });
    }

    res.json({ scoringModel });
  } catch (error) {
    console.error('Get scoring model error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update scoring model
router.put('/:id', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, industry, criteria } = req.body;

    // Check if model exists
    const existingModel = await prisma.scoringModel.findUnique({
      where: { id },
      include: { criteria: true }
    });

    if (!existingModel) {
      return res.status(404).json({ error: 'Scoring model not found' });
    }

    // Update model and criteria in a transaction
    const updatedModel = await prisma.$transaction(async (tx) => {
      // Update the model
      const model = await tx.scoringModel.update({
        where: { id },
        data: {
          name,
          industry,
          updatedAt: new Date(),
        },
      });

      // Delete existing criteria
      await tx.scoringCriterion.deleteMany({
        where: { scoringModelId: id }
      });

      // Create new criteria
      const newCriteria = await Promise.all(
        criteria.map((criterion: any) =>
          tx.scoringCriterion.create({
            data: {
              name: criterion.name,
              description: criterion.description,
              searchTerms: JSON.stringify(criterion.searchTerms),
              weight: criterion.weight,
              type: criterion.type,
              scoringModelId: id,
            },
          })
        )
      );

      return {
        ...model,
        criteria: newCriteria,
      };
    });

    res.json({ scoringModel: updatedModel });
  } catch (error) {
    console.error('Update scoring model error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete scoring model
router.delete('/:id', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if model exists
    const existingModel = await prisma.scoringModel.findUnique({
      where: { id },
      include: { criteria: true }
    });

    if (!existingModel) {
      return res.status(404).json({ error: 'Scoring model not found' });
    }

    // Check if model is being used by any campaigns
    const campaignsUsingModel = await prisma.campaign.findMany({
      where: { scoringModelId: id }
    });

    if (campaignsUsingModel.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete scoring model that is being used by campaigns',
        campaigns: campaignsUsingModel.map(c => ({ id: c.id, name: c.name }))
      });
    }

    // Delete model (criteria will be deleted automatically due to cascade)
    await prisma.scoringModel.delete({
      where: { id }
    });

    res.json({ 
      success: true,
      message: 'Scoring model deleted successfully'
    });
  } catch (error) {
    console.error('Delete scoring model error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Duplicate scoring model
router.post('/:id/duplicate', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Get the original model
    const originalModel = await prisma.scoringModel.findUnique({
      where: { id },
      include: { criteria: true }
    });

    if (!originalModel) {
      return res.status(404).json({ error: 'Scoring model not found' });
    }

    // Create duplicate model
    const duplicatedModel = await prisma.scoringModel.create({
      data: {
        name: name || `${originalModel.name} (Copy)`,
        industry: originalModel.industry,
        createdById: req.user!.id,
        criteria: {
          create: originalModel.criteria.map(criterion => ({
            name: criterion.name,
            description: criterion.description,
            searchTerms: criterion.searchTerms,
            weight: criterion.weight,
            type: criterion.type,
          })),
        },
      },
      include: {
        criteria: true,
        createdBy: true,
      },
    });

    res.status(201).json({ scoringModel: duplicatedModel });
  } catch (error) {
    console.error('Duplicate scoring model error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
