# Engineering Log

This document tracks technical notes, decisions, and areas to revisit for the BBDS Project.

---

## 2025-07-11

### Automated Pipeline System Implementation
- **Area:** Pipeline service, WebSocket notifications, database schema, UI components
- **Changes Made:**
  - Implemented `PipelineService` with complete workflow automation
  - Added real-time WebSocket notifications for pipeline progress
  - Created comprehensive UI components: `PipelineForm`, `PipelinePage`, `RawDataViewer`
  - Enhanced database schema to support pipeline job tracking
  - Added pipeline navigation and routing integration
- **Technical Decisions:**
  - Pipeline runs asynchronously with real-time progress updates
  - WebSocket notifications for start, progress, completion, and failure states
  - URL validation with automatic protocol addition (https://)
  - Campaign scoring model validation before pipeline execution
  - Comprehensive error handling with detailed error messages
  - Raw data storage with collapsible UI sections for better UX
- **Architecture:**
  - Pipeline service orchestrates: URL import → Web scraping → Content analysis → Lead scoring
  - Each step is tracked and reported via WebSocket
  - Failed URLs are logged but don't stop the entire pipeline
  - Results include success/failure status, scores, and qualification status
- **Benefits:**
  - Complete automation of lead generation workflow
  - Real-time visibility into processing progress
  - Comprehensive data extraction and storage
  - Scalable architecture for batch processing
- **Files Created/Modified:**
  - `backend/src/services/pipelineService.ts` (new)
  - `backend/src/routes/leads.ts` (pipeline endpoints)
  - `backend/src/services/websocketService.ts` (pipeline notifications)
  - `frontend/src/components/PipelineForm.tsx` (new)
  - `frontend/src/pages/PipelinePage.tsx` (new)
  - `frontend/src/components/RawDataViewer.tsx` (new)
  - `frontend/src/pages/LeadDetailPage.tsx` (raw data integration)
  - `frontend/src/App.tsx` (pipeline routing)
  - `frontend/src/components/DashboardLayout.tsx` (pipeline navigation)

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