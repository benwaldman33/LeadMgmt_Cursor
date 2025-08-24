# Engineering Log

This document tracks technical notes, decisions, and areas to revisit for the BBDS Project.

---

## 2025-01-16

### Service Configuration System Implementation
- **Area:** Administrative control panel, service management, AI engine configuration, web scraping configuration
- **Problem:** Need for administrators to control which AI engines, scrapers, and services are used across different operations (AI Discovery, Market Discovery, Web Scraping, Site Analysis)
- **Root Cause Analysis:**
  - No centralized control over service providers and their usage
  - Hard-coded service selection in various operations
  - No ability to manage API keys, rate limits, or service priorities
  - Missing comprehensive site analysis capabilities for entire websites
- **Changes Made:**
  - **Database Schema Extension:**
    - Added `ServiceProvider` model for AI engines, scrapers, and analyzers
    - Added `OperationServiceMapping` model for operation-service relationships
    - Added `ServiceUsage` model for tracking usage, costs, and performance
    - Adapted schema to SQLite limitations (String fields for JSON/enum data)
  - **Backend Service Layer:**
    - Created `ServiceConfigurationService` with full CRUD operations
    - Implemented smart service selection with priority-based fallbacks
    - Added usage tracking and limit management
    - Created comprehensive API endpoints for service management
  - **Admin API Endpoints:**
    - Full REST API for managing service providers and mappings
    - Role-based access control (SUPER_ADMIN only)
    - Validation middleware for JSON configuration fields
  - **Frontend Admin Interface:**
    - Created `ServiceConfigurationPage` with tabbed interface
    - Service Providers tab for managing AI engines and scrapers
    - Operation Mappings tab for configuring service usage
    - Usage Statistics tab (placeholder for future analytics)
    - Integrated into main navigation for super admin users
  - **Database Seeding:**
    - Pre-configured 5 service providers (Claude AI, OpenAI, Apify, Custom Site Analyzer, Lead Scoring AI)
    - Default operation mappings for all major operations
    - Comprehensive scraping configuration for site analysis
- **Technical Decisions:**
  - Use String fields for JSON data to maintain SQLite compatibility
  - Implement priority-based service selection with automatic fallbacks
  - Require SUPER_ADMIN role for all configuration operations
  - Store configuration as JSON strings for flexibility
  - Separate service providers from operation mappings for reusability
- **Architecture:**
  - Service Configuration Service → Database Models → Admin Interface
  - Role-Based Access Control → API Endpoints → Frontend Components
  - Modular design for easy extension of new service types and operations
- **Benefits:**
  - Centralized control over all AI and scraping services
  - Flexible configuration without code changes
  - Comprehensive site analysis capabilities
  - Usage tracking and cost management
  - Scalable architecture for future service integrations
- **Files Modified:**
  - `backend/prisma/schema.prisma` - Added service configuration models
  - `backend/src/services/serviceConfigurationService.ts` - Core service logic
  - `backend/src/routes/serviceConfiguration.ts` - API endpoints
  - `backend/src/index.ts` - Route registration
  - `backend/src/scripts/seedServiceConfiguration.ts` - Database seeding
  - `backend/src/scripts/testServiceConfiguration.ts` - Service testing
  - `frontend/src/pages/ServiceConfigurationPage.tsx` - Admin interface
  - `frontend/src/App.tsx` - Route configuration
  - `frontend/src/components/DashboardLayout.tsx` - Navigation integration

---

### Duplicate Sidebar Issue Resolution
- **Area:** Frontend UI, component architecture, layout management
- **Problem:** Service Configuration page displayed duplicate left navigation sidebars, creating visual confusion and poor user experience
- **Root Cause Analysis:**
  - **Double-wrapped DashboardLayout**: ServiceConfigurationPage was wrapping content in DashboardLayout while ProtectedRoute already provided it
  - **Component Hierarchy**: ProtectedRoute → DashboardLayout → ServiceConfigurationPage → DashboardLayout → content
  - **Result**: Two DashboardLayout components rendered simultaneously, each with its own sidebar
- **Solution Implemented:**
  - Removed redundant DashboardLayout wrapper from ServiceConfigurationPage
  - Component now returns content directly since ProtectedRoute provides the layout
  - Cleaned up unused DashboardLayout import
- **Technical Details:**
  - **Before**: Component had extra DashboardLayout wrapper causing duplication
  - **After**: Single DashboardLayout from ProtectedRoute provides all layout needs
  - **Architecture**: Proper separation of concerns - layout wrapper vs. content provider
