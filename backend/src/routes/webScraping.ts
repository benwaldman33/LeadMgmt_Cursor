import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { webScrapingService, ScrapingJob } from '../services/webScrapingService';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * POST /api/web-scraping/scrape
 * Scrape a single URL
 */
router.post('/scrape', async (req, res) => {
  try {
    const { url, industry } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    const result = await webScrapingService.scrapeUrl(url, industry);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error scraping URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scrape URL'
    });
  }
});

/**
 * POST /api/web-scraping/batch
 * Scrape multiple URLs in batch
 */
router.post('/batch', async (req, res) => {
  try {
    const { urls, industry } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'URLs array is required and must not be empty'
      });
    }

    if (urls.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 URLs allowed per batch'
      });
    }

    const job = await webScrapingService.scrapeBatch(urls, industry);

    res.json({
      success: true,
      data: job
    });

  } catch (error) {
    console.error('Error in batch scraping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process batch scraping'
    });
  }
});

/**
 * GET /api/web-scraping/stats
 * Get scraping statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await webScrapingService.getScrapingStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting scraping stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scraping statistics'
    });
  }
});

/**
 * POST /api/web-scraping/check-accessibility
 * Check if a URL is accessible
 */
router.post('/check-accessibility', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    const isAccessible = await webScrapingService.checkUrlAccessibility(url);

    res.json({
      success: true,
      data: {
        url,
        isAccessible
      }
    });

  } catch (error) {
    console.error('Error checking URL accessibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check URL accessibility'
    });
  }
});

/**
 * GET /api/web-scraping/health
 * Health check for web scraping service
 */
router.get('/health', async (req, res) => {
  try {
    // Test with a simple URL to verify service is working
    const testUrl = 'https://httpbin.org/html';
    const result = await webScrapingService.scrapeUrl(testUrl);

    res.json({
      success: true,
      data: {
        status: 'healthy',
        testUrl,
        testResult: result.success
      }
    });

  } catch (error) {
    console.error('Web scraping health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Web scraping service is unhealthy'
    });
  }
});

console.log('webScraping router defined:', typeof router);

export default router; 