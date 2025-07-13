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

// Get product verticals for an industry
router.get('/industries/:industry/verticals', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { industry } = req.params;
    const verticals = await AIDiscoveryService.getProductVerticals(industry);

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

// Enhanced customer search with web scraping and historical analysis
router.post('/search-customers', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { industry, productVertical, customerTypes, constraints } = req.body;

    if (!industry || !productVertical) {
      return res.status(400).json({
        success: false,
        error: 'Industry and productVertical are required'
      });
    }

    console.log(`[AI Discovery] Enhanced customer search: ${industry}/${productVertical}`);

    const results = await AIDiscoveryService.searchForCustomers(
      industry,
      productVertical,
      customerTypes || [],
      constraints
    );

    console.log(`[AI Discovery] Found ${results.length} customers with web scraping and historical analysis`);

    // Send final results as JSON
    res.json({
      success: true,
      results,
      metadata: {
        industry,
        productVertical,
        customerTypes: customerTypes || [],
        constraints,
        enhancedSearch: true,
        webScrapingEnabled: true,
        historicalAnalysisEnabled: true
      }
    });

  } catch (error) {
    console.error('Error in enhanced customer search:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform enhanced customer search'
    });
  }
});

// Get historical analysis for a specific URL
router.post('/analyze-url', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const { url, industry, productVertical } = req.body;

    if (!url || !productVertical) {
      return res.status(400).json({
        success: false,
        error: 'URL and productVertical are required'
      });
    }

    console.log(`[AI Discovery] Analyzing URL: ${url} for ${productVertical}`);

    // This would use the historical analysis methods from AIDiscoveryService
    // For now, we'll return a placeholder response
    res.json({
      success: true,
      data: {
        url,
        industry,
        productVertical,
        currentContent: 'Content analysis in progress...',
        historicalContent: 'Historical analysis in progress...',
        keyPhrases: [],
        contentChanges: {
          addedPhrases: [],
          removedPhrases: [],
          messagingEvolution: 'Analysis pending'
        },
        relevanceScore: 0.8,
        lastScraped: new Date()
      }
    });

  } catch (error) {
    console.error('Error analyzing URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze URL'
    });
  }
});

// Get available industries
router.get('/industries', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const industries = [
      {
        id: 'dental',
        name: 'Dental',
        description: 'Dental equipment and services',
        marketSize: '$15B',
        growthRate: '6.2% annually'
      },
      {
        id: 'construction',
        name: 'Construction',
        description: 'Construction equipment and materials',
        marketSize: '$1.2T',
        growthRate: '4.8% annually'
      },
      {
        id: 'manufacturing',
        name: 'Manufacturing',
        description: 'Industrial manufacturing equipment',
        marketSize: '$2.1T',
        growthRate: '5.1% annually'
      },
      {
        id: 'healthcare',
        name: 'Healthcare',
        description: 'Medical equipment and healthcare technology',
        marketSize: '$500B',
        growthRate: '7.3% annually'
      },
      {
        id: 'food_beverage',
        name: 'Food & Beverage',
        description: 'Food processing and beverage manufacturing',
        marketSize: '$800B',
        growthRate: '5.9% annually'
      },
      {
        id: 'distribution',
        name: 'Distribution & Warehouse',
        description: 'Logistics and warehouse automation',
        marketSize: '$300B',
        growthRate: '8.1% annually'
      }
    ];

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