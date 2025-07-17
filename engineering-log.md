# Engineering Log

This document tracks technical notes, decisions, and areas to revisit for the BBDS Project.

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

## [2025-07-13] AI Discovery, Campaign, and Pipeline UX Improvements

- AI Discovery: Added state persistence, debug tools, and ensured context-aware prompts for Claude.
- Campaigns: Implemented scoring model assignment in both create and edit forms. Added Edit Campaign page and route.
- Pipeline: Enforced campaign selection with scoring model for pipeline processing. Improved error handling and user feedback.
- Scoring Model: Improved search term parsing, added visual feedback for parsed terms, and clarified instructions.
- Fixed: 'Send to Pipeline' now navigates to the Pipeline page for campaign selection, rather than making a direct API call.
- Backend: Ensured prompt context is always included and campaign/scoring model API support is robust.

See TODO.md for remaining tasks and follow-ups. 

## 2025-07-13

### Technical Fixes & Improvements (No Feature Updates)
- **Area:** Frontend/backend integration, authentication, environment setup
- **Changes Made:**
  - Fixed token storage/retrieval mismatch: Axios interceptor now uses 'bbds_access_token' to match AuthService and backend
  - Installed missing backend dependencies: swagger-ui-express, swagger-jsdoc, cors
  - Enabled and configured CORS for local development (added CORS_ORIGIN to .env)
  - Provided guidance for capturing backend errors that disappear quickly
  - Ensured npm install and dev server restarts for both frontend and backend
- **Technical Decisions:**
  - Standardized token key across frontend and backend for consistent authentication
  - Used .env for CORS origin configuration to support local dev
- **Benefits:**
  - Resolved 401 Unauthorized errors due to token mismatch
  - Improved local development experience and reliability
  - No new features or user-facing changes in this branch
- **Files Modified:**
  - frontend/src/services/api.ts (token handling)
  - backend/src/index.ts (.env CORS config)
  - backend/package.json (dependencies)
  - backend/.env (CORS_ORIGIN) 