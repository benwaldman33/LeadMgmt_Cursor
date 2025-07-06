import { Router, Request, Response } from 'express';
import { authenticateToken, requireAnalyst } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

// Get all campaigns
router.get('/', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        createdBy: true,
        assignedTeam: true,
        scoringModel: true,
        leads: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create campaign
router.post('/', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { name, industry, status, scoringModelId, assignedTeamId, targetLeadCount, startDate, targetEndDate } = req.body;

    const campaign = await prisma.campaign.create({
      data: {
        name,
        industry,
        status: status || 'PLANNING',
        scoringModelId,
        assignedTeamId,
        targetLeadCount,
        startDate: startDate ? new Date(startDate) : null,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
        createdById: req.user!.id,
      },
      include: {
        createdBy: true,
        assignedTeam: true,
        scoringModel: true,
      },
    });

    res.status(201).json({ campaign });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update campaign
router.put('/:id', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, industry, status, scoringModelId, assignedTeamId, targetLeadCount, startDate, targetEndDate } = req.body;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name,
        industry,
        status,
        scoringModelId,
        assignedTeamId,
        targetLeadCount,
        startDate: startDate ? new Date(startDate) : null,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
      },
      include: {
        createdBy: true,
        assignedTeam: true,
        scoringModel: true,
      },
    });

    res.json({ campaign });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
