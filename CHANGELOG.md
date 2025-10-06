# Changelog

All notable changes to the Universal Lead Scoring Platform will be documented in this file.

## [2025-10-06] - Node 20 Upgrade, Prisma Migrate Baseline, Phase 3 UI

### Added
- Saved Lists UI: list and detail pages with pin/unpin, delete, open-in-new-tab.
- Sessions UI: “My Sessions” page; session rehydration from `sessionId` in URL.
- Frontend: “Add selected to existing list” in AI Discovery results.
- Backend: Saved list endpoints for pin, unpin, and append items with URL dedupe and domain normalization.

### Changed
- Backend container upgraded to Node 20 (was Node 18).
- Prisma now uses a baseline migration; Docker startup runs `prisma migrate deploy`.
- AI Discovery autosave UX: subtle spinner, last saved timestamp, retry with non-blocking toast.

### Notes
- Database is PostgreSQL 15 in Docker; Prisma Migrate is now the source of truth.
- Existing schema baselined to `prisma/migrations/0001_init` and marked applied (non-destructive).

### Migration
- Dev: `npx prisma migrate dev --name <change>`
- CI/Docker: `npx prisma migrate deploy`

## [2025-10-05] - AI Discovery Configuration & Authentication Fixes

### Added
- **Configurable Industry Discovery Limits**: Added UI dropdown for selecting 5-30 industries in AI Discovery
- **Enhanced AI Service Configuration**: Increased maxTokens to 8192 for larger industry lists
- **Comprehensive Troubleshooting Documentation**: Added AI_DISCOVERY_TROUBLESHOOTING.md
- **Engineering Logs**: Added ENGINEERING_LOGS.md for technical issue tracking
- **API Key Security Documentation**: Documented secure storage and environment variable practices

### Fixed
- **Authentication Token Storage**: Fixed localStorage key inconsistency in AuthContext initialization
  - Changed `'accessToken'` to `'bbds_access_token'`
  - Changed `'user'` to `'bbds_user'`
- **AI Discovery Industry Limits**: Made industry discovery limit configurable instead of hardcoded to 8
- **Service Configuration**: Updated maxTokens for Claude and OpenAI services to 8192
- **User Authentication**: Fixed 401 Unauthorized errors on AI Discovery API calls

### Changed
- **Frontend AI Discovery Page**: Added configurable maxIndustries dropdown (5-30 options)
- **Backend AI Discovery Route**: Added safety cap of 50 industries for performance
- **Service Configuration**: Updated default maxTokens from 4096 to 8192
- **Button Text**: Updated to show "Discover X Industries" with selected count

### Security
- **API Key Storage**: Documented secure storage practices in `.env` files
- **Environment Variables**: Added guidance for Docker environment variable configuration
- **Git Exclusion**: Confirmed `.env` files are properly excluded from version control

### Documentation
- **PRD Updates**: Added AI Discovery configuration requirements and troubleshooting
- **Troubleshooting Guide**: Comprehensive guide for common AI Discovery issues
- **Engineering Logs**: Technical details of issues resolved and pending
- **Configuration Examples**: Added proper Claude API configuration examples

### Known Issues
- **Claude API Endpoint Bug**: Code doubles `/messages` path causing 404 errors
  - User config: `https://api.anthropic.com/v1/messages`
  - Code result: `https://api.anthropic.com/v1/messages/messages`
  - Fix: Update endpoint to `https://api.anthropic.com/v1`
- **OpenAI Service**: Still has placeholder API key requiring real key configuration
- **Service Selection**: May need refinement for optimal AI engine selection

### Technical Details
- **Files Modified**:
  - `frontend/src/contexts/AuthContext.tsx` - Fixed localStorage keys
  - `frontend/src/pages/AIDiscoveryPage.tsx` - Added configurable limits
  - `backend/src/routes/aiDiscovery.ts` - Added safety caps
  - `backend/src/scripts/seedServiceConfiguration.ts` - Updated maxTokens
- **Database Changes**: None (configuration only)
- **Breaking Changes**: None
- **Migration Required**: None

### Performance
- **Industry Discovery**: Configurable limits (5-30 industries) with performance caps
- **API Costs**: Higher limits = more tokens = higher costs
- **Response Times**: 5-8 industries (~2-5s), 15-20 industries (~5-10s), 25-30 industries (~10-20s)

### Testing
- ✅ Authentication flow working
- ✅ Industry limit configuration working  
- ✅ Fallback mechanism working
- ✅ Database persistence working
- ❌ Claude API integration (endpoint bug)
- ❌ OpenAI API integration (placeholder key)

## [2025-10-05] - Customer Discovery Limits and Prompt Enforcement

### Added
- Customer discovery limit control in AI Discovery UI with options: 10, 25, 50, 75, 100

### Fixed
- Backend fallback mismatch causing customer searches to default to 10 when a different limit was selected
- Strengthened Claude customer search prompt to explicitly require EXACT result count and strict JSON output

### Changed
- Backend route applies a safety cap of 100 customers for performance
- Buttons now reflect the selected customer limit (e.g., "Search 25 Customers")

### Notes
- If the AI still returns fewer than requested, strengthened prompt now significantly reduces occurrence; future step will add post-parse enforcement/fill if needed

## [2025-10-05] - Phase 3: Session Persistence & Saved Customer Lists

### Added
- Discovery sessions autosave fields (pinned, expiresAt, lastAutoSavedAt, constraints/results snapshots).
- Saved lists (`SavedCustomerList`, `SavedCustomerItem`) with rich metadata and pinning.
- REST APIs under `/api/discovery` for sessions (create/list/get/autosave/pin) and saved lists (create/list/get/delete).

### Changed
- Linked lists to users; sessions now have retention metadata by default (90 days).

### Notes
- Schema applied with `prisma db push` (no tracked migrations yet).
- Frontend autosave/resume and list UI to follow in Phase 3 UI work.