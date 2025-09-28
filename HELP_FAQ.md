# LeadMgmt System Help & FAQ

## 🆕 Latest Updates - January 2, 2025

### ✅ **RESOLVED: GitHub Push Protection & API Key Security**

**Problem**: GitHub was blocking all code pushes due to detected API keys in the repository, preventing deployment and collaboration.

**Root Cause**: Legacy utility scripts contained hardcoded API keys that were committed to the repository history.

**Solution**: 
- Removed API key files from entire Git history using `git filter-branch`
- Updated `.gitignore` to prevent future API key commits
- Verified existing API key management system is working correctly
- Preserved all development work while ensuring security

**Status**: ✅ **FIXED** - Repository is now secure and pushes work normally

### 🔐 **API Key Security Best Practices**

**How API Keys Are Managed**:
- API keys are stored in environment variables (`.env` file)
- Database storage with AES-256-CBC encryption as fallback
- No hardcoded keys in application code
- Proper key rotation and management capabilities

**For Developers**:
- Never commit API keys to the repository
- Use environment variables for all sensitive data
- Test files should use placeholder values like "your-api-key-here"
- Utility scripts should be excluded from version control

## Previous Updates - September 28, 2025

### ✅ **RESOLVED: AI Discovery Conversation ID Display Issue**

**Problem**: AI conversations were showing database IDs (like "cmg2upxjz000d6429mbhbf7y1") instead of readable industry names.

**Root Cause**: The conversation message endpoint was missing ID resolution logic that existed in other AI Discovery features.

**Solution**: 
- Added ID resolution to conversation messages endpoint
- AI now receives proper industry names like "Plant-Based Protein Manufacturing"
- Consistent behavior across all AI Discovery features

**Status**: ✅ **FIXED** - Conversations now show proper industry names

### ✅ **RESOLVED: Leads Page 400 Bad Request Error**

**Problem**: Leads page was failing to load with 400 Bad Request errors.

**Root Cause**: Frontend was sending filter data in wrong format (strings instead of arrays for status, strings instead of Date objects for dates).

**Solution**: 
- Updated frontend to send correct data types
- Enhanced filter validation and error handling
- Improved data type consistency

**Status**: ✅ **FIXED** - Leads page now loads correctly

### ✅ **ENHANCED: Scoring Model Industry Selection**

**Problem**: Users couldn't create scoring models for AI Discovery industries (like "Plant-Based Protein Manufacturing") due to limited 5-option dropdown.

**Solution**: 
- **Dynamic Industry List**: Now includes all AI Discovery industries
- **Custom Input**: Enter any industry name manually
- **Auto-Detection**: Automatically set industry from selected campaign
- **Visual Indicators**: Icons show data source (database vs hardcoded)

**Status**: ✅ **ENHANCED** - Unlimited industry support for scoring models

### ✅ **RESOLVED: Customer Search Returning 0 Results** (Previous Fix)

**Problem**: AI Discovery customer search was consistently returning 0 results despite having a robust AI search system.

**Root Cause**: Frontend was passing database IDs (UUIDs) to the backend, but the AI needed human-readable names. The AI was receiving prompts like "Search for customers in uuid-123 / uuid-456" instead of "Search for customers in Healthcare / Medical Devices".

**Solution**: 
- Backend now resolves industry and product vertical IDs to actual names before sending to AI
- Frontend displays proper names in all notifications and messages
- Enhanced notification system with better close buttons and accessibility

**Status**: ✅ **FIXED** - Customer search now returns actual results

---

## 🤖 AI Discovery System

### How does AI Discovery work?

AI Discovery is a multi-step process that helps you find potential customers:

1. **Industry Discovery**: Enter your business description and AI suggests relevant industries
2. **Product Vertical Selection**: Choose specific product categories within your industry
3. **Customer Search**: AI searches for real companies that could be interested in your product
4. **Lead Generation**: Process discovered companies into your lead pipeline

### Why is my customer search returning 0 results?

**Most Common Causes:**
1. **AI Configuration Issues**: Check that your AI engines are properly configured
2. **Database Connectivity**: Ensure the database is running and accessible
3. **Operation Mappings**: Verify that AI engines are mapped to the AI_DISCOVERY operation

**Troubleshooting Steps:**
1. Check the Service Configuration page for AI engine status
2. Verify database connection in the backend logs
3. Ensure operation mappings exist for AI_DISCOVERY
4. Check browser console for error messages

### How do I configure AI engines for discovery?

1. Go to **Service Configuration** (Admin only)
2. Add or edit AI engines (Claude, OpenAI, Grok)
3. Set proper API keys and model names
4. Ensure engines are mapped to AI_DISCOVERY operation
5. Set priorities for failover order

### How do I create scoring models for any industry?

**New Enhanced Process**:
1. Go to **Scoring Models** → **Create New Model**
2. **Choose your input method**:
   - **Select from List**: Choose from all AI Discovery industries + hardcoded options
   - **Enter Custom**: Type any industry name manually
   - **Auto-detect**: Select a campaign to automatically set the industry
