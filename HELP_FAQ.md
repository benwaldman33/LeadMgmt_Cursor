# BBDS Universal Lead Scoring Platform - Help & FAQ

## Table of Contents
1. [Getting Started](#getting-started)
2. [Service Configuration](#service-configuration)
3. [Lead Management](#lead-management)
4. [AI Discovery](#ai-discovery)
5. [Troubleshooting](#troubleshooting)

## Getting Started

### What is BBDS?
BBDS (Business Business Development System) is a comprehensive lead scoring and market discovery platform that combines AI-powered analysis with web scraping to identify and qualify business opportunities.

### How do I access the platform?
1. Navigate to the login page
2. Enter your credentials
3. If you don't have an account, contact your system administrator

---

## Service Configuration

### Overview
The Service Configuration panel allows administrators to manage AI engines, scrapers, and other service providers that power the platform's capabilities.

### Dual Interface System

The Service Configuration panel now offers two input modes for maximum flexibility:

#### **Form View (Recommended for New Users)**
- **Clean, structured forms** with type-specific fields
- **Checkbox-based capability selection** for easy configuration
- **Type-specific configuration fields** that adapt to your service type
- **Common limits section** for quotas and concurrency settings
- **Scraping configuration** for applicable service types

#### **JSON View (Advanced Users)**
- **Raw JSON input** for users who prefer direct configuration
- **Dynamic placeholders** that change based on selected service type
- **Template buttons** to quickly populate fields with examples
- **JSON validation** with visual feedback and error handling

### Service Types

#### **AI_ENGINE**
- **Use Case**: AI-powered services like Claude, OpenAI, GPT models
- **Capabilities**: AI_DISCOVERY, MARKET_DISCOVERY, KEYWORD_EXTRACTION, CONTENT_ANALYSIS, LEAD_SCORING
- **Configuration Fields**: API Key, Model, Max Tokens, Temperature
- **Example**: Claude AI, OpenAI GPT-4

#### **SCRAPER**
- **Use Case**: Web scraping services like Apify
- **Capabilities**: WEB_SCRAPING, SITE_ANALYSIS
- **Configuration Fields**: API Token, Default Actor, Max Concurrency
- **Example**: Apify Web Scraper

#### **SITE_ANALYZER**
- **Use Case**: Custom website analysis tools
- **Capabilities**: SITE_ANALYSIS, KEYWORD_EXTRACTION
- **Configuration Fields**: Max Concurrency, Timeout, User Agent
- **Example**: Custom Site Analyzer

#### **CONTENT_ANALYZER**
- **Use Case**: Content analysis and lead scoring services
- **Capabilities**: CONTENT_ANALYSIS, LEAD_SCORING
- **Configuration Fields**: Scoring Model, Confidence Threshold, Max Analysis Time
- **Example**: Lead Scoring AI

### Configuration Fields

#### **Capabilities Field (Required)**
Define which operations this service can handle using checkboxes or JSON:

**Available Operations:**
- `AI_DISCOVERY` - AI-powered lead discovery
- `MARKET_DISCOVERY` - Market research and analysis  
- `WEB_SCRAPING` - Web data extraction
- `SITE_ANALYSIS` - Full website analysis
- `KEYWORD_EXTRACTION` - Keyword identification
- `CONTENT_ANALYSIS` - Content analysis and insights
- `LEAD_SCORING` - Lead quality scoring

**Example JSON:**
```json
["AI_DISCOVERY", "MARKET_DISCOVERY", "KEYWORD_EXTRACTION"]
```

#### **Configuration Field (Required - JSON Format)**
Service-specific configuration parameters:

**AI_ENGINE Example:**
```json
{
  "apiKey": "your-api-key",
  "model": "gpt-4",
  "maxTokens": 4096,
  "temperature": 0.7
}
```

**SCRAPER Example:**
```json
{
  "apiToken": "your-apify-api-token",
  "defaultActor": "apify/web-scraper",
  "maxConcurrency": 10
}
```

#### **Limits Field (Required - JSON Format)**
Service usage limits and quotas:

**Example:**
```json
{
  "monthlyQuota": 1000,
  "concurrentRequests": 5,
  "costPerRequest": 0.03
}
```

#### **Scraping Config Field (Optional - JSON Format)**
For services that support web scraping:

**Example:**
```json
{
  "maxDepth": 3,
  "maxPages": 100,
  "respectRobotsTxt": true,
  "requestDelay": 1000
}
```

### Testing Service Providers

Each service provider now includes a **Test** button that:
- **Verifies connectivity** to the service
- **Tests basic functionality** with a simple API call
- **Provides feedback** on success or failure
- **Helps troubleshoot** configuration issues

**To test a service:**
1. Click the **Test** button next to any service provider
2. Wait for the test to complete
3. Review the results in the popup dialog
4. Fix any configuration issues if the test fails

### Operation Mappings

#### Overview
Operation Mappings connect specific operations (like AI Discovery) to service providers, allowing you to control which services handle which tasks.

#### Configuration Fields

**Operation** (Required)
- Select from available operations (AI_DISCOVERY, MARKET_DISCOVERY, etc.)

**Service Provider** (Required)
- Choose from configured service providers
- Only shows providers with matching capabilities

**Priority** (Required)
- Lower numbers = higher priority
- Used for load balancing and failover

**Configuration** (Required - JSON Format)
- Operation-specific configuration
- Can override service provider defaults

**Example:**
```json
{
  "customConfig": "value",
  "timeout": 30000,
  "maxRetries": 3
}
```

### Usage Statistics

#### Overview
The Usage Statistics tab provides insights into service usage, costs, and performance.

#### What's Tracked
- **Token Usage**: Input/output tokens for AI services
- **Request Counts**: Number of API calls made
- **Cost Tracking**: Estimated costs based on usage
- **Performance Metrics**: Response times, success rates
- **Service Health**: Uptime and error rates

---

## Lead Management

### How do I create a new lead?
1. Navigate to Leads → Create Lead
2. Fill in the required information
3. Select a campaign
4. Click "Create Lead"

### How do I import leads?
1. Navigate to Leads → Import/Export
2. Upload a CSV file with lead data
3. Map the columns to lead fields
4. Select a campaign
5. Click "Import Leads"

### How do I score leads?
1. Navigate to Scoring → Scoring Models
2. Create or select a scoring model
3. Apply the model to your leads
4. View scores in the Leads table

---

## AI Discovery

### What is AI Discovery?
AI Discovery uses artificial intelligence to automatically find and qualify potential leads based on your industry and product verticals.

### How do I use AI Discovery?
1. Navigate to AI Discovery
2. Select your industry
3. Choose product verticals
4. Start the discovery process
5. Review and approve discovered leads

---

## Troubleshooting

### Authentication & API Access Issues

#### Q: I'm getting 401 Unauthorized errors when trying to access the Apify Integration page
**A:** This issue has been resolved in the latest update. The problem was caused by:
- Incorrect environment variable configuration (`VITE_API_URL` pointing directly to backend)
- Inconsistent token key usage across services
- Multiple PrismaClient instances causing database connection issues

**Solution:** The system now:
- Uses proper Vite proxy configuration (`/api` → backend)
- Standardizes token handling with `bbds_access_token` key
- Consolidates database connections through shared PrismaClient

#### Q: My existing Apify scraper isn't showing up in the Apify Integration page
**A:** This was caused by the authentication issues above. Your existing scrapers are stored in the database and should now be visible after the fixes.

#### Q: I'm seeing database connection errors in the console
**A:** The system now uses a consolidated PrismaClient instance. If you still see errors:
1. Ensure the backend server is running (`npm run dev` in backend directory)
2. Check that PostgreSQL is running on port 5433
3. Verify the `.env` file has correct `DATABASE_URL`

### General Issues

#### Q: How do I start the development environment?
**A:** 
1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Ensure PostgreSQL is running (Docker or local)

#### Q: How do I access the system?
**A:** 
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Default admin credentials: admin@bbds.com / [your password]

## Previous FAQ Content

### Service Configuration

#### Q: How do I configure a new AI service provider?
**A:** 
1. Go to Service Configuration page
2. Click "Add New Provider"
3. Select type (AI_ENGINE, SCRAPER, etc.)
4. Fill in required fields
5. Use templates for quick setup

#### Q: How do I test a service provider?
**A:** 
1. In Service Configuration, click the "Test" button for your provider
2. The system will verify connectivity and functionality
3. Check the test results for any issues

### Market Discovery

#### Q: How do I start a market discovery process?
**A:** 
1. Go to Market Discovery page
2. Click "Start New Discovery"
3. Configure your search parameters
4. Monitor progress in real-time
5. View results and insights

## Need More Help?

If you encounter issues not covered here:
1. Check the console for error messages
2. Review the CHANGELOG for recent fixes
3. Check the engineering log for technical details
4. Ensure all services are running properly

---

*This help guide is regularly updated to reflect the latest features and capabilities of the BBDS Universal Lead Scoring Platform. For the most current information, please refer to the online documentation or contact your system administrator.*
