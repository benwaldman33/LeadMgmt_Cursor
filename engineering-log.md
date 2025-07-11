# Engineering Log

This document tracks technical notes, decisions, and areas to revisit for the BBDS Project.

---

## 2025-07-11

### Enhanced Web Scraping Data Storage
- **Area:** Database schema, lead enrichment, scoring service
- **Changes Made:**
  - Enhanced `LeadEnrichment` model with comprehensive scraped data storage
  - Added fields: `scrapedContent`, `pageTitle`, `pageDescription`, `pageKeywords`, `pageLanguage`, `lastModified`, `companyName`, `services`, `certifications`, `contactEmail`, `contactPhone`, `contactAddress`, `processingTime`, `scrapingSuccess`, `scrapingError`
  - Updated lead enrichment endpoints to store all scraped data
  - Enhanced scoring service to use full scraped content for better accuracy
  - Created new API endpoint `/api/leads/:id/enrichment` for detailed enrichment data
  - Built `EnrichmentDetails` component for comprehensive data visualization
- **Technical Decisions:**
  - Content truncated to 10KB for database storage efficiency
  - JSON fields used for arrays (technologies, services, certifications, keywords)
  - Processing metadata stored for quality assessment
  - Contact information extracted and stored separately from Contact model
- **Benefits:**
  - Significantly improved lead scoring accuracy using full content
  - Rich lead profiles with technology stack and service information
  - Automatic contact discovery from websites
  - Better data quality assessment through processing metadata
- **Migration:** Applied migration `20250711015906_enhance_lead_enrichment_storage`

---

## 2025-07-10

### Notification ID Uniqueness (frontend/src/contexts/NotificationContext.tsx)
- Notification IDs for toasts are generated using `crypto.randomUUID()` if available, or a fallback using `Date.now()` and a random string.
- This approach is highly robust, but not mathematically guaranteed to be collision-free.
- **NOTE:** If absolute uniqueness is ever required, revisit this logic to add a collision check or use a more robust ID generation strategy.

---

## Template for Future Notes

### [Date]
- **Area:** [File or feature]
- **Note/Decision:** [Description]
- **Action/Follow-up:** [If any] 