3. **Visual Indicators**: 
   - 📊 = Database industry (from AI Discovery)
   - 🔧 = Hardcoded industry (legacy support)
4. **Complete the form** with your scoring criteria
5. **Save** - Your model is now available for any industry!

**Benefits**:
- ✅ Unlimited industry support
- ✅ Seamless integration with AI Discovery
- ✅ Multiple input methods for flexibility
- ✅ Backward compatibility with existing models

### What industries can AI Discovery analyze?

AI Discovery can analyze any industry that the AI engines can understand. Common industries include:
- Healthcare & Medical
- Manufacturing & Industrial
- Technology & Software
- Financial Services
- Construction & Real Estate
- Food & Beverage
- And many more...

### How accurate are the customer search results?

The system uses a multi-tier search strategy:
1. **Primary Search**: Specific criteria with exact industry/product vertical match
2. **Broader Search**: Expanded criteria if primary search returns no results
3. **Industry-Specific Search**: Focus on industry characteristics as final fallback

This maximizes the chances of finding relevant customers while maintaining accuracy.

---

## 🔧 Technical Troubleshooting

### Database Connection Issues

**Symptoms:**
- AI Discovery shows "Fallback Analysis"
- Service Configuration shows connection errors
- Backend logs show database connection failures

**Solutions:**
1. **Check Docker Status**: Ensure PostgreSQL container is running
   ```bash
   docker-compose ps
   ```

2. **Restart Database**: Restart the PostgreSQL service
   ```bash
   docker-compose restart postgres
   ```

3. **Check Environment Variables**: Verify DATABASE_URL in .env file
   ```bash
   # For Docker
   DATABASE_URL="postgresql://dev:devpass@postgres:5432/leadscoring_dev"
   
   # For Local Development
   DATABASE_URL="postgresql://dev:devpass@localhost:5433/leadscoring_dev"
   ```

### AI Engine Configuration Issues

**Symptoms:**
- AI Discovery fails with configuration errors
- Service Configuration shows invalid model names
- API calls return 404 or authentication errors

**Solutions:**
1. **Update Model Names**: Use current model names
   - Claude: `claude-sonnet-4-20250514`
   - OpenAI: `gpt-4` or `gpt-3.5-turbo`
   - Grok: Check current model availability

2. **Verify API Keys**: Ensure API keys are valid and have proper permissions

3. **Check Operation Mappings**: Verify AI engines are mapped to AI_DISCOVERY operation

### Notification System Issues

**Symptoms:**
- Notifications can't be closed
- Notifications show database IDs instead of names
- Toast notifications appear but don't respond to clicks

**Solutions:**
1. **Refresh Browser**: Clear browser cache and refresh
2. **Check Console**: Look for JavaScript errors in browser console
3. **Restart Frontend**: Restart the frontend development server

### Frontend-Backend Communication Issues

**Symptoms:**
- API calls return 401 Unauthorized
- Frontend can't connect to backend
- Authentication tokens not working

**Solutions:**
1. **Check Vite Proxy**: Ensure VITE_API_URL is set to `/api`
2. **Verify Authentication**: Check that user is properly logged in
3. **Check Token Storage**: Verify localStorage contains `bbds_access_token`

---

## 📊 Performance Optimization

### Improving AI Discovery Performance

1. **Database Optimization**:
   - Ensure proper indexes on industry and product vertical tables
   - Monitor query performance for ID resolution
   - Consider caching frequently accessed data

2. **AI API Optimization**:
   - Use appropriate model sizes for different tasks
   - Implement request batching where possible
   - Monitor API rate limits and quotas

3. **Frontend Optimization**:
   - Minimize unnecessary re-renders
   - Implement virtual scrolling for large result sets
   - Cache resolved names to reduce database queries

### Monitoring System Performance

1. **Backend Logs**: Monitor for errors and performance issues
2. **Database Metrics**: Track query performance and connection usage
3. **AI API Usage**: Monitor rate limits and response times
4. **Frontend Performance**: Use browser dev tools to identify bottlenecks

---

## 🔐 Security & Authentication

### API Key Management

**Best Practices:**
1. **Secure Storage**: Store API keys in environment variables, never in code
2. **Key Rotation**: Regularly rotate API keys for security
3. **Access Control**: Limit API key permissions to minimum required
4. **Monitoring**: Monitor API key usage for unusual activity

**Configuration:**
```bash
# .env file
CLAUDE_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key
GROK_API_KEY=your_grok_api_key
```

### User Authentication

**Token Management:**
1. **Automatic Expiration**: Tokens expire after configured time
2. **Secure Storage**: Tokens stored in localStorage with proper security
3. **Role-Based Access**: Different user roles have different permissions

**Troubleshooting:**
1. Clear browser localStorage if authentication issues persist
2. Check backend logs for authentication errors
3. Verify JWT_SECRET is properly configured

---

## 🚀 Advanced Features

### Custom AI Prompts

You can customize AI prompts for better results:

