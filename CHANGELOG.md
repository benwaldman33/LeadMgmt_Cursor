# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Service Configuration System**: Comprehensive administrative control panel for managing AI engines, scrapers, and service providers
  - **Database Schema Extension**: Added ServiceProvider, OperationServiceMapping, and ServiceUsage models
  - **Backend Service Layer**: Created ServiceConfigurationService with smart service selection and usage tracking
  - **Admin API Endpoints**: Full REST API for service management with SUPER_ADMIN role-based access control
  - **Frontend Admin Interface**: Tabbed interface for managing service providers, operation mappings, and usage statistics
  - **Service Provider Management**: Enable/disable services, configure API keys, set rate limits, manage priorities
  - **Operation-Specific Mapping**: Assign different services to specific operations (AI Discovery, Market Discovery, Web Scraping)
  - **Comprehensive Site Analysis**: Full website crawling capabilities with AI-powered keyword extraction and content analysis
  - **Usage Tracking**: Monitor service usage, costs, performance, and success rates
  - **Pre-configured Services**: 5 default service providers (Claude AI, OpenAI, Apify, Custom Site Analyzer, Lead Scoring AI)
  - **Priority-Based Selection**: Automatic service fallback based on priority and availability
  - **JSON Configuration**: Flexible configuration storage for API keys, rate limits, and scraping parameters

- **TypeScript Conversion**: Complete backend conversion from JavaScript to TypeScript
  - Converted all backend routes, services, and middleware to TypeScript
  - Added comprehensive type definitions and interfaces
  - Implemented strict TypeScript configuration with proper error handling
  - Enhanced code quality and maintainability with type safety
  - Added new TypeScript-specific utilities and helper functions

- **Discovery Execution Service**: New service for managing AI discovery workflows
  - Implemented `DiscoveryExecutionService` for orchestrating discovery processes
  - Added support for discovery progress tracking and status management
  - Enhanced discovery workflow with execution monitoring capabilities

- **Enhanced UI Components**: New React components for improved user experience
  - Added `ConnectionStatus` component for real-time connection monitoring
  - Created `DebugPanel` component for development and troubleshooting
  - Implemented `ErrorBoundary` component for graceful error handling
  - Added new pages: `DiscoveryProgressPage`, `MarketDiscoveryPage`, `TeamsPage`

- **Market Discovery Service**: Frontend service for AI-powered market discovery
  - Implemented `MarketDiscoveryService` for client-side discovery operations
  - Added comprehensive market analysis and customer discovery capabilities
  - Enhanced discovery workflow integration with backend services

- **Utility Enhancements**: New utility functions and tools
  - Added `consoleLogger` utility for enhanced logging capabilities
  - Created test scripts for discovery flow and market discovery testing
  - Added batch file for starting both frontend and backend servers

### Fixed
- **WebSocket Authentication**: Fixed WebSocket connection failures and authentication issues
  - Updated WebSocket service to allow connections without tokens in development mode
  - Added development-friendly authentication handling with mock user creation
  - Improved error handling and logging for WebSocket connections
  - Enhanced CORS configuration for WebSocket connections across different ports
  - Resolved connection failures that were preventing real-time features from working
  - Added fallback authentication mechanisms for development and testing

- **Search Terms Input Field**: Fixed space key not working in Create/Edit Scoring Model pages
  - Root cause: React state update cycle was interfering with keyboard input on search terms field
  - Solution: Separated display string (`searchTermsInput`) from parsed data (`searchTerms`) to prevent input interference
  - Input fields now work naturally without keystroke blocking for multi-word phrases
  - Maintains full backend compatibility with parsed search terms array
  - Enhanced user experience for entering complex search terms like "cone beam computed tomography"

- **Claude API Integration**: Fixed critical Claude API configuration and authentication issues
  - Fixed `getDecryptedConfig()` function to properly decrypt API keys instead of returning `[ENCRYPTED]`
  - Updated Claude model from deprecated `claude-3-sonnet-20240229` to current `claude-3-5-sonnet-20241022`
  - Implemented smart API key handling for both encrypted and plain text storage formats
  - Added fallback decryption logic for API keys stored directly without encryption formatting
  - Fixed TypeScript compilation errors preventing build: admin routes user ID access, Apify service type issues, scoring service missing method
  - Verified successful Claude API connection with 1-second response times
  - All AI scoring features now fully functional with Claude integration

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

- **Duplicate Sidebar Fix**: Resolved navigation duplication issue on Service Configuration page
  - Root cause: ServiceConfigurationPage was redundantly wrapping content in DashboardLayout
  - Solution: Removed redundant DashboardLayout wrapper since ProtectedRoute already provides layout
  - Impact: Eliminates visual duplication of navigation sidebar on Service Configuration page
  - **Solution**: Removed redundant DashboardLayout wrapper from ServiceConfigurationPage component
  - **Result**: Single sidebar now displays correctly, eliminating visual duplication and layout confusion
  - **Impact**: Improved user experience and professional appearance of admin interface
  - Enhanced search constraints with geography and result limits
  - Implemented real-time WebSocket notifications for discovery activities
  - Fixed search functionality to properly use customer types from selected product verticals
  - Added comprehensive debugging and error handling throughout the discovery flow

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