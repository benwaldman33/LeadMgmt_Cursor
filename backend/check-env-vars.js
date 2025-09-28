console.log('=== CHECKING ENVIRONMENT VARIABLES ===\n');

const apiKeyVars = [
  'CLAUDE_API_KEY',
  'OPENAI_API_KEY', 
  'APIFY_API_TOKEN',
  'ENCRYPTION_KEY'
];

apiKeyVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`${varName}: SET`);
    console.log(`  Length: ${value.length}`);
    console.log(`  Starts with: ${value.substring(0, 10)}...`);
    console.log(`  Is placeholder: ${value.includes('your-') || value.includes('placeholder')}`);
  } else {
    console.log(`${varName}: NOT SET`);
  }
  console.log('');
});

console.log('=== ENVIRONMENT CHECK COMPLETE ===');
