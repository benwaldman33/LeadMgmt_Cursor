# API Key Management System

## Overview

The LeadMgmt system now uses a secure API key management system that prioritizes environment variables over database storage, ensuring API keys are never committed to Git repositories. This system provides:

- **Environment Variable Priority**: API keys are first loaded from environment variables
- **Database Fallback**: If not found in environment, keys are retrieved from encrypted database storage
- **Encryption**: Database-stored keys are encrypted using AES-256-CBC
- **Git Safety**: Environment files are excluded from Git commits
- **Migration Support**: Tools to migrate existing API keys to the new system

## Security Benefits

### ✅ **Git Repository Safety**
- API keys stored in `.env` files are automatically excluded from Git
- No risk of accidentally committing sensitive keys to version control
- GitHub will not block pushes due to exposed API keys

### ✅ **Environment-Based Configuration**
- Different environments (dev, staging, prod) can use different API keys
- Easy to manage keys across different deployment environments
- No need to modify code for different environments

### ✅ **Encryption for Database Storage**
- Keys stored in database are encrypted using AES-256-CBC
- Encryption key is stored in environment variable
- Fallback system maintains functionality while improving security

## API Key Configuration

### Environment Variable Format

API keys follow this naming convention:
```
{SERVICE_TYPE}_{SERVICE_NAME}_API_KEY
```

**Examples:**
- `AI_ENGINE_CLAUDE_API_KEY` - Claude AI API key
- `SCRAPER_APIFY_API_KEY` - Apify scraper API key
- `AI_ENGINE_OPENAI_API_KEY` - OpenAI API key

### Service Types

- **AI_ENGINE**: AI services like Claude, OpenAI, GPT models
- **SCRAPER**: Web scraping services like Apify
- **SITE_ANALYZER**: Custom website analysis tools
- **KEYWORD_EXTRACTOR**: Keyword extraction services
- **CONTENT_ANALYZER**: Content analysis services

### Configuration Options

Each service can have additional configuration:

```bash
# Basic API Key
AI_ENGINE_CLAUDE_API_KEY="your-api-key-here"

# Model Configuration (for AI engines)
AI_ENGINE_CLAUDE_MODEL="claude-sonnet-4-20250514"
AI_ENGINE_CLAUDE_MAX_TOKENS="4096"
AI_ENGINE_CLAUDE_TEMPERATURE="0.7"

# Capabilities
AI_ENGINE_CLAUDE_CAPABILITIES='["AI_DISCOVERY", "MARKET_DISCOVERY", "KEYWORD_EXTRACTION"]'

# Usage Limits
AI_ENGINE_CLAUDE_MONTHLY_QUOTA="1000"
AI_ENGINE_CLAUDE_CONCURRENT_REQUESTS="5"
AI_ENGINE_CLAUDE_COST_PER_REQUEST="0.03"
```

## Setup Instructions

### 1. Create Environment File

Copy the example environment file:
```bash
cp backend/env.example backend/.env
```

### 2. Add Your API Keys

Edit the `.env` file and add your actual API keys:

```bash
# Claude AI Configuration
AI_ENGINE_CLAUDE_API_KEY="sk-ant-api03-..."

# Apify Scraper Configuration
SCRAPER_APIFY_API_KEY="apify_api_..."

# OpenAI Configuration (if using)
AI_ENGINE_OPENAI_API_KEY="sk-..."
```

### 3. Set Encryption Key

Generate a secure 32-character encryption key:
```bash
ENCRYPTION_KEY="your-32-character-encryption-key-here"
```

### 4. Restart Application

The system will automatically use the new API key configuration.

## Migration from Old System

### Automatic Migration

If you have existing API keys in the database, run the migration script:

```bash
cd backend
npm run migrate:api-keys
```

This will:
1. Find existing API keys in the system configuration
2. Migrate them to the new encrypted database storage
3. Generate an environment file template
4. Show a summary of current API key status

### Manual Migration

If you prefer to migrate manually:

1. **Export existing keys** from the database
2. **Add them to environment variables** in `.env` file
3. **Remove old configuration** from system config table
4. **Restart the application**

## API Key Service Usage

### In Code

```typescript
import APIKeyService from './services/apiKeyService';

// Get API key for a service
const claudeConfig = await APIKeyService.getAPIKey('Claude', 'AI_ENGINE');
if (claudeConfig) {
  const apiKey = claudeConfig.config.apiKey;
  const model = claudeConfig.config.model;
  // Use the configuration...
}

// Store new API key
await APIKeyService.storeAPIKey(
  'CustomAI',
  'AI_ENGINE',
  { apiKey: 'your-key', model: 'gpt-4' },
  ['AI_DISCOVERY', 'LEAD_SCORING'],
  { monthlyQuota: 1000 }
);
```

