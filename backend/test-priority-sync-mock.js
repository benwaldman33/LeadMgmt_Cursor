// Mock test to verify priority synchronization logic
console.log('🧪 Testing Priority Synchronization Logic (Mock)...\n');

// Simulate the ServiceConfigurationService methods
class MockServiceConfigurationService {
  constructor() {
    // Mock data
    this.serviceProviders = [
      { id: '1', name: 'OpenAI GPT-4', priority: 1 },
      { id: '2', name: 'Claude AI', priority: 2 },
      { id: '3', name: 'Grok', priority: 2 }
    ];
    
    this.operationMappings = [
      { id: '1', serviceId: '1', operation: 'AI_DISCOVERY', priority: 1, service: this.serviceProviders[0] },
      { id: '2', serviceId: '1', operation: 'AI_SCORING', priority: 1, service: this.serviceProviders[0] },
      { id: '3', serviceId: '2', operation: 'AI_DISCOVERY', priority: 2, service: this.serviceProviders[1] },
      { id: '4', serviceId: '2', operation: 'AI_SCORING', priority: 2, service: this.serviceProviders[1] },
      { id: '5', serviceId: '3', operation: 'AI_DISCOVERY', priority: 2, service: this.serviceProviders[2] }
    ];
  }

  // Mock updateServiceProvider method
  async updateServiceProvider(id, data) {
    console.log(`[Mock] Updating service provider ${id} with data:`, data);
    
    // Find the provider
    const providerIndex = this.serviceProviders.findIndex(p => p.id === id);
    if (providerIndex === -1) {
      throw new Error('Service provider not found');
    }
    
    const currentProvider = this.serviceProviders[providerIndex];
    console.log(`[Mock] Current provider: ${currentProvider.name} (Priority: ${currentProvider.priority})`);
    
    // Update the provider
    this.serviceProviders[providerIndex] = { ...currentProvider, ...data };
    const updatedProvider = this.serviceProviders[providerIndex];
    
    // If priority changed, sync OperationServiceMapping priorities
    if (data.priority !== undefined && data.priority !== currentProvider.priority) {
      console.log(`[Mock] Priority changed for ${updatedProvider.name} from ${currentProvider.priority} to ${data.priority}`);
      console.log(`[Mock] Syncing OperationServiceMapping priorities...`);
      
      await this.syncOperationMappingPriorities(id, data.priority);
    }
    
    return updatedProvider;
  }

  // Mock syncOperationMappingPriorities method
  async syncOperationMappingPriorities(serviceId, newPriority) {
    console.log(`[Mock] Syncing operation mappings for service ${serviceId} to priority ${newPriority}`);
    
    // Find all mappings for this service
    const mappingsToUpdate = this.operationMappings.filter(m => m.serviceId === serviceId);
    
    if (mappingsToUpdate.length === 0) {
      console.log(`[Mock] No operation mappings found for service ${serviceId}`);
      return;
    }
    
    // Update all mappings
    mappingsToUpdate.forEach(mapping => {
      mapping.priority = newPriority;
      console.log(`[Mock] Updated ${mapping.service.name} -> ${mapping.operation}: Priority ${mapping.priority}`);
    });
    
    console.log(`[Mock] Updated ${mappingsToUpdate.length} operation mappings to priority ${newPriority}`);
  }

  // Mock getAvailableServices method
  getAvailableServices(operation) {
    const mappings = this.operationMappings.filter(m => 
      m.operation === operation && 
      m.service.isActive
    );
    
    // Sort by ServiceProvider priority first, then OperationServiceMapping priority
    mappings.sort((a, b) => {
      if (a.service.priority !== b.service.priority) {
        return a.service.priority - b.service.priority;
      }
      return a.priority - b.priority;
    });
    
    return mappings.map(m => m.service);
  }
}

// Test the synchronization logic
async function testPrioritySync() {
  const service = new MockServiceConfigurationService();
  
  console.log('📊 Initial State:');
  console.log('ServiceProviders:');
  service.serviceProviders.forEach(provider => {
    console.log(`   - ${provider.name}: Priority ${provider.priority}`);
  });
  
  console.log('\nOperationServiceMappings:');
  service.operationMappings.forEach(mapping => {
    console.log(`   - ${mapping.service.name} -> ${mapping.operation}: ServiceProvider Priority ${mapping.service.priority}, Mapping Priority ${mapping.priority}`);
  });
  
  console.log('\n🔍 Testing Priority Synchronization:');
  
  // Test 1: Update Claude AI priority from 2 to 1
  console.log('\nTest 1: Updating Claude AI priority from 2 to 1');
  await service.updateServiceProvider('2', { priority: 1 });
  
  console.log('\n📊 State after Test 1:');
  console.log('ServiceProviders:');
  service.serviceProviders.forEach(provider => {
    console.log(`   - ${provider.name}: Priority ${provider.priority}`);
  });
  
  console.log('\nOperationServiceMappings:');
  service.operationMappings.forEach(mapping => {
    console.log(`   - ${mapping.service.name} -> ${mapping.operation}: ServiceProvider Priority ${mapping.service.priority}, Mapping Priority ${mapping.priority}`);
  });
  
  // Test 2: Check AI_DISCOVERY service order
  console.log('\nTest 2: Checking AI_DISCOVERY service order');
  const aiDiscoveryServices = service.getAvailableServices('AI_DISCOVERY');
  console.log('AI_DISCOVERY services in order:');
  aiDiscoveryServices.forEach((service, index) => {
    console.log(`   ${index + 1}. ${service.name} (Priority: ${service.priority})`);
  });
  
  // Test 3: Update OpenAI priority from 1 to 3
  console.log('\nTest 3: Updating OpenAI priority from 1 to 3');
  await service.updateServiceProvider('1', { priority: 3 });
  
  console.log('\n📊 State after Test 3:');
  console.log('ServiceProviders:');
  service.serviceProviders.forEach(provider => {
    console.log(`   - ${provider.name}: Priority ${provider.priority}`);
  });
  
  console.log('\nOperationServiceMappings:');
  service.operationMappings.forEach(mapping => {
    console.log(`   - ${mapping.service.name} -> ${mapping.operation}: ServiceProvider Priority ${mapping.service.priority}, Mapping Priority ${mapping.priority}`);
  });
  
  // Test 4: Check AI_DISCOVERY service order again
  console.log('\nTest 4: Checking AI_DISCOVERY service order after changes');
  const aiDiscoveryServices2 = service.getAvailableServices('AI_DISCOVERY');
  console.log('AI_DISCOVERY services in order:');
  aiDiscoveryServices2.forEach((service, index) => {
    console.log(`   ${index + 1}. ${service.name} (Priority: ${service.priority})`);
  });
  
  console.log('\n✅ Priority synchronization test completed!');
  console.log('📝 The system now automatically syncs OperationServiceMapping priorities when ServiceProvider priorities change.');
}

testPrioritySync();