- **Result:**
  - Single sidebar now displays correctly
  - Eliminated visual duplication and layout confusion
  - Improved user experience and professional appearance
  - Maintained all functionality while fixing layout issue
- **Files Modified:**
  - `frontend/src/pages/ServiceConfigurationPage.tsx` - Removed duplicate DashboardLayout wrapper
- **Lessons Learned:**
  - Always check component hierarchy for duplicate layout wrappers
  - ProtectedRoute pattern provides consistent layout across all protected pages
  - Component composition should avoid redundant wrapper components

### Complete Backend TypeScript Conversion
- **Area:** Backend architecture, code quality, type safety, build system
- **Problem:** Backend was written in JavaScript, lacking type safety and modern development features
- **Root Cause Analysis:**
  - Original backend implementation used JavaScript without type checking
  - No TypeScript configuration or build process in place
  - Missing type definitions for API endpoints, services, and data models
  - Limited IDE support and code completion capabilities
- **Changes Made:**
  - Converted entire backend codebase from JavaScript to TypeScript
  - Added comprehensive `tsconfig.json` with strict TypeScript settings
  - Implemented proper type definitions for all routes, services, and middleware
  - Added type safety for API requests, responses, and database models
  - Enhanced error handling with TypeScript-specific patterns
  - Updated build process to compile TypeScript to JavaScript
- **Technical Decisions:**
  - Use strict TypeScript configuration for maximum type safety
  - Implement comprehensive interfaces for all data structures
  - Use type guards and validation for runtime type checking
  - Maintain backward compatibility with existing API contracts
  - Add proper error handling for type-related issues
- **Architecture:**
  - TypeScript source → Compilation → JavaScript output → Node.js execution
  - Enhanced IDE support with IntelliSense and error detection
  - Improved code quality through compile-time error checking
  - Better maintainability with explicit type definitions
- **Testing:**
  - Verified all TypeScript compilation succeeds without errors
  - Confirmed all existing functionality works after conversion
  - Tested type safety with various input scenarios
  - Validated build process produces correct JavaScript output
- **Benefits:**
  - Significantly improved code quality and maintainability
  - Enhanced developer experience with better IDE support
  - Reduced runtime errors through compile-time type checking
  - Future-proof architecture with modern TypeScript features
  - Better documentation through explicit type definitions
- **Files Modified:**
  - All backend source files converted from `.js` to `.ts`
  - Added `tsconfig.json` with comprehensive TypeScript configuration
  - Updated build scripts and package.json for TypeScript support
  - Enhanced error handling throughout the codebase

### Enhanced Discovery System Architecture
- **Area:** AI discovery services, workflow orchestration, service architecture
- **Problem:** Discovery system needed better workflow management and execution tracking
- **Changes Made:**
  - Implemented `DiscoveryExecutionService` for orchestrating discovery workflows
  - Added comprehensive discovery progress tracking and status management
  - Enhanced discovery workflow with execution monitoring capabilities
  - Created new frontend components for discovery progress visualization
  - Added market discovery service for client-side operations
- **Technical Decisions:**
  - Separate execution service for workflow orchestration
  - Real-time progress tracking with WebSocket integration
  - Modular service architecture for better maintainability
  - Enhanced error handling and recovery mechanisms
- **Architecture:**
  - Discovery Execution Service → Workflow Orchestration → Progress Tracking
  - Frontend Services → Backend APIs → Real-time Updates
  - Modular design for easy extension and modification
- **Benefits:**
  - Better workflow management and monitoring
  - Enhanced user experience with progress tracking
  - Improved system reliability and error handling
  - Scalable architecture for future enhancements

### WebSocket Authentication Fix
- **Area:** WebSocket service, real-time communication, authentication middleware
- **Problem:** WebSocket connections were failing due to strict authentication requirements in development
- **Root Cause Analysis:**
  - WebSocket service required immediate JWT token validation on connection
  - Frontend was attempting connections before proper authentication was established
  - Development environment needed more permissive authentication handling
  - CORS configuration was too restrictive for WebSocket connections
- **Changes Made:**
  - Modified WebSocket authentication middleware to allow connections without tokens in development
  - Added development mode detection and fallback authentication mechanisms
  - Implemented mock user creation for development connections
  - Enhanced error handling and logging for authentication failures
  - Updated CORS configuration to be more permissive for development
- **Technical Decisions:**
  - Use `process.env.NODE_ENV === 'development'` to detect development mode
  - Create mock user objects for unauthenticated development connections
  - Maintain strict authentication in production environments
  - Add comprehensive logging for debugging WebSocket issues
- **Architecture:**
  - Development Mode → Allow connections without tokens → Create mock users
  - Production Mode → Require valid JWT tokens → Full authentication
  - Fallback handling → Graceful degradation for development testing
- **Testing:**
  - Verified WebSocket connections work in development without authentication
  - Confirmed real-time features function properly with mock users
  - Tested production authentication requirements remain intact
  - Validated CORS configuration allows connections from frontend
- **Benefits:**
  - WebSocket connections now work reliably in development
  - Real-time features (notifications, live updates) function properly
  - Better development experience with immediate connection testing
  - Maintained security for production environments
- **Files Modified:**
  - `backend/src/services/websocketService.ts` (authentication middleware and development mode handling)

### Space Key Input Field Fix
- **Area:** Frontend React state management, keyboard input handling
- **Problem:** Space key not working in Search Terms input field on Create/Edit Scoring Model pages
- **Root Cause Analysis:**
  - React state update cycle interference: Every keystroke triggered parsing and re-joining of search terms
  - `onChange` → `handleCriterionChange` → `parseSearchTerms` → setState → re-render cycle was too rapid
  - Input field value was `criterion.searchTerms.join(', ')` which caused constant value recalculation
  - Rapid state updates prevented space character from being properly displayed as user typed
- **Changes Made:**
  - Added `searchTermsInput` field to `ScoringCriterion` interface for raw input string storage
  - Separated display logic: input field uses `searchTermsInput`, parsing happens in background
  - Updated `handleCriterionChange` to handle both raw input and parsed array simultaneously
  - Applied fix to both `CreateScoringModelPage.tsx` and `EditScoringModelPage.tsx`
  - Removed complex `onKeyDown` and `onPaste` handlers as no longer needed
- **Technical Decisions:**
  - Keep dual data structure: `searchTermsInput` (display) + `searchTerms` (backend)
  - Parse on every change but don't let parsing interfere with input display
  - Maintain backward compatibility with existing backend API expecting array format
- **Architecture:**
  - Input field directly controls its own display value without interference
  - Background parsing maintains data integrity for backend consumption
  - Clean separation of concerns: UI responsiveness vs data processing
- **Testing:**
  - Verified space key works in all text input scenarios
  - Confirmed multi-word phrases like "cone beam computed tomography" work perfectly
  - Backend receives properly parsed array format as expected
- **Benefits:**
  - Natural keyboard input behavior restored
  - Enhanced user experience for complex search term entry
  - Maintains full system functionality and compatibility
- **Files Modified:**
  - `frontend/src/pages/CreateScoringModelPage.tsx`
  - `frontend/src/pages/EditScoringModelPage.tsx`
  - `BBDS_User_Manual.md` (updated FAQ section)

---

### Claude API Integration Fix
- **Area:** Claude API configuration, decryption, authentication, TypeScript compilation
- **Problem:** Claude API key was not working despite being newly enabled and properly configured in database
- **Root Cause Analysis:**
  - `getDecryptedConfig()` function in `aiScoringService.ts` was returning `'[ENCRYPTED]'` instead of actual decryption
  - Claude model name `claude-3-sonnet-20240229` was deprecated and returning 404 errors
  - API key was stored directly without proper encryption formatting
  - Multiple TypeScript compilation errors preventing builds
- **Changes Made:**
  - Fixed `getDecryptedConfig()` function to implement proper decryption logic
  - Added smart API key handling: detects `sk-ant-` prefix and returns directly if not encrypted
  - Implemented fallback decryption for improperly formatted encrypted values
  - Updated Claude model from `claude-3-sonnet-20240229` to `claude-3-5-sonnet-20241022`
  - Fixed TypeScript errors: admin routes (`req.user!.id`), Apify service (null handling), scoring service (missing method)
  - Added `decryptValue()` helper function with comprehensive error handling
- **Technical Decisions:**
  - Smart detection: API keys starting with `sk-ant-` are returned directly (handles direct storage)
  - Proper encryption format: `iv:encryptedValue` format is decrypted using AES-256-CBC
  - Fallback handling: If decryption fails but looks like API key, return as-is
  - Model update: Use latest Claude 3.5 Sonnet model for best performance
  - Type safety: Use non-null assertion (`!`) for authenticated user access
