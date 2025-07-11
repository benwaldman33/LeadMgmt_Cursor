# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Project initialized with CHANGELOG.md and engineering-log.md for better documentation and tracking.
- See engineering-log.md for technical notes and areas to revisit.

## [2025-07-11]
### Added
- **Automated Pipeline System**: Complete workflow automation for lead processing
  - Implemented `PipelineService` with full workflow: Import → Scrape → Analyze → Score
  - Added real-time progress tracking and WebSocket notifications
  - Created `PipelineForm` component for URL input and campaign selection
  - Built `PipelinePage` with comprehensive information and step-by-step process
  - Added pipeline navigation and routing in sidebar
  - Support for industry-specific processing and campaign scoring models
  - Comprehensive error handling and validation

- **Raw Data Viewer**: Advanced data visualization for scraped content
  - Created `RawDataViewer` component with collapsible sections
  - Display raw page content, metadata, and structured data
  - Show processing status, timing, and error information
  - Enhanced `LeadDetailPage` to include raw data viewer
  - Support for viewing full scraped content and extracted information

### Enhanced
- **Web Scraping Data Storage**: Significantly enhanced lead enrichment to store comprehensive scraped data
  - Added full page content storage (truncated to 10KB)
  - Store page metadata (title, description, keywords, language, last modified)
  - Capture structured data (company name, services, certifications, contact info)
  - Store processing metadata (success status, timing, errors)
  - Enhanced scoring service to use full scraped content for better accuracy
  - Created new API endpoint `/api/leads/:id/enrichment` for detailed enrichment data
  - Built comprehensive `EnrichmentDetails` component for data visualization
  - Applied database migration for enhanced `LeadEnrichment` model

- **Scoring Model Management**: Complete edit functionality for scoring models
  - Added PUT and DELETE endpoints for scoring models
  - Created `EditScoringModelPage` component with full CRUD operations
  - Added duplicate functionality for scoring models
  - Enhanced `ScoringModelsPage` with delete buttons and better UX
  - Added campaign usage protection for model deletion

### Fixed
- **Lead Import/Export**: Fixed import functionality to use real web scraping
  - Added `express-fileupload` middleware for file uploads
  - Implemented proper CSV import with campaign selection
  - Fixed export functionality to download actual CSV files
  - Added proper error handling and success notifications

## [2025-07-10]
- Added superadmin panel route and sidebar link for SUPER_ADMIN role.
- Patched analytics service to handle null dates gracefully.
- Added campaign detail page and route.
- Improved notification system to use robust unique IDs for toasts.
- Added filter cleaning and type safety to Leads page.
- Updated filter logic to avoid React warnings. 