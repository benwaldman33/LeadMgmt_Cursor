import { Router, Request, Response } from 'express';
import { authenticateToken, requireAnalyst } from '../middleware/auth';
import { 
  validateLead, 
  validateBulkStatusUpdate, 
  validateBulkScoring, 
  validateBulkEnrichment, 
  validateBulkDelete 
} from '../middleware/validation';
import { prisma } from '../index';
import { ScoringService } from '../services/scoringService';
import { webSocketService } from '../services/websocketService';

const router = Router();

// Get all leads
router.get('/', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { campaignId, status, limit = 50, offset = 0 } = req.query;

    const where: any = {};
    if (campaignId) where.campaignId = campaignId as string;
    if (status) where.status = status as string;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        campaign: true,
        assignedTo: true,
        assignedTeam: true,
        scoringDetails: true,
        enrichment: {
          include: {
            contacts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.lead.count({ where });

    res.json({ 
      leads,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create lead
router.post('/', authenticateToken, requireAnalyst, validateLead, async (req: Request, res: Response) => {
  try {
    const { url, companyName, domain, industry, campaignId, assignedToId, assignedTeamId } = req.body;

    const lead = await prisma.lead.create({
      data: {
        url,
        companyName,
        domain,
        industry,
        campaignId,
        assignedToId,
        assignedTeamId,
      },
      include: {
        campaign: true,
        assignedTo: true,
        assignedTeam: true,
      },
    });

    // Send WebSocket notification
    await webSocketService.sendLeadCreated(lead);

    // Send user activity notification
    await webSocketService.sendUserActivity(req.user!.id, 'created a new lead');

    res.status(201).json({ lead });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single lead by ID
router.get('/:id', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        campaign: true,
        assignedTo: true,
        assignedTeam: true,
        scoringDetails: {
          include: {
            criteriaScores: true,
          },
        },
        enrichment: {
          include: {
            contacts: true,
          },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ lead });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lead
router.put('/:id', authenticateToken, requireAnalyst, validateLead, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { url, companyName, domain, industry, campaignId, status, assignedToId, assignedTeamId } = req.body;

    // Get the lead before update to check for assignment changes
    const oldLead = await prisma.lead.findUnique({
      where: { id },
      include: { assignedTo: true, assignedTeam: true }
    });

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        url,
        companyName,
        domain,
        industry,
        campaignId,
        status,
        assignedToId,
        assignedTeamId,
      },
      include: {
        campaign: true,
        assignedTo: true,
        assignedTeam: true,
      },
    });

    // Send WebSocket notification for lead update
    await webSocketService.sendLeadUpdated(lead, req.user!.id);

    // Check if lead was assigned to a new user
    if (oldLead && lead.assignedToId && oldLead.assignedToId !== lead.assignedToId) {
      await webSocketService.sendLeadAssigned(lead, lead.assignedToId, req.user!.id);
    }

    // Send user activity notification
    await webSocketService.sendUserActivity(req.user!.id, 'updated a lead');

    res.json({ lead });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enrich lead (mocked)
router.post('/:id/enrich', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Remove existing enrichment if any
    await prisma.leadEnrichment.deleteMany({ where: { leadId: id } });

    // Mock enrichment data
    const enrichment = await prisma.leadEnrichment.create({
      data: {
        leadId: id,
        companySize: Math.floor(Math.random() * 1000) + 10, // 10-1009
        revenue: `$${(Math.floor(Math.random() * 100) + 1)}M`,
        industry: 'Dental Equipment',
        technologies: JSON.stringify(['Salesforce', 'HubSpot', 'ZoomInfo', 'Slack'].filter(() => Math.random() > 0.5)),
        source: 'MOCK',
        contacts: {
          create: [
            {
              name: 'Jane Doe',
              email: 'jane.doe@example.com',
              title: 'CEO',
              linkedinUrl: 'https://linkedin.com/in/janedoe',
              isPrimaryContact: true,
            },
            {
              name: 'John Smith',
              email: 'john.smith@example.com',
              title: 'VP Sales',
              linkedinUrl: 'https://linkedin.com/in/johnsmith',
              isPrimaryContact: false,
            }
          ]
        }
      },
      include: { contacts: true }
    });

    res.json({ enrichment });
  } catch (error) {
    console.error('Enrich lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk operations
router.post('/bulk/status', authenticateToken, requireAnalyst, validateBulkStatusUpdate, async (req: Request, res: Response) => {
  try {
    const { leadIds, status } = req.body;

    const result = await prisma.lead.updateMany({
      where: {
        id: { in: leadIds }
      },
      data: {
        status
      }
    });

    // Send WebSocket notification for bulk status update
    const notification = {
      type: 'lead_updated' as const,
      title: 'Bulk Status Update',
      message: `Updated ${result.count} leads to ${status} status`,
      data: { leadIds, status, updatedCount: result.count },
      timestamp: new Date()
    };
    webSocketService.sendToAll(notification);

    // Send user activity notification
    await webSocketService.sendUserActivity(req.user!.id, `updated ${result.count} leads to ${status} status`);

    res.json({ 
      success: true,
      updatedCount: result.count,
      message: `Updated ${result.count} leads to ${status} status`
    });
  } catch (error) {
    console.error('Bulk status update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bulk/score', authenticateToken, requireAnalyst, validateBulkScoring, async (req: Request, res: Response) => {
  try {
    const { leadIds, scoringModelId } = req.body;

    let scoredCount = 0;
    let qualifiedCount = 0;

    for (const leadId of leadIds) {
      try {
        const scoringResult = await ScoringService.scoreLead(leadId, scoringModelId);
        await ScoringService.saveScoringResult(leadId, scoringResult);
        scoredCount++;
        if (scoringResult.totalScore >= 70) {
          qualifiedCount++;
        }
      } catch (error) {
        console.error(`Failed to score lead ${leadId}:`, error);
      }
    }

    // Send WebSocket notification for bulk scoring
    const notification = {
      type: 'lead_scored' as const,
      title: 'Bulk Lead Scoring',
      message: `Scored ${scoredCount} leads, ${qualifiedCount} qualified`,
      data: { leadIds, scoringModelId, scoredCount, qualifiedCount },
      timestamp: new Date()
    };
    webSocketService.sendToAll(notification);

    // Send user activity notification
    await webSocketService.sendUserActivity(req.user!.id, `scored ${scoredCount} leads`);

    res.json({ 
      success: true,
      scoredCount,
      qualifiedCount,
      message: `Scored ${scoredCount} leads, ${qualifiedCount} qualified`
    });
  } catch (error) {
    console.error('Bulk scoring error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bulk/enrich', authenticateToken, requireAnalyst, validateBulkEnrichment, async (req: Request, res: Response) => {
  try {
    const { leadIds } = req.body;

    let enrichedCount = 0;

    for (const leadId of leadIds) {
      try {
        // Check if lead exists
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) {
          console.warn(`Lead not found for enrichment: ${leadId}`);
          continue;
        }
        // Remove existing enrichment if any
        await prisma.leadEnrichment.deleteMany({ where: { leadId } });

        // Mock enrichment data (without contacts for now)
        await prisma.leadEnrichment.create({
          data: {
            leadId,
            companySize: Math.floor(Math.random() * 1000) + 10,
            revenue: `$${(Math.floor(Math.random() * 100) + 1)}M`,
            industry: 'Dental Equipment',
            technologies: JSON.stringify(['Salesforce', 'HubSpot', 'ZoomInfo', 'Slack'].filter(() => Math.random() > 0.5)),
            source: 'MOCK',
          }
        });
        enrichedCount++;
      } catch (error) {
        console.error(`Failed to enrich lead ${leadId}:`, error);
      }
    }

    // Send WebSocket notification for bulk enrichment
    const notification = {
      type: 'lead_updated' as const,
      title: 'Bulk Lead Enrichment',
      message: `Enriched ${enrichedCount} leads with additional data`,
      data: { leadIds, enrichedCount },
      timestamp: new Date()
    };
    webSocketService.sendToAll(notification);

    // Send user activity notification
    await webSocketService.sendUserActivity(req.user!.id, `enriched ${enrichedCount} leads`);

    res.json({ 
      success: true,
      enrichedCount,
      message: `Enriched ${enrichedCount} leads`
    });
  } catch (error) {
    console.error('Bulk enrichment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/bulk', authenticateToken, requireAnalyst, validateBulkDelete, async (req: Request, res: Response) => {
  try {
    const { leadIds } = req.body;

    const result = await prisma.lead.deleteMany({
      where: {
        id: { in: leadIds }
      }
    });

    res.json({ 
      success: true,
      deletedCount: result.count,
      message: `Deleted ${result.count} leads`
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
