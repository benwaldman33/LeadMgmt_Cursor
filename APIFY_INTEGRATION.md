# Apify Integration for BBDS Lead Scoring Platform

This document describes how to integrate your Apify Actors with the BBDS Lead Scoring Platform.

## Overview

The Apify integration allows you to:
- Configure and manage Apify Actors for web scraping
- Run scraping jobs using your custom Apify Actors
- Store and retrieve scraping results
- Integrate scraping results with the lead scoring system

## Setup

### 1. Prerequisites

- Apify account with API token
- Apify Actors configured for web scraping
- BBDS platform running locally or deployed

### 2. Environment Variables

Add the following to your `.env` file:

```env
# Encryption key for API tokens (change in production)
ENCRYPTION_KEY=your-encryption-key-change-in-production
```

### 3. Database Migration

Run the database migration to create the Apify tables:

```bash
cd backend
npx prisma db push
```

## Usage

### 1. Configure Apify Actors

1. Navigate to the **Apify Integration** page in the BBDS platform
2. Click **Add Actor** to create a new Apify Actor configuration
3. Fill in the required fields:
   - **Name**: Descriptive name for your actor
   - **Actor ID**: Your Apify Actor ID (e.g., `abc123`)
   - **API Token**: Your Apify API token
   - **Description**: Optional description
   - **Default Input**: Optional default configuration

### 2. Test Actor Configuration

1. After creating an actor configuration, click the test button (gear icon)
2. The system will verify the actor ID and API token
3. You'll receive a success/error notification

### 3. Run Scraping Jobs

1. Select an Apify Actor from the list
2. Enter URLs to scrape (one per line)
3. Select the industry (optional)
4. Click **Start Scraping**
5. Monitor the job progress and results

## API Endpoints

### Actor Management

- `GET /api/apify/actors` - Get all configured actors
- `POST /api/apify/actors` - Create new actor configuration
- `POST /api/apify/test` - Test actor configuration

### Scraping Jobs

- `POST /api/apify/scrape` - Start a scraping job
- `GET /api/apify/jobs/:jobId` - Get job status and results
- `POST /api/apify/run` - Run actor with custom input
- `GET /api/apify/runs/:runId` - Get run status

## Data Structure

### ApifyActor Model

```typescript
interface ApifyActor {
  id: string;
  name: string;
  description?: string;
  actorId: string;
  apiToken: string; // Encrypted
  isActive: boolean;
  defaultInput?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### ApifyScrapingJob Model

```typescript
interface ApifyScrapingJob {
  id: string;
  actorId: string;
  urls: string[];
  industry: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: ApifyScrapingResult[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  apifyRunId?: string;
}
```

### ApifyScrapingResult Model

```typescript
interface ApifyScrapingResult {
  url: string;
  success: boolean;
  content: string;
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    language: string;
    lastModified?: string;
  };
  structuredData: {
    companyName?: string;
    industry?: string;
    services?: string[];
    technologies?: string[];
    certifications?: string[];
    contactInfo?: {
      email?: string;
      phone?: string;
      address?: string;
    };
  };
  error?: string;
  timestamp: Date;
  processingTime: number;
  source: 'apify';
  actorId: string;
}
```

## Security

- API tokens are encrypted using AES-256-CBC before storage
- All endpoints require authentication
- Audit logging tracks all actor runs and failures

## Integration with Lead Scoring

Scraping results can be integrated with the lead scoring system:

1. **Content Analysis**: Use scraped content for AI scoring
2. **Contact Information**: Extract and store contact details
3. **Company Information**: Store company names, services, technologies
4. **Industry Classification**: Use industry-specific scoring models

## Troubleshooting

### Common Issues

1. **Actor not found**: Verify the actor ID and API token
2. **Scraping fails**: Check actor configuration and input parameters
3. **Timeout errors**: Increase timeout settings for large scraping jobs
4. **Rate limiting**: Respect Apify's rate limits and quotas

### Debugging

1. Check the audit logs for detailed error information
2. Monitor job status and progress
3. Verify actor configuration with test endpoint
4. Check Apify dashboard for run status and logs

## Example Usage

### Creating an Actor Configuration

```bash
curl -X POST http://localhost:3001/api/apify/actors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Dental Website Scraper",
    "description": "Scrapes dental practice websites",
    "actorId": "abc123",
    "apiToken": "apify_api_...",
    "isActive": true,
    "defaultInput": {
      "maxRequestsPerCrawl": 10,
      "maxConcurrency": 5
    }
  }'
```

### Running a Scraping Job

```bash
curl -X POST http://localhost:3001/api/apify/scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "actorId": "actor_config_id",
    "urls": [
      "https://example-dental.com",
      "https://another-dental.com"
    ],
    "industry": "dental"
  }'
```

## Support

For issues or questions about the Apify integration:

1. Check the audit logs for error details
2. Verify your Apify Actor configuration
3. Test the integration with the provided endpoints
4. Review the Apify documentation for actor-specific issues
