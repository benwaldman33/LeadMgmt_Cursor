# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- **Self-Prompting AI Analysis**: Enhanced AI Discovery with autonomous analytical capabilities
  - Modified `generateCustomerInsights()` to use self-prompting analysis instead of static information
  - Added `buildSelfPromptingAnalysisPrompt()` that makes AI ask itself analytical questions
  - Enhanced `buildConversationPrompt()` to include follow-up questions in responses
  - Added `generateFollowUpAnalysis()` for deeper analysis on follow-up questions
  - AI now automatically prompts itself with key questions about customer landscape
  - Responses include both answers and follow-up questions to continue analysis
  - Added keyword detection for triggering additional self-prompting analysis
  - AI conducts thorough market analysis by asking itself questions and analyzing answers

- **Claude-Powered Product Vertical Discovery**: Enhanced AI Discovery with dynamic vertical discovery
  - Modified `getProductVerticals()` to use Claude AI for real-time industry analysis
  - Added `buildProductVerticalDiscoveryPrompt()` for intelligent Claude API calls
  - Implemented `parseClaudeProductVerticals()` to parse Claude's JSON responses
  - Enhanced frontend with AI discovery notifications and loading states
  - Added fallback to mock data if Claude API fails for reliability
  - Improved UI to show Claude AI analysis progress with spinner and status messages
  - Maintains backward compatibility with existing mock data structure
  - Dynamic discovery works for any industry Claude can analyze (not limited to predefined ones)
  - Real-time market intelligence with current trends and opportunities

- **AI Discovery Feature**: Complete AI-powered lead discovery system
  - Implemented industry selection with 6 major industries (Dental, Construction, Manufacturing, Healthcare, Food & Beverage, Distribution)
  - Added product vertical discovery with industry-specific verticals and customer types
  - Built comprehensive search functionality with mock data for dental/CBCT, dental/lasers, and construction
  - Created AI conversation interface for guided discovery sessions
  - Added pipeline integration to send discovered customers to enrichment workflow
  - Enhanced search constraints with geography and result limits
  - Implemented real-time WebSocket notifications for discovery activities
  - Fixed search functionality to properly use customer types from selected product verticals
  - Added comprehensive debugging and error handling throughout the discovery flow

- **Technical Fixes & Improvements** (2025-07-13)
  - Fixed frontend/backend token storage mismatch (now consistently uses 'bbds_access_token')
  - Installed missing backend dependencies: swagger-ui-express, swagger-jsdoc, cors
  - Enabled and configured CORS for local development
  - Provided error handling/debugging guidance for backend startup
  - No new features added in this branch; all changes are technical or bug fixes

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