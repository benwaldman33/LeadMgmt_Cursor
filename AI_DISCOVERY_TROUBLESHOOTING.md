# AI Discovery Troubleshooting Guide

## Common Issues and Solutions

### 1. Getting "Dummy Data" Instead of AI Results

**Symptoms**: AI Discovery returns only 1 industry (e.g., "Industrial Manufacturing") with `aiEngineUsed: 'Fallback Analysis'`

**Root Causes**:
1. **Claude API Endpoint Bug**: Code doubles `/messages` path
2. **Invalid API Keys**: Placeholder keys in service configuration
3. **Service Configuration Issues**: Wrong model names or endpoints

**Solutions**:

#### Fix Claude API Endpoint
**Problem**: Endpoint becomes `https://api.anthropic.com/v1/messages/messages` (invalid)
**Solution**: Update service configuration endpoint to:
```json
{
  "endpoint": "https://api.anthropic.com/v1"
}
```
**Note**: Remove `/messages` from your endpoint - the code adds it automatically

#### Configure Valid API Keys
1. Go to Service Configuration in admin panel
2. Update Claude AI service with real API key
3. Update OpenAI GPT-4 service with real API key (if using)
4. Ensure keys are not placeholder values like `"your-claude-api-key"`

#### Verify Model Configuration
For Claude 4.5, use:
```json
{
  "model": "claude-3-5-sonnet-20241022"
}
```

### 2. 401 Unauthorized Errors

**Symptoms**: Login fails or API calls return 401 errors

**Solutions**:
1. **Check localStorage keys**: Ensure using `bbds_access_token` and `bbds_user`
2. **Verify login credentials**: Use `admin@bbds.com` / `admin123`
3. **Check token expiration**: Tokens expire after 24 hours
4. **Restart services**: If authentication state is corrupted

### 3. Limited Industry Results

**Symptoms**: Only getting 8 industries instead of more

**Solution**: Use the new configurable limit dropdown
1. Go to AI Discovery page
2. Use "Max Industries" dropdown (5-30 options)
3. Select desired number (e.g., 15 or 20)
4. Click "Discover X Industries"

### 4. Service Configuration Not Updating

**Symptoms**: Changes in Service Configuration panel not taking effect

**Solutions**:
1. **Restart Docker containers**: `docker-compose down && docker-compose up -d`
2. **Check database**: Verify changes saved in `ServiceProvider` table
3. **Clear browser cache**: Hard refresh (Ctrl+F5)
4. **Check logs**: Look for configuration errors in backend logs

## API Key Security

### Storage Location
- **Database**: Encrypted in `ServiceProvider.config` field
- **Environment**: Via `.env` file (excluded from Git)
- **Docker**: Passed via `docker-compose.yml` environment variables

### Security Best Practices
1. **Never commit API keys** to Git
2. **Use environment variables** for production
3. **Rotate keys regularly**
4. **Monitor usage** for unexpected activity
5. **Use least privilege** - limit API key permissions

### Environment Variables
Create `.env` file in project root:
```env
CLAUDE_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here
ENCRYPTION_KEY=your-32-character-encryption-key
```

## Debugging Steps

### 1. Check Backend Logs
```bash
docker logs leadmgmt_cursor-backend-1 --tail 100
```

Look for:
- `[AI Discovery]` messages
- API endpoint construction
- Service selection results
- Error details

### 2. Verify Service Configuration
```bash
docker exec leadmgmt_cursor-backend-1 node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.serviceProvider.findMany().then(services => {
  console.log('Services:', services.map(s => ({name: s.name, isActive: s.isActive})));
  prisma.disconnect();
});
"
```

### 3. Test API Endpoints
```bash
# Test health endpoint
curl http://localhost:3001/health

# Test authentication
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bbds.com","password":"admin123"}'
```

## Performance Considerations

### Industry Limits
- **5-8 industries**: Fast response, focused results
- **15-20 industries**: Comprehensive coverage
- **25-30 industries**: Maximum breadth (slower, more expensive)

### API Costs
- Higher limits = more tokens used = higher costs
- Claude 4.5: ~$0.015 per request
- OpenAI GPT-4: ~$0.03 per request

### Response Times
- 5-8 industries: ~2-5 seconds
- 15-20 industries: ~5-10 seconds  
- 25-30 industries: ~10-20 seconds

## Support

If issues persist:
1. Check this troubleshooting guide
2. Review engineering logs
3. Check backend logs for specific errors
4. Verify service configuration in database
5. Test with minimal configuration first

## Customer Discovery Result Count Issues

### Symptom
- You select 25 (or other number) customers, but only 10 are returned

### Causes
- AI model ignored loosely-worded prompt ("Max Results: N")
- Backend prompt builders fell back to 10 in some paths (now fixed)

### Resolution
- Prompt rewritten to enforce EXACT result count and strict JSON array output
- Backend defaults standardized (50) and route safety cap added (100)

### Verify
1. Select a customer count (e.g., 25) in AI Discovery
2. Click "Search 25 Customers" and confirm results equal 25
3. If still inconsistent, restart backend and try again

### Future Enhancements
- Add post-parse enforcement to re-prompt/fill to exact count if AI under-delivers
