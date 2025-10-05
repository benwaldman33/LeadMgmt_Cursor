import { Router, Request, Response } from 'express';
import { authenticateToken, requireAnalyst } from '../middleware/auth';
import { AIDiscoveryService } from '../services/aiDiscoveryService';
import { webSocketService } from '../services/websocketService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      maxIndustries: Math.min(constraints?.maxIndustries || 8, 50), // Cap at 50 for performance
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

    // Resolve industry and product vertical IDs to names for better AI prompts
    let industryName = industry;
    let productVerticalName = productVertical;

    try {
      // Try to resolve industry ID to name
      if (industry) {
        const industryRecord = await prisma.industry.findUnique({
          where: { id: industry },
          select: { name: true }
        });
        if (industryRecord) {
          industryName = industryRecord.name;
        }
      }

      // Try to resolve product vertical ID to name
      if (productVertical) {
        const productVerticalRecord = await prisma.productVertical.findUnique({
          where: { id: productVertical },
          select: { name: true }
        });
        if (productVerticalRecord) {
          productVerticalName = productVerticalRecord.name;
        }
      }
    } catch (resolveError) {
      console.warn('[AI Discovery] Could not resolve IDs to names for conversation, using original values:', resolveError);
      // Continue with original values if resolution fails
    }

    const updatedSession = await AIDiscoveryService.addUserMessage(sessionId, message, industryName, productVerticalName);

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

    // Resolve industry and product vertical IDs to names for better AI prompts
    let industryName = industry;
    let productVerticalName = productVertical;

    try {
      // Try to resolve industry ID to name
      const industryRecord = await prisma.industry.findUnique({
        where: { id: industry },
        select: { name: true }
      });
      if (industryRecord) {
        industryName = industryRecord.name;
      }

      // Try to resolve product vertical ID to name
      const productVerticalRecord = await prisma.productVertical.findUnique({
        where: { id: productVertical },
        select: { name: true }
      });
      if (productVerticalRecord) {
        productVerticalName = productVerticalRecord.name;
      }
    } catch (resolveError) {
      console.warn('[AI Discovery] Could not resolve IDs to names for insights, using original values:', resolveError);
      // Continue with original values if resolution fails
    }

    const insights = await AIDiscoveryService.generateCustomerInsights(industryName, productVerticalName);

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

    // Resolve industry and product vertical IDs to names for better AI prompts and user experience
    let industryName = industry;
    let productVerticalName = productVertical;

    try {
      // Try to resolve industry ID to name
      const industryRecord = await prisma.industry.findUnique({
        where: { id: industry },
        select: { name: true }
      });
      if (industryRecord) {
        industryName = industryRecord.name;
        console.log(`[AI Discovery] Resolved industry ID ${industry} to name: ${industryName}`);
      }

      // Try to resolve product vertical ID to name
      const productVerticalRecord = await prisma.productVertical.findUnique({
        where: { id: productVertical },
        select: { name: true }
      });
      if (productVerticalRecord) {
        productVerticalName = productVerticalRecord.name;
        console.log(`[AI Discovery] Resolved product vertical ID ${productVertical} to name: ${productVerticalName}`);
      }
    } catch (resolveError) {
      console.warn('[AI Discovery] Could not resolve IDs to names, using original values:', resolveError);
      // Continue with original values if resolution fails
    }

    console.log(`[AI Discovery] Searching for customers with resolved names: ${industryName}/${productVerticalName}`);

    // Add safety cap for customer limits (similar to industry limits)
    const safeConstraints = {
      ...constraints,
      maxResults: Math.min(constraints?.maxResults || 50, 100) // Cap at 100 for performance
    };

    const results = await AIDiscoveryService.searchForCustomers(
      industryName,
      productVerticalName,
      customerTypesArray,
      safeConstraints
    );

    // Send notification with proper names
    await webSocketService.sendUserActivity(
      req.user!.id, 
      `searched for ${results.length} customers in ${industryName}/${productVerticalName}`
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

// Find similar customers based on user selections
router.post('/find-similar-customers', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const {
      industry,
      productVertical,
      selectedCustomers,
      constraints
    } = req.body;

    if (!industry || !productVertical) {
      return res.status(400).json({ error: 'Industry and product vertical are required' });
    }

    if (!Array.isArray(selectedCustomers) || selectedCustomers.length === 0) {
      return res.status(400).json({ error: 'At least one selected customer is required' });
    }

    // Resolve IDs to names if necessary
    let industryName = industry;
    let productVerticalName = productVertical;

    try {
      const industryRecord = await prisma.industry.findUnique({ where: { id: industry }, select: { name: true } });
      if (industryRecord) industryName = industryRecord.name;

      const pvRecord = await prisma.productVertical.findUnique({ where: { id: productVertical }, select: { name: true } });
      if (pvRecord) productVerticalName = pvRecord.name;
    } catch (resolveError) {
      console.warn('[AI Discovery] Could not resolve IDs to names for find-similar:', resolveError);
    }

    // Add safety cap for customer limits
    const safeConstraints = {
      ...constraints,
      maxResults: Math.min(constraints?.maxResults || 50, 100)
    };

    const results = await AIDiscoveryService.findSimilarCustomers(
      industryName,
      productVerticalName,
      selectedCustomers,
      safeConstraints
    );

    await webSocketService.sendUserActivity(
      req.user!.id,
      `requested similar customers (${results.length}) for ${industryName}/${productVerticalName}`
    );

    res.json({
      success: true,
      results,
      totalFound: results.length
    });
  } catch (error) {
    console.error('Error finding similar customers:', error);
    res.status(500).json({ error: 'Failed to find similar customers' });
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

// Get available industries for scoring model creation
router.get('/industries-for-scoring', authenticateToken, requireAnalyst, async (req: Request, res: Response) => {
  try {
    const industries = await AIDiscoveryService.getAvailableIndustriesForScoring();

    res.json({
      success: true,
      industries
    });
  } catch (error) {
    console.error('Error getting industries for scoring:', error);
    res.status(500).json({ error: 'Failed to get industries for scoring' });
  }
});

export default router; 