// Test the priority ordering logic without database
console.log('🧪 Testing Priority Ordering Logic...\n');

// Simulate the data structure we'd get from the database
const mockServiceProviders = [
  { id: '1', name: 'OpenAI GPT-4', priority: 1 },
  { id: '2', name: 'Claude AI', priority: 2 },
  { id: '3', name: 'Grok', priority: 2 }
];

const mockOperationMappings = [
  { 
    id: '1', 
    operation: 'AI_DISCOVERY', 
    serviceId: '1', 
    priority: 2, // Operation-specific priority
    service: mockServiceProviders[0] // OpenAI
  },
  { 
    id: '2', 
    operation: 'AI_DISCOVERY', 
    serviceId: '2', 
    priority: 1, // Operation-specific priority
    service: mockServiceProviders[1] // Claude
  },
  { 
    id: '3', 
    operation: 'AI_DISCOVERY', 
    serviceId: '3', 
    priority: 3, // Operation-specific priority
    service: mockServiceProviders[2] // Grok
  }
];

// Simulate the OLD ordering (OperationServiceMapping priority first)
function oldOrdering(mappings) {
  return mappings
    .sort((a, b) => a.priority - b.priority) // OperationServiceMapping priority first
    .map(mapping => mapping.service);
}

// Simulate the NEW ordering (ServiceProvider priority first)
function newOrdering(mappings) {
  return mappings
    .sort((a, b) => {
      // ServiceProvider priority first
      if (a.service.priority !== b.service.priority) {
        return a.service.priority - b.service.priority;
      }
      // Then OperationServiceMapping priority as fallback
      return a.priority - b.priority;
    })
    .map(mapping => mapping.service);
}

console.log('📊 Current Data:');
console.log('ServiceProviders:');
mockServiceProviders.forEach(provider => {
  console.log(`   - ${provider.name}: Priority ${provider.priority}`);
});

console.log('\nOperationServiceMappings for AI_DISCOVERY:');
mockOperationMappings.forEach(mapping => {
  console.log(`   - ${mapping.service.name}: ServiceProvider Priority ${mapping.service.priority}, Mapping Priority ${mapping.priority}`);
});

console.log('\n🔍 Testing OLD Ordering (OperationServiceMapping priority first):');
const oldOrder = oldOrdering([...mockOperationMappings]);
oldOrder.forEach((service, index) => {
  console.log(`   ${index + 1}. ${service.name} (Priority: ${service.priority})`);
});

console.log('\n🔍 Testing NEW Ordering (ServiceProvider priority first):');
const newOrder = newOrdering([...mockOperationMappings]);
newOrder.forEach((service, index) => {
  console.log(`   ${index + 1}. ${service.name} (Priority: ${service.priority})`);
});

console.log('\n✅ Test Results:');
console.log('OLD Ordering would show: Claude (1), OpenAI (2), Grok (3)');
console.log('NEW Ordering will show: OpenAI (1), Claude (2), Grok (2)');
console.log('\n📝 The fix ensures ServiceProvider priorities are used as the primary ordering!');
