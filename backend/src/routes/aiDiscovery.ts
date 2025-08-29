import { Router, Request, Response } from 'express';
import { authenticateToken, requireAnalyst } from '../middleware/auth';
import { AIDiscoveryService } from '../services/aiDiscoveryService';
import { webSocketService } from '../services/websocketService';

const router = Router();

// Start a new discovery session
router.post('/sessions', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { industry } = req.body;

    if (!industry) {
      return res.status(400).json({ error: 'Industry is required' });
    }

    const session = await AIDiscoveryService.startDiscoverySession(req.user!.id, industry);

    // Send notification
    await webSocketService.sendUserActivity(req.user!.id, `started AI discovery session for ${industry} industry`);

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Error starting discovery session:', error);
    res.status(500).json({ error: 'Failed to start discovery session' });
  }
});

// AI-Driven Industry Discovery
router.post('/discover-industries', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { userInput, constraints } = req.body;

    if (!userInput) {
      return res.status(400).json({ error: 'User input is required for industry discovery' });
    }

    // Extract and validate criteria
    const discoveryConstraints = {
      maxIndustries: constraints?.maxIndustries || 8,
      focusAreas: constraints?.focusAreas || [],
      excludeIndustries: constraints?.excludeIndustries || [],
      marketSize: constraints?.marketSize || '',
      growthRate: constraints?.growthRate || '',
      industryType: constraints?.industryType || '',
      geography: constraints?.geography || ''
    };

    const discoveryResult = await AIDiscoveryService.discoverIndustries(userInput, discoveryConstraints);

    res.json({
      success: true,
      ...discoveryResult
    });
  } catch (error) {
    console.error('Error discovering industries:', error);
    res.status(500).json({ error: 'Failed to discover industries' });
  }
});

// Get product verticals for an industry from database
router.get('/industries/:industryId/verticals', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { industryId } = req.params;
    const verticals = await AIDiscoveryService.getProductVerticals(industryId);

    res.json({
      success: true,
      verticals
    });
  } catch (error) {
    console.error('Error getting product verticals:', error);
    res.status(500).json({ error: 'Failed to get product verticals' });
  }
});

// Add message to discovery session
router.post('/sessions/:sessionId/messages', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { message, industry, productVertical } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const updatedSession = await AIDiscoveryService.addUserMessage(sessionId, message, industry, productVertical);

    res.json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    console.error('Error adding message to session:', error);
    res.status(500).json({ error: 'Failed to add message to session' });
  }
});

// Generate customer insights for product vertical
router.post('/customer-insights', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { industry, productVertical } = req.body;

    if (!industry || !productVertical) {
      return res.status(400).json({ error: 'Industry and product vertical are required' });
    }

    const insights = await AIDiscoveryService.generateCustomerInsights(industry, productVertical);

    res.json({
      success: true,
      insights
    });
  } catch (error) {
    console.error('Error generating customer insights:', error);
    res.status(500).json({ error: 'Failed to generate customer insights' });
  }
});

// Search for customers based on criteria
router.post('/search-customers', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { 
      industry, 
      productVertical, 
      customerTypes, 
      constraints 
    } = req.body;

    if (!industry || !productVertical) {
      return res.status(400).json({ 
        error: 'Industry and product vertical are required' 
      });
    }

    // Ensure customerTypes is an array (can be empty)
    const customerTypesArray = Array.isArray(customerTypes) ? customerTypes : [];

    const results = await AIDiscoveryService.searchForCustomers(
      industry,
      productVertical,
      customerTypesArray,
      constraints
    );

    // Send notification
    await webSocketService.sendUserActivity(
      req.user!.id, 
      `searched for ${results.length} customers in ${industry}/${productVertical}`
    );

    res.json({
      success: true,
      results,
      totalFound: results.length
    });
  } catch (error) {
    console.error('Error searching for customers:', error);
    res.status(500).json({ error: 'Failed to search for customers' });
  }
});

// Get available industries from database
router.get('/industries', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const industries = await AIDiscoveryService.getIndustries();

    res.json({
      success: true,
      industries
    });
  } catch (error) {
    console.error('Error getting industries:', error);
    res.status(500).json({ error: 'Failed to get industries' });
  }
});

export default router; 