- **Architecture:**
  - Database stores API key (encrypted or plain text) → `getDecryptedConfig()` → Smart detection → Return usable key
  - Error handling: Decryption failure → Check if looks like API key → Return directly or `[ENCRYPTED]`
  - Build process: TypeScript compilation → No errors → All AI features functional
- **Testing:**
  - Verified Claude API connection successful with 1264ms response time
  - Confirmed AI scoring features working with real Claude responses
  - All TypeScript compilation errors resolved
  - Database configuration verified: API key configured, correct model, proper tokens
- **Benefits:**
  - All Claude AI features now fully functional
  - Robust API key handling supports multiple storage formats
  - Fast response times (~1 second) for Claude API calls
  - Future-proof architecture with latest Claude models
  - Comprehensive error handling and fallback mechanisms
- **Files Modified:**
  - `backend/src/services/aiScoringService.ts` (fixed decryption logic, added `decryptValue()`)
  - `backend/src/routes/admin.ts` (fixed TypeScript user ID access)
  - `backend/src/services/apifyService.ts` (fixed null description handling)
  - `backend/src/services/scoringService.ts` (fixed missing method reference)
  - Database: Updated `CLAUDE_MODEL` to `claude-3-5-sonnet-20241022`

---

## 2025-07-13

### Self-Prompting AI Analysis Enhancement
- **Area:** AI Discovery service, Claude API integration, autonomous analysis capabilities
- **Changes Made:**
  - Modified `generateCustomerInsights()` to use self-prompting analysis instead of static information
  - Added `buildSelfPromptingAnalysisPrompt()` that makes AI ask itself analytical questions
  - Enhanced `buildConversationPrompt()` to include follow-up questions in responses
  - Added `generateFollowUpAnalysis()` for deeper analysis on follow-up questions
  - Implemented keyword detection for triggering additional self-prompting analysis
  - Enhanced AI responses to include both answers and follow-up questions
- **Technical Decisions:**
  - AI now conducts autonomous analysis by asking itself key questions about customer landscape
  - Self-prompting questions focus on: primary B2B customers, characteristics, market opportunities, challenges, growth potential
  - Follow-up questions generated automatically to continue analysis flow
  - Keyword detection triggers additional analysis for customer/market-related questions
  - Responses combine direct answers with follow-up questions for deeper exploration
- **Architecture:**
  - Product vertical selection → AI self-prompting analysis → Customer insights generation
  - Conversation flow: User question → AI answer → Follow-up questions → Additional analysis
  - Keyword detection: customer, market, opportunity, segment, buyer, purchasing, growth, challenge, competitive
  - Multi-layered analysis: Primary response + Additional self-prompting analysis
- **Benefits:**
  - Autonomous AI analysis without requiring user to ask specific questions
  - Deeper market insights through self-generated analytical questions
  - Continuous analysis flow with follow-up questions
  - More comprehensive customer discovery through multi-layered analysis
  - AI-driven exploration of market opportunities and challenges
- **Files Modified:**
  - `backend/src/services/aiDiscoveryService.ts` (enhanced with self-prompting capabilities)

### Claude-Powered Product Vertical Discovery Enhancement
- **Area:** AI Discovery service, Claude API integration, dynamic vertical discovery
- **Changes Made:**
  - Enhanced `getProductVerticals()` method to use Claude AI for real-time industry analysis
  - Added `buildProductVerticalDiscoveryPrompt()` for intelligent Claude API calls with structured JSON output
  - Implemented `parseClaudeProductVerticals()` to parse and validate Claude's JSON responses
  - Created `getMockProductVerticals()` as fallback method for reliability
  - Enhanced frontend with AI discovery notifications and improved loading states
  - Added comprehensive error handling with graceful fallback to mock data
- **Technical Decisions:**
  - Claude API calls made dynamically when industry is selected (not cached)
  - Structured JSON prompt ensures consistent response format for parsing
  - Fallback to mock data ensures system reliability if Claude API fails
  - Frontend notifications provide clear feedback on AI analysis progress
  - Loading states show "Claude AI is analyzing..." with spinner animation
- **Architecture:**
  - Industry selection → Claude API call → JSON parsing → Product verticals display
  - Error handling: Claude failure → Mock data fallback → User notification
  - Frontend state management: Loading → Success/Error notification → Results display
  - Maintains backward compatibility with existing mock data structure
