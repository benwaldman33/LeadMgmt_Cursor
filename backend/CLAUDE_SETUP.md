# Claude API Setup Guide

This guide will help you set up Claude API integration for real-time AI scoring in the BBDS platform.

## Prerequisites

1. **Anthropic Account**: You need an account at [console.anthropic.com](https://console.anthropic.com/)
2. **API Key**: Generate an API key from your Anthropic console
3. **Admin User**: Ensure you have a SUPER_ADMIN user in the system

## Quick Setup

Run the automated setup script:

```bash
cd backend
npm run setup:claude
```

This script will:
- Prompt for your Claude API key
- Let you choose a model (Sonnet recommended)
- Configure token limits
- Test the connection
- Save all settings to the database

## Manual Setup

If you prefer manual configuration:

### 1. Get Your API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to "API Keys"
4. Create a new API key
5. Copy the key (it starts with `sk-ant-`)

### 2. Configure the System

You can configure Claude settings through the database or API:

#### Via Database (Direct)
```sql
INSERT INTO system_configs (id, key, value, description, isEncrypted, category, createdById, createdAt, updatedAt)
VALUES 
  ('claude_api_key', 'CLAUDE_API_KEY', 'your-api-key-here', 'Claude API Key for AI scoring', 1, 'AI', 'admin-user-id', NOW(), NOW()),
  ('claude_model', 'CLAUDE_MODEL', 'claude-3-sonnet-20240229', 'Claude model to use', 0, 'AI', 'admin-user-id', NOW(), NOW()),
  ('claude_max_tokens', 'CLAUDE_MAX_TOKENS', '4000', 'Maximum tokens per request', 0, 'AI', 'admin-user-id', NOW(), NOW());
```

#### Via API
```bash
curl -X POST http://localhost:3001/api/admin/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "key": "CLAUDE_API_KEY",
    "value": "your-api-key-here",
    "description": "Claude API Key for AI scoring",
    "isEncrypted": true,
    "category": "AI"
  }'
```

## Available Models

| Model | Speed | Cost | Use Case |
|-------|-------|------|----------|
| `claude-3-sonnet-20240229` | Medium | Medium | **Recommended** - Balanced performance |
| `claude-3-haiku-20240307` | Fast | Low | Quick responses, cost-effective |
| `claude-3-opus-20240229` | Slow | High | Most capable, complex analysis |

## Testing the Connection

### Via API
```bash
curl -X GET http://localhost:3001/api/ai-scoring/test-connection \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Via Frontend
1. Go to AI Scoring page
2. Click "Configuration" tab
3. Click "Test Connection" button

## Usage Tracking

The system automatically tracks:
- Total API calls
- Token usage
- Response times
- Error rates
- Cost estimates

View usage statistics in the AI Scoring Configuration panel.

## Rate Limiting

The system includes built-in rate limiting:
- **50 requests per minute** (Claude's limit)
- Automatic retry logic
- Error handling for rate limit exceeded

## Security

- API keys are encrypted in the database
- Keys are never logged or exposed in responses
- All requests are authenticated
- Usage is tracked for monitoring

## Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Run the setup script: `npm run setup:claude`
   - Check if the key is saved in the database

2. **"Rate limit exceeded"**
   - Wait 1 minute before making another request
   - Check usage statistics in the configuration panel

3. **"Connection failed"**
   - Verify your API key is correct
   - Check your internet connection
   - Ensure the backend is running

4. **"Model not found"**
   - Verify the model name is correct
   - Check if you have access to the selected model

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
export DEBUG_CLAUDE=true
```

This will show detailed API request/response logs.

## Cost Optimization

1. **Use Haiku for simple tasks**: Faster and cheaper
2. **Limit max tokens**: Set appropriate limits per request
3. **Monitor usage**: Check the usage statistics regularly
4. **Cache responses**: The system caches similar requests

## Support

For issues with:
- **API Key**: Contact Anthropic support
- **System Integration**: Check the logs and configuration
- **Usage/Billing**: Check your Anthropic console

## Next Steps

After setup:
1. Test the connection
2. Configure scoring criteria
3. Set up automated workflows
4. Monitor usage and performance 