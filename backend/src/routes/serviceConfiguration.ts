import express from 'express';
import { ServiceConfigurationService } from '../services/serviceConfigurationService';
import { authenticateToken as auth } from '../middleware/auth';


const router = express.Router();
const serviceConfigService = new ServiceConfigurationService();

// Middleware to ensure user is SUPER_ADMIN
const requireSuperAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Access denied. Super admin required.' });
  }
  next();
};

// Get all service providers
router.get('/providers', auth, async (req, res) => {
  try {
    const providers = await serviceConfigService.getAllServiceProviders();
    res.json(providers);
  } catch (error) {
    console.error('Error fetching service providers:', error);
    res.status(500).json({ error: 'Failed to fetch service providers' });
  }
});

// Get service providers for a specific operation
router.get('/providers/:operation', auth, async (req, res) => {
  try {
    const { operation } = req.params;
    const providers = await serviceConfigService.getAvailableServices(operation);
    res.json(providers);
  } catch (error) {
    console.error('Error fetching available services:', error);
    res.status(500).json({ error: 'Failed to fetch available services' });
  }
});

// Create new service provider
router.post('/providers', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { name, type, capabilities, config, limits, scrapingConfig } = req.body;
    
    // Validate required fields
    if (!name || !type || !capabilities || !config || !limits) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate JSON strings
    try {
      JSON.parse(capabilities);
      JSON.parse(config);
      JSON.parse(limits);
      if (scrapingConfig) JSON.parse(scrapingConfig);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON in configuration fields' });
    }

    const provider = await serviceConfigService.createServiceProvider({
      name,
      type,
      isActive: true,
      priority: 1,
      capabilities,
      config,
      limits,
      scrapingConfig
    });

    res.status(201).json(provider);
  } catch (error) {
    console.error('Error creating service provider:', error);
    res.status(500).json({ error: 'Failed to create service provider' });
  }
});

// Update service provider
router.put('/providers/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate JSON strings if provided
    if (updateData.capabilities) {
      try { JSON.parse(updateData.capabilities); } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in capabilities' });
      }
    }
    if (updateData.config) {
      try { JSON.parse(updateData.config); } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in config' });
      }
    }
    if (updateData.limits) {
      try { JSON.parse(updateData.limits); } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in limits' });
      }
    }
    if (updateData.scrapingConfig) {
      try { JSON.parse(updateData.scrapingConfig); } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in scrapingConfig' });
      }
    }

    const provider = await serviceConfigService.updateServiceProvider(id, updateData);
    res.json(provider);
  } catch (error) {
    console.error('Error updating service provider:', error);
    res.status(500).json({ error: 'Failed to update service provider' });
  }
});

// Delete service provider
router.delete('/providers/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await serviceConfigService.deleteServiceProvider(id);
    res.json({ message: 'Service provider deleted successfully' });
  } catch (error) {
    console.error('Error deleting service provider:', error);
    res.status(500).json({ error: 'Failed to delete service provider' });
  }
});

// Get operation-service mappings
router.get('/mappings', auth, async (req, res) => {
  try {
    const { operation } = req.query;
    let mappings;
    
    if (operation) {
      // Get mappings for specific operation
      const providers = await serviceConfigService.getAvailableServices(operation as string);
      mappings = providers.map(provider => ({
        operation: operation as string,
        service: provider,
        isEnabled: true,
        priority: 1
      }));
    } else {
      // Get all mappings
      // This would require a new method in the service
      res.status(501).json({ error: 'Not implemented yet' });
      return;
    }
    
    res.json(mappings);
  } catch (error) {
    console.error('Error fetching operation mappings:', error);
    res.status(500).json({ error: 'Failed to fetch operation mappings' });
  }
});

// Create operation-service mapping
router.post('/mappings', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { operation, serviceId, isEnabled, priority, config } = req.body;
    
    if (!operation || !serviceId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (config) {
      try { JSON.parse(config); } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in config' });
      }
    }

    const mapping = await serviceConfigService.createOperationMapping({
      operation,
      serviceId,
      isEnabled: isEnabled ?? true,
      priority: priority ?? 1,
      config: config ?? '{}'
    });

    res.status(201).json(mapping);
  } catch (error) {
    console.error('Error creating operation mapping:', error);
    res.status(500).json({ error: 'Failed to create operation mapping' });
  }
});

// Update operation-service mapping
router.put('/mappings/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.config) {
      try { JSON.parse(updateData.config); } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in config' });
      }
    }

    const mapping = await serviceConfigService.updateOperationMapping(id, updateData);
    res.json(mapping);
  } catch (error) {
    console.error('Error updating operation mapping:', error);
    res.status(500).json({ error: 'Failed to update operation mapping' });
  }
});

// Delete operation-service mapping
router.delete('/mappings/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await serviceConfigService.deleteOperationMapping(id);
    res.json({ message: 'Operation mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting operation mapping:', error);
    res.status(500).json({ error: 'Failed to delete operation mapping' });
  }
});

// Get service usage statistics
router.get('/usage', auth, async (req, res) => {
  try {
    const { serviceId, operation, days } = req.query;
    const stats = await serviceConfigService.getServiceUsageStats(
      serviceId as string,
      operation as string,
      days ? parseInt(days as string) : 30
    );
    res.json(stats);
  } catch (error) {
    console.error('Error fetching usage statistics:', error);
    res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }
});

// Get available operations and service types
router.get('/metadata', auth, async (req, res) => {
  try {
    const operations = serviceConfigService.getAvailableOperations();
    const serviceTypes = serviceConfigService.getAvailableServiceTypes();
    
    res.json({
      operations,
      serviceTypes
    });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

export default router;
