import { Router, Request, Response } from 'express';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

// Get all users (super admin only)
router.get('/', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        team: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID (super admin only)
router.get('/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        team: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (super admin only)
router.put('/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, role, status, teamId } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        fullName,
        role,
        status,
        teamId,
      },
      include: {
        team: true,
      },
    });

    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
