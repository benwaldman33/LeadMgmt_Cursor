const crypto = require('crypto');

// Test encryption key and decryption
function testEncryption() {
  console.log('=== Testing Encryption/Decryption ===\n');
  
  // Check environment variable
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
  console.log('Encryption Key:', encryptionKey === 'default-key' ? 'DEFAULT (WARNING!)' : 'Custom key');
  console.log('Key Length:', encryptionKey.length);
  
  // Test with the actual encrypted value from database
  const encryptedValue = 'sk-ant-api03-YSYsm7r3bUwnmRh_z...'; // This is what we saw in the DB
  
  try {
    // Try to decrypt with current key
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    console.log('Generated key length:', key.length);
    
    // The encrypted value should be in format: iv:encrypted
    // But we're seeing the raw API key, which suggests it wasn't properly encrypted
    
    console.log('\nEncrypted value analysis:');
    console.log('  - Value:', encryptedValue);
    console.log('  - Contains colon separator:', encryptedValue.includes(':'));
    console.log('  - Looks like API key:', encryptedValue.startsWith('sk-ant-'));
    
    if (encryptedValue.startsWith('sk-ant-')) {
      console.log('  - This appears to be a raw API key, not encrypted');
      console.log('  - The system should return this as-is');
    }
    
  } catch (error) {
    console.error('Encryption test failed:', error);
  }
}

testEncryption();
