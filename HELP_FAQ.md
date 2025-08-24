# Lead Management System - Help & FAQ

## Table of Contents
1. [Service Configuration](#service-configuration)
2. [AI Discovery](#ai-discovery)
3. [Market Discovery](#market-discovery)
4. [Web Scraping](#web-scraping)
5. [Lead Management](#lead-management)
6. [User Management](#user-management)
7. [Troubleshooting](#troubleshooting)

---

## Service Configuration

### Overview
The Service Configuration panel allows superadmins to manage AI engines, scrapers, and service mappings for different operations. This is where you configure which services are available for AI discovery, market research, web scraping, and lead analysis.

### Access Requirements
- **Role**: SUPER_ADMIN only
- **Login**: Use `admin@bbds.com` with password `password123`
- **Location**: Dashboard → Service Configuration tab

---

### Service Provider Configuration

#### Basic Fields

**Name** (Required)
- Descriptive name for the service (e.g., "Claude AI", "Grok AI", "Apify Scraper")

**Type** (Required)
- `AI_ENGINE` - AI language models (Claude, GPT-4, Grok)
- `SCRAPER` - Web scraping services (Apify, ScrapingBee)
- `SITE_ANALYZER` - Full website analysis tools
- `KEYWORD_EXTRACTOR` - Keyword extraction services
- `CONTENT_ANALYZER` - Content analysis services

**Priority** (Required)
- Lower numbers = higher priority
- Used for load balancing and failover
- Example: Claude = 1, GPT-4 = 2, Grok = 3

#### Configuration Field (Required - JSON Format)

This field contains the API configuration for the service. **Must be valid JSON**.

##### AI Engine Examples:

**Claude AI:**
```json
{
  "apiKey": "your-anthropic-api-key",
  "endpoint": "https://api.anthropic.com/v1/messages",
  "model": "claude-3-sonnet-20240229"
}
```

**OpenAI GPT-4:**
```json
{
  "apiKey": "your-openai-api-key",
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "model": "gpt-4"
}
```

**Grok AI:**
```json
{
  "apiKey": "xai-your-grok-api-key",
  "endpoint": "https://api.x.ai/v1/chat/completions",
  "model": "grok-beta"
}
```

##### Web Scraping Service Examples:

**Apify:**
```json
{
  "apiKey": "your-apify-api-key",
  "endpoint": "https://api.apify.com/v2/acts/ACTOR_ID/runs",
  "timeout": 30000
}
```

**Custom Scraper:**
```json
{
  "apiKey": "your-api-key",
  "endpoint": "https://your-scraper-service.com/api/v1/scrape",
  "timeout": 60000
}
```

#### Limits Field (Required - JSON Format)

Define usage limits and quotas for the service.

**Example:**
```json
{
  "monthlyQuota": 1000,
  "concurrentRequests": 5,
  "rateLimit": "100 requests per minute",
  "maxTokensPerRequest": 4000
}
```

**Common Limit Fields:**
- `monthlyQuota` - Total requests per month
- `concurrentRequests` - Simultaneous requests allowed
- `rateLimit` - Requests per time period
- `maxTokensPerRequest` - Maximum tokens per AI request
- `dailyBudget` - Maximum daily cost

#### Scraping Configuration (Optional - JSON Format)

**Only required for services that crawl websites.** Controls how web scraping behaves.

**Basic Scraping Config:**
```json
{
  "maxDepth": 3,
  "maxPages": 100,
  "delay": 1000
}
```

**Advanced Scraping Config:**
```json
{
  "maxDepth": 2,
  "maxPages": 50,
  "delay": 2000,
  "concurrent": 3,
  "respectRobotsTxt": true,
  "followRedirects": true,
  "includeImages": false,
  "includeCSS": false,
  "includeJS": false,
  "minContentLength": 100,
  "allowedDomains": ["example.com"],
  "excludedPaths": ["/admin/*", "/private/*"],
  "customSelectors": {
    "companyName": "h1.company-title",
    "contactInfo": "div.contact-details",
    "industry": "span.industry-tag"
  }
}
```

**Scraping Configuration Parameters:**

| Parameter | Description | Example Value |
|-----------|-------------|---------------|
| `maxDepth` | How many levels deep to crawl | 3 |
| `maxPages` | Maximum pages to scrape | 100 |
| `delay` | Milliseconds between requests | 1000 |
| `concurrent` | Simultaneous requests | 5 |
| `respectRobotsTxt` | Follow website crawling rules | true |
| `followRedirects` | Follow HTTP redirects | true |
| `includeImages` | Download image content | false |
| `minContentLength` | Minimum text content length | 100 |
| `allowedDomains` | Domains to allow crawling | ["example.com"] |
| `excludedPaths` | Paths to exclude | ["/admin/*"] |
| `customSelectors` | CSS selectors for specific content | See examples above |

#### Capabilities Field (Required - JSON Format)

Define which operations this service can handle.

**Example:**
```json
["AI_DISCOVERY", "MARKET_DISCOVERY", "WEB_SCRAPING"]
```

**Available Operations:**
- `AI_DISCOVERY` - AI-powered lead discovery
- `MARKET_DISCOVERY` - Market research and analysis
- `WEB_SCRAPING` - Web data extraction
- `SITE_ANALYSIS` - Full website analysis
- `KEYWORD_EXTRACTION` - Keyword identification
- `CONTENT_ANALYSIS` - Content analysis and insights
- `LEAD_SCORING` - Lead quality scoring

---

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

---

### Usage Statistics

#### Overview
The Usage Statistics tab provides insights into service usage, costs, and performance.

#### What's Tracked
- **Token Usage**: Input/output tokens for AI services
- **Request Counts**: Number of API calls made
- **Cost Tracking**: Estimated costs based on usage
- **Performance Metrics**: Response times, success rates
- **Service Health**: Uptime and error rates

#### Usage Data Structure Example
```json
{
  "usage": {
    "prompt_tokens": 37,
    "completion_tokens": 530,
    "total_tokens": 800,
    "prompt_tokens_details": {
      "text_tokens": 37,
      "audio_tokens": 0,
      "image_tokens": 0,
      "cached_tokens": 8
    },
    "completion_tokens_details": {
      "reasoning_tokens": 233,
      "audio_tokens": 0,
      "accepted_prediction_tokens": 0,
      "rejected_prediction_tokens": 0
    },
    "num_sources_used": 0
  }
}
```

---

### Common Configuration Patterns

#### AI Service Pattern
```json
{
  "name": "Service Name",
  "type": "AI_ENGINE",
  "priority": 1,
  "capabilities": ["AI_DISCOVERY", "MARKET_DISCOVERY"],
  "config": {
    "apiKey": "your-api-key",
    "endpoint": "https://api.service.com/v1/endpoint",
    "model": "model-name"
  },
  "limits": {
    "monthlyQuota": 1000,
    "concurrentRequests": 5,
    "maxTokensPerRequest": 4000
  }
}
```

#### Scraping Service Pattern
```json
{
  "name": "Scraper Name",
  "type": "SCRAPER",
  "priority": 1,
  "capabilities": ["WEB_SCRAPING", "SITE_ANALYSIS"],
  "config": {
    "apiKey": "your-api-key",
    "endpoint": "https://api.scraper.com/v1/scrape"
  },
  "limits": {
    "monthlyQuota": 500,
    "concurrentRequests": 3
  },
  "scrapingConfig": {
    "maxDepth": 2,
    "maxPages": 50,
    "delay": 1000,
    "respectRobotsTxt": true
  }
}
```

---

### Best Practices

#### 1. API Key Security
- Never commit API keys to version control
- Use environment variables for production
- Rotate keys regularly

#### 2. Rate Limiting
- Set realistic rate limits to avoid being blocked
- Use delays in scraping configurations
- Monitor usage to stay within quotas

#### 3. Service Prioritization
- Set primary services to priority 1
- Use secondary services for failover
- Consider cost vs. performance trade-offs

#### 4. Configuration Validation
- Always validate JSON before saving
- Test configurations with small requests first
- Monitor error rates and adjust accordingly

---

### Troubleshooting

#### Common Issues

**Duplicate Sidebar Issue** ✅ **RESOLVED**
- **Problem**: Two identical left navigation sidebars appear on Service Configuration page
- **Cause**: Component rendering issue (double-wrapped layout components)
- **Solution**: Issue has been fixed - you should now see only one sidebar
- **If duplicates persist**: Refresh page, clear cache, or contact support

**"Invalid JSON format" Error**
- Check for missing quotes, commas, or brackets
- Use a JSON validator tool
- Ensure all strings are properly quoted

**Service Not Responding**
- Verify API key is correct
- Check endpoint URL format
- Confirm service is active and not rate-limited

**High Error Rates**
- Review rate limiting settings
- Check service health status
- Verify API quotas haven't been exceeded

**Service Provider Not Deleting** ✅ **RESOLVED**
- **Problem**: Delete confirmation appears but provider isn't actually deleted
- **Cause**: Foreign key constraints preventing deletion
- **Solution**: Cascade delete implemented - providers now delete successfully with related records

#### Getting Help
- Check the console for error messages
- Verify service provider documentation
- Contact system administrator for access issues

---

## AI Discovery

*[Section to be expanded as we develop the AI Discovery features]*

---

## Market Discovery

*[Section to be expanded as we develop the Market Discovery features]*

---

## Web Scraping

*[Section to be expanded as we develop the Web Scraping features]*

---

## Lead Management

*[Section to be expanded as we develop the Lead Management features]*

---

## User Management

*[Section to be expanded as we develop the User Management features]*

---

## Troubleshooting

*[Section to be expanded as we encounter and resolve issues]*

---

## Document Version
- **Version**: 1.0
- **Last Updated**: [Current Date]
- **Updated By**: [Your Name/Team]

---

*This documentation is a living document and will be updated as new features are developed and new questions arise.*