### Service Configuration

The API key service provides:

- **Caching**: API keys are cached for performance
- **Fallback**: Environment variables → Database → Error
- **Encryption**: Automatic encryption/decryption of database keys
- **Validation**: Service type and capability validation

## Environment File Structure

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:password@postgres:5432/leadmgmt"
REDIS_URL="redis://redis:6379"

# Security
ENCRYPTION_KEY="your-32-character-encryption-key-here"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# API Keys (examples)
AI_ENGINE_CLAUDE_API_KEY="your-claude-api-key"
SCRAPER_APIFY_API_KEY="your-apify-api-token"
AI_ENGINE_OPENAI_API_KEY="your-openai-api-key"
```

### Optional Configuration

```bash
# Service-specific settings
AI_ENGINE_CLAUDE_MODEL="claude-sonnet-4-20250514"
AI_ENGINE_CLAUDE_MAX_TOKENS="4096"
AI_ENGINE_CLAUDE_TEMPERATURE="0.7"

# Capabilities and limits
AI_ENGINE_CLAUDE_CAPABILITIES='["AI_DISCOVERY", "MARKET_DISCOVERY"]'
AI_ENGINE_CLAUDE_MONTHLY_QUOTA="1000"
AI_ENGINE_CLAUDE_CONCURRENT_REQUESTS="5"
```

## Troubleshooting

### Common Issues

**1. "API key not configured" error**
- Check that your `.env` file exists and contains the correct API key
- Verify the environment variable name follows the correct format
- Ensure the application was restarted after adding the key

**2. "Encryption key not set" error**
- Set the `ENCRYPTION_KEY` environment variable
- Use a 32-character string for the encryption key
- Restart the application after setting the key

**3. Database fallback not working**
- Check that the API key exists in the `service_providers` table
- Verify the service name and type match exactly
- Check database connection and permissions

### Debugging

Enable debug logging to see API key resolution:

```bash
LOG_LEVEL="debug"
ENABLE_DEBUG_LOGGING="true"
```

### Testing API Keys

Test your API key configuration:

```bash
# Test Claude API key
curl -H "x-api-key: YOUR_CLAUDE_API_KEY" \
     -H "Content-Type: application/json" \
     -H "anthropic-version: 2023-06-01" \
     -d '{"model":"claude-sonnet-4-20250514","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}' \
     https://api.anthropic.com/v1/messages

# Test Apify API key
curl -H "Authorization: Bearer YOUR_APIFY_API_KEY" \
     https://api.apify.com/v2/users/me
```

## Best Practices

### Security

1. **Never commit `.env` files** to version control
2. **Use strong encryption keys** (32+ characters, random)
3. **Rotate API keys regularly** (every 90 days)
4. **Use different keys** for different environments
5. **Monitor API key usage** and set appropriate limits

### Configuration

1. **Use environment variables** for all sensitive data
2. **Set appropriate quotas** to prevent unexpected charges
3. **Configure capabilities** based on actual service features
4. **Test configurations** before deploying to production
5. **Document key purposes** and access levels

### Deployment

1. **Use CI/CD secrets** for production API keys
2. **Validate environment** before application startup
3. **Monitor key usage** and error rates
4. **Have fallback keys** for critical services
5. **Regular security audits** of key access and usage

## File Structure

```
backend/
├── .env                    # Environment variables (gitignored)
├── env.example            # Environment template
├── src/
│   ├── services/
│   │   └── apiKeyService.ts    # API key management service
│   └── scripts/
│       └── migrateApiKeys.ts    # Migration script
└── package.json
```

## Migration Checklist

- [ ] Copy `env.example` to `.env`
- [ ] Add actual API keys to `.env` file
- [ ] Set `ENCRYPTION_KEY` environment variable
- [ ] Run migration script: `npm run migrate:api-keys`
- [ ] Verify API keys are working
- [ ] Remove old API key configuration from database
- [ ] Test all services that use API keys
- [ ] Update deployment scripts to include environment variables

## Support

For issues with API key management:

1. Check the application logs for detailed error messages
2. Verify environment variable names and values
3. Test API keys directly with the service providers
4. Review the migration script output for any issues
5. Check database connectivity and permissions

---
*Last Updated: 2025-08-31*
*API Key Management Version: 1.0*
