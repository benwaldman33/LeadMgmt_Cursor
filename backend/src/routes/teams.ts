import { Router, Request, Response } from 'express';
import { authenticateToken, requireAnalyst } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

// Get all teams
router.get('/', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: true,
        campaigns: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ teams });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create team
router.post('/', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { name, industry } = req.body;

    const team = await prisma.team.create({
      data: {
        name,
        industry,
      },
      include: {
        members: true,
      },
    });

    res.status(201).json({ team });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