- **Benefits:**
  - Dynamic product vertical discovery for any industry (not limited to predefined ones)
  - Real-time market intelligence with current trends and opportunities
  - Scalable architecture that works with any industry Claude can analyze
  - Reliable system with fallback ensures always functional
  - Enhanced user experience with clear AI analysis feedback
- **Files Modified:**
  - `backend/src/services/aiDiscoveryService.ts` (enhanced with Claude integration)
  - `frontend/src/pages/AIDiscoveryPage.tsx` (enhanced UI and notifications)

### AI Discovery Feature Implementation
- **Area:** AI-powered lead discovery, industry analysis, customer search, pipeline integration
- **Changes Made:**
  - Implemented complete AI Discovery system with industry selection and product vertical discovery
  - Created `AIDiscoveryService` with mock data for 6 industries and their product verticals
  - Built comprehensive search functionality with industry-specific customer types
  - Added AI conversation interface for guided discovery sessions
  - Integrated with pipeline system for seamless workflow from discovery to enrichment
  - Enhanced search constraints with geography filtering and result limits
  - Implemented real-time WebSocket notifications for discovery activities
- **Technical Decisions:**
  - Mock data structure with realistic industry/vertical/customer type hierarchies
  - Customer types extracted from selected product verticals for accurate search
  - Search results filtered by geography and result limits for scalability
  - Pipeline integration sends discovered URLs directly to enrichment workflow
  - WebSocket notifications track user activity throughout discovery process
- **Architecture:**
  - Industry → Product Vertical → Customer Types → Search → Pipeline workflow
  - Mock data provides realistic examples for dental/CBCT, dental/lasers, construction
  - Search results include relevance scores, locations, and company types
  - Pipeline integration maintains context (industry, source) for downstream processing
- **Benefits:**
  - Complete AI-guided lead discovery workflow
  - Industry-specific insights and customer targeting
  - Seamless integration with existing pipeline system
  - Scalable architecture for real web search integration
- **Files Created/Modified:**
  - `backend/src/services/aiDiscoveryService.ts` (new)
  - `backend/src/routes/aiDiscovery.ts` (new)
  - `frontend/src/services/aiDiscoveryService.ts` (new)
  - `frontend/src/pages/AIDiscoveryPage.tsx` (new)
  - `frontend/src/App.tsx` (AI Discovery routing)
  - `frontend/src/components/DashboardLayout.tsx` (AI Discovery navigation)

### Search Functionality Fix
- **Area:** AI Discovery search, customer type handling, mock data enhancement
- **Changes Made:**
  - Fixed search functionality to properly extract customer types from selected product verticals
  - Enhanced mock data with industry-specific results for dental/CBCT, dental/lasers, and construction
  - Added comprehensive debugging logs to frontend search function
  - Improved search results filtering and display
- **Technical Decisions:**
  - Customer types now sourced from selected product vertical instead of empty discovery session
  - Mock data structured to match real industry/vertical combinations
  - Debugging logs provide visibility into search process for development
  - Search results include realistic company data with locations and descriptions
- **Benefits:**
  - Search now returns appropriate results based on industry/vertical selection
  - Better user experience with realistic mock data
  - Improved debugging capabilities for development
  - Foundation ready for real web search integration

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

---

## 2025-07-13

### AI Discovery Conversation Flow Improvement
- **Area:** AI Discovery service, conversation flow, user experience
- **Changes Made:**
  - Modified `generateAIResponse()` to only trigger additional analysis for explicit user requests
  - Updated `generateFollowUpAnalysis()` to use explicit keywords like 'analyze', 'deep dive', 'detailed analysis'
  - Removed automatic customer insights generation when product vertical is selected
  - Added user-controlled "Generate Customer Insights" button in the UI
  - Updated conversation prompts to be more concise and focused
- **Technical Decisions:**
  - User now controls the depth of AI analysis through explicit requests
  - Initial responses are brief and focused, with follow-up questions
  - Additional analysis only triggers for keywords like 'analyze', 'deep dive', 'tell me more'
  - Conversation flow: Industry selection → Product vertical selection → User-guided exploration
- **Benefits:**
  - Better user experience with controlled conversation flow
  - No more automatic verbose responses
  - Users can choose when to get detailed analysis
  - More natural conversation progression
- **Files Modified:**
  - `backend/src/services/aiDiscoveryService.ts` (conversation flow improvements)
  - `frontend/src/pages/AIDiscoveryPage.tsx` (UI improvements and user control) 