1. **Industry Discovery**: Modify prompts to focus on specific criteria
2. **Customer Search**: Adjust search parameters for better targeting
3. **Response Parsing**: Customize how AI responses are processed

### Integration with Lead Pipeline

**Workflow:**
1. Discover customers using AI Discovery
2. Review and filter results
3. Send to lead pipeline for enrichment
4. Process enriched leads for sales outreach

**Configuration:**
- Set up web scraping for discovered companies
- Configure lead scoring models
- Define enrichment workflows

### Service Configuration Management

**Advanced Features:**
1. **Priority Management**: Set failover order for AI engines
2. **Usage Limits**: Configure rate limits and quotas
3. **Performance Monitoring**: Track service performance and costs
4. **Testing**: Test service configurations before use

---

## 📚 Developer Resources

### API Documentation

**AI Discovery Endpoints:**
- `POST /api/ai-discovery/discover-industries` - Discover industries
- `GET /api/ai-discovery/industries/:id/verticals` - Get product verticals
- `POST /api/ai-discovery/search-customers` - Search for customers
- `POST /api/ai-discovery/customer-insights` - Generate customer insights

**Service Configuration Endpoints:**
- `GET /api/service-configuration/providers` - List service providers
- `POST /api/service-configuration/providers` - Create service provider
- `PUT /api/service-configuration/providers/:id` - Update service provider
- `POST /api/service-configuration/providers/:id/test` - Test service provider

### Database Schema

**Key Tables:**
- `Industry` - Industry information
- `ProductVertical` - Product categories within industries
- `CustomerType` - Customer segments for product verticals
- `ServiceProvider` - AI engines and services
- `OperationServiceMapping` - Links services to operations

### Debugging Tools

**Built-in Diagnostics:**
1. **Service Configuration Page**: Test AI engine connectivity
2. **Browser Console**: Frontend error logging
3. **Backend Logs**: Server-side error tracking
4. **Database Queries**: Direct database access for troubleshooting

**Custom Scripts:**
- `check-database-config.js` - Verify database configuration
- `check-operation-mappings.js` - Check operation mappings
- `test-ai-discovery.js` - Test AI discovery functionality

---

## 🆘 Getting Help

### Support Channels

1. **Documentation**: Check this FAQ and other documentation files
2. **Logs**: Review backend and frontend logs for error details
3. **Console**: Check browser console for JavaScript errors
4. **Database**: Direct database queries for data verification

### Common Error Messages

**"No AI engines available for operation: AI_DISCOVERY"**
- Solution: Check operation mappings in Service Configuration

**"Database connection failed"**
- Solution: Verify Docker containers are running and database is accessible

**"Invalid API key"**
- Solution: Update API keys in Service Configuration

**"Model not found"**
- Solution: Update to current model names in Service Configuration

**"400 Bad Request" on Leads page**
- Solution: This has been fixed - refresh the page. If it persists, check browser console for details

**"Campaign not showing in Pipeline dropdown"**
- Solution: Campaigns must have a scoring model assigned. Create a scoring model first, then assign it to the campaign

**"AI showing database IDs instead of industry names"**
- Solution: This has been fixed - AI conversations now show proper industry names

### Reporting Issues

When reporting issues, please include:
1. **Error Message**: Exact error text
2. **Steps to Reproduce**: Detailed steps to recreate the issue
3. **Environment**: Browser, OS, and system details
4. **Logs**: Relevant backend and frontend logs
5. **Screenshots**: Visual evidence of the issue

---

## 📈 System Status

### Current Status: ✅ **OPERATIONAL**

**All Systems Working:**
- ✅ AI Discovery Customer Search
- ✅ AI Discovery Conversations (with proper industry names)
- ✅ Service Configuration Management
- ✅ Database Connectivity
- ✅ Authentication & Authorization
- ✅ Notification System
- ✅ Web Scraping & Enrichment
- ✅ Leads Page (no more 400 errors)
- ✅ Scoring Model Creation (unlimited industries)

### Recent Fixes (2025-09-28)
- ✅ Fixed AI Discovery conversation ID display issue
- ✅ Fixed Leads page 400 Bad Request error
- ✅ Enhanced scoring model industry selection with unlimited support
- ✅ Added dynamic industry list integration
- ✅ Added custom industry input capability
- ✅ Added campaign auto-detection for scoring models

### Previous Fixes (2025-08-31)
- ✅ Fixed customer search returning 0 results
- ✅ Enhanced notification system with proper close buttons
- ✅ Improved ID resolution for better AI prompts
- ✅ Added comprehensive error handling and logging

### Known Issues
- None currently identified

### Planned Improvements
1. **Performance Monitoring**: Real-time system metrics
2. **Advanced Caching**: Redis-based caching for better performance
3. **Enhanced Analytics**: Detailed usage and performance analytics
4. **Mobile Optimization**: Better mobile device support

---

*This help document is maintained by the development team and updated with each system release. For the latest information, check the CHANGELOG.md and engineering-log.md files.*
