import express, { Request, Response } from 'express';
import { authenticateToken, requireAnalyst } from '../middleware/auth';
import { prisma } from '../index';

const router = express.Router();

// Helper: default retention in days
const DEFAULT_RETENTION_DAYS = 90;
const retentionDate = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

// Create a new discovery session
router.post('/sessions', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { industry, productVertical } = req.body;
    if (!industry) return res.status(400).json({ error: 'industry is required' });

    const session = await prisma.discoverySession.create({
      data: {
        userId: req.user!.id,
        industry,
        productVertical: productVertical || null,
        expiresAt: retentionDate(DEFAULT_RETENTION_DAYS),
      }
    });

    res.json({ success: true, session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create discovery session' });
  }
});

// List user sessions (recent first)
router.get('/sessions', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.discoverySession.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true, industry: true, productVertical: true, status: true, pinned: true,
        updatedAt: true, lastAutoSavedAt: true, expiresAt: true
      }
    });
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({ error: 'Failed to list discovery sessions' });
  }
});

// Get a session
router.get('/sessions/:id', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const session = await prisma.discoverySession.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { conversationHistory: true }
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get discovery session' });
  }
});

// Autosave a session
router.post('/sessions/:id/autosave', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { constraints, resultsSnapshot, productVertical, pinned } = req.body as {
      constraints?: unknown;
      resultsSnapshot?: unknown;
      productVertical?: string;
      pinned?: boolean;
    };

    const session = await prisma.discoverySession.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const updated = await prisma.discoverySession.update({
      where: { id: session.id },
      data: {
        productVertical: productVertical ?? session.productVertical,
        constraints: constraints ? JSON.stringify(constraints) : session.constraints,
        resultsSnapshot: resultsSnapshot ? JSON.stringify(resultsSnapshot) : session.resultsSnapshot,
        lastAutoSavedAt: new Date(),
        pinned: typeof pinned === 'boolean' ? pinned : session.pinned,
        expiresAt: typeof pinned === 'boolean' && pinned ? null : (session.expiresAt ?? retentionDate(DEFAULT_RETENTION_DAYS)),
      }
    });

    res.json({ success: true, session: updated });
  } catch (error) {
    console.error('Autosave session error:', error);
    res.status(500).json({ error: 'Failed to autosave discovery session' });
  }
});

// Pin/unpin session
router.patch('/sessions/:id', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { pinned } = req.body as { pinned?: boolean };
    const session = await prisma.discoverySession.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const updated = await prisma.discoverySession.update({
      where: { id: session.id },
      data: {
        pinned: typeof pinned === 'boolean' ? pinned : session.pinned,
        expiresAt: typeof pinned === 'boolean' && pinned ? null : retentionDate(DEFAULT_RETENTION_DAYS)
      }
    });
    res.json({ success: true, session: updated });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update discovery session' });
  }
});

// Create saved customer list with items
router.post('/saved-lists', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { name, industry, productVertical, constraints, aiEngineUsed, promptVersion, pinned, items } = req.body as any;
    if (!name || !industry || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'name, industry and items[] are required' });
    }

    const list = await prisma.savedCustomerList.create({
      data: {
        userId: req.user!.id,
        name,
        industry,
        productVertical: productVertical || null,
        constraints: constraints ? JSON.stringify(constraints) : null,
        aiEngineUsed: aiEngineUsed || null,
        promptVersion: promptVersion || null,
        pinned: !!pinned,
        expiresAt: pinned ? null : retentionDate(DEFAULT_RETENTION_DAYS),
        items: {
          create: items.map((it: any, idx: number) => ({
            url: it.url,
            title: it.title,
            description: it.description || null,
            relevanceScore: typeof it.relevanceScore === 'number' ? it.relevanceScore : null,
            location: it.location || null,
            companyType: it.companyType || null,
            tags: it.tags ? JSON.stringify(it.tags) : null,
            notes: it.notes || null,
            rank: typeof it.rank === 'number' ? it.rank : idx + 1,
            domain: it.domain || null,
            logoUrl: it.logoUrl || null,
            estEmployees: typeof it.estEmployees === 'number' ? it.estEmployees : null,
            estRevenue: it.estRevenue || null,
            techTags: it.techTags ? JSON.stringify(it.techTags) : null,
          }))
        }
      },
      include: { items: true }
    });

    res.json({ success: true, list });
  } catch (error) {
    console.error('Create saved list error:', error);
    res.status(500).json({ error: 'Failed to create saved customer list' });
  }
});

// List saved customer lists
router.get('/saved-lists', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const lists = await prisma.savedCustomerList.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      select: { id: true, name: true, industry: true, productVertical: true, pinned: true, capturedAt: true, updatedAt: true, expiresAt: true }
    });
    res.json({ success: true, lists });
  } catch (error) {
    console.error('List saved lists error:', error);
    res.status(500).json({ error: 'Failed to list saved customer lists' });
  }
});

// Get saved list with items
router.get('/saved-lists/:id', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const list = await prisma.savedCustomerList.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { items: true }
    });
    if (!list) return res.status(404).json({ error: 'Saved list not found' });
    res.json({ success: true, list });
  } catch (error) {
    console.error('Get saved list error:', error);
    res.status(500).json({ error: 'Failed to get saved customer list' });
  }
});

// Delete saved list
router.delete('/saved-lists/:id', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    await prisma.savedCustomerItem.deleteMany({ where: { listId: req.params.id } });
    await prisma.savedCustomerList.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete saved list error:', error);
    res.status(500).json({ error: 'Failed to delete saved customer list' });
  }
});

export default router;

