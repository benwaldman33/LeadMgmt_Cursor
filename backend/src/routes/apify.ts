import express from 'express';
import { apifyService } from '../services/apifyService';
import authMiddleware from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/apify/actors
 * Get all configured Apify Actors
 */
router.get('/actors', async (req, res) => {
  try {
    const actors = await apifyService.getActorConfigs();
    
    res.json({
      success: true,
      data: actors
    });
  } catch (error) {
    console.error('Error fetching Apify actors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Apify actors'
    });
  }
});

/**
 * POST /api/apify/actors
 * Create a new Apify Actor configuration
 */
router.post('/actors', async (req, res) => {
  try {
    const { name, description, actorId, apiToken, isActive, defaultInput } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!name || !actorId || !apiToken) {
      return res.status(400).json({
        success: false,
        error: 'Name, actorId, and apiToken are required'
      });
    }

    const actorConfig = await apifyService.createActorConfig({
      name,
      description,
      actorId,
      apiToken,
      isActive: isActive ?? true,
      defaultInput: defaultInput || {}
    }, userId);

    res.json({
      success: true,
      data: actorConfig
    });

  } catch (error) {
    console.error('Error creating Apify actor config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Apify actor configuration'
    });
  }
});

/**
 * POST /api/apify/test
 * Test an Apify Actor configuration
 */
router.post('/test', async (req, res) => {
  try {
    const { actorId, apiToken } = req.body;

    if (!actorId || !apiToken) {
      return res.status(400).json({
        success: false,
        error: 'actorId and apiToken are required'
      });
    }

    const isValid = await apifyService.testActorConfig(actorId, apiToken);

    res.json({
      success: true,
      data: { isValid }
    });

  } catch (error) {
    console.error('Error testing Apify actor config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test Apify actor configuration'
    });
  }
});

/**
 * POST /api/apify/scrape
 * Scrape URLs using an Apify Actor
 */
router.post('/scrape', async (req, res) => {
  try {
    const { actorId, urls, industry } = req.body;

    if (!actorId || !urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'actorId and urls array are required'
      });
    }

    if (urls.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 URLs allowed per scrape job'
      });
    }

    const job = await apifyService.scrapeWithActor(actorId, urls, industry);

    res.json({
      success: true,
      data: job
    });

  } catch (error) {
    console.error('Error scraping with Apify actor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scrape with Apify actor'
    });
  }
});

/**
 * GET /api/apify/jobs/:jobId
 * Get the status and results of an Apify scraping job
 */
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await apifyService.getScrapingJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });

  } catch (error) {
    console.error('Error fetching Apify job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Apify job'
    });
  }
});

/**
 * POST /api/apify/run
 * Run an Apify Actor with custom input
 */
router.post('/run', async (req, res) => {
  try {
    const { actorId, input } = req.body;

    if (!actorId) {
      return res.status(400).json({
        success: false,
        error: 'actorId is required'
      });
    }

    const runResult = await apifyService.runActor(actorId, input || {});

    res.json({
      success: true,
      data: runResult
    });

  } catch (error) {
    console.error('Error running Apify actor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run Apify actor'
    });
  }
});

/**
 * GET /api/apify/runs/:runId
 * Get the status of an Apify run
 */
router.get('/runs/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    const { actorId } = req.query;

    if (!actorId || typeof actorId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'actorId query parameter is required'
      });
    }

    const runStatus = await apifyService.getRunStatus(runId, actorId);

    res.json({
      success: true,
      data: runStatus
    });

  } catch (error) {
    console.error('Error fetching Apify run status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Apify run status'
    });
  }
});

export default router;
