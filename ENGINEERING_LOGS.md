# Engineering Logs

## 2025-10-05 - AI Discovery Authentication & Configuration Issues

### Issues Resolved

#### 1. Authentication Token Storage Inconsistency
**Problem**: 401 Unauthorized errors when accessing AI Discovery API
**Root Cause**: Inconsistent localStorage keys in AuthContext initialization
- Frontend services expected: `'bbds_access_token'` and `'bbds_user'`
- AuthContext initialization used: `'accessToken'` and `'user'`

**Solution**: Updated `frontend/src/contexts/AuthContext.tsx` to use consistent keys
**Files Modified**: 
- `frontend/src/contexts/AuthContext.tsx` (lines 75-85)

#### 2. AI Discovery Industry Limit Configuration
**Problem**: Hardcoded limit of 8 industries, not configurable
**Root Cause**: Frontend and backend both hardcoded `maxIndustries: 8`

**Solution**: Made industry limit configurable with UI dropdown (5-30 industries)
**Files Modified**:
- `frontend/src/pages/AIDiscoveryPage.tsx` (added maxIndustries state and UI controls)
- `backend/src/routes/aiDiscovery.ts` (added safety cap of 50)
- `backend/src/scripts/seedServiceConfiguration.ts` (increased maxTokens to 8192)

### Issues Identified (Pending Resolution)

#### 3. Claude API Endpoint Bug
**Problem**: Claude API calls failing with 404 Not Found
**Root Cause**: Code doubles the `/messages` path in endpoint construction
- User config: `https://api.anthropic.com/v1/messages`
- Code adds: `/messages` 
- Result: `https://api.anthropic.com/v1/messages/messages` (invalid)

**Location**: `backend/src/services/aiDiscoveryService.ts` line 300
**Fix Required**: Update endpoint construction logic or user configuration

#### 4. AI Service Configuration Issues
**Problem**: AI Discovery falling back to hardcoded suggestions
**Root Causes**:
- Claude API endpoint bug (see #3)
- OpenAI service still has placeholder API key
- Service selection logic may need refinement

**Impact**: Users get "dummy data" instead of real AI-generated industry suggestions

### Customer Discovery Limit & Prompt Enforcement (2025-10-05)

#### Problem
- UI allowed selecting 10–100 customers, but backend consistently returned 10
- Prompt wording (“Max Results: N”) was interpreted loosely by the AI
- Backend prompt builders had inconsistent fallbacks (10 vs 50)

#### Resolution
- Frontend: Added `maxCustomers` control and wired to request constraints
- Backend: Added safety cap to 100 in route; standardized prompt builders to default to 50 when missing
- Prompt: Rewrote Claude customer discovery prompt to enforce EXACT result count and strict JSON-only output with a clear schema and quality rules

#### Files Impacted
- `frontend/src/pages/AIDiscoveryPage.tsx` (UI, button label, constraints)
- `backend/src/routes/aiDiscovery.ts` (safety cap)
- `backend/src/services/aiDiscoveryService.ts` (prompt default alignment; hardened prompt)

#### Outcome
- Selecting 25 customers now yields 25 results; user verified
- Stronger compliance from Claude; reduces under-delivery to 10

### Frontend Docker Runtime & WebSocket Connectivity (2025-10-05)

#### Problem
- UI intermittently showed "backend disconnected" and /api/health returned 500 via port 3000.
- Vite dev server inside Docker (node:18-alpine) crashed with `TypeError: crypto.hash is not a function` → proxy at 3000 unavailable → 500s.
- WebSocket client used `ws://backend:3001` (Docker service name) which the browser cannot resolve → persistent WS failures even when REST worked.

#### Root Causes
1. Node 18 + Vite 7 / React Router 7 incompatibility in the container.
2. Browser cannot reach `backend` hostname; must use `localhost:3001` for WS.

#### Fixes
- Upgraded frontend Docker image to `node:20-bullseye` (stable for Vite 7).
- Kept Vite dev server with proxy `/api -> http://backend:3001`.
- Set `VITE_WS_URL=http://localhost:3001` so browser connects WS over host networking.

#### Files Updated
- `frontend/Dockerfile` (base image to node:20-bullseye; dev server entry)
- `docker-compose.yml` (set `VITE_WS_URL=http://localhost:3001`)
- `frontend/src/services/websocketService.ts` (env-configurable WS base)

#### Outcome
- `/api/health` via 3000 returns 200 (proxy active), backend `/api/health` 200.
- WebSocket connects reliably; connection indicator reflects true status.

#### Notes / Next
- For production (vite preview), ensure `VITE_API_URL` is a full URL (no proxy), and resolve current TS build errors before enabling preview build.

## Phase 3 – Session Persistence & Saved Customer Lists (2025-10-05)

### Goals
- Autosave discovery progress; allow users to resume sessions.
- Save customer results as named lists; pin/retention and basic metadata.

### Data Model Changes
- `DiscoverySession`
  - Added: `pinned`, `expiresAt`, `lastAutoSavedAt`, `constraints` (JSON), `resultsSnapshot` (JSON).
- `SavedCustomerList` and `SavedCustomerItem`
  - List-level fields: `industry`, `productVertical`, `constraints` snapshot, `aiEngineUsed`, `promptVersion`, `pinned`, `expiresAt`, timestamps.
  - Item fields: `url`, `title`, `description`, `relevanceScore`, `location`, `companyType`, optional `tags`, `notes`, `rank`, `domain`, `logoUrl`, `estEmployees`, `estRevenue`, `techTags`.
  - Relation back to `User`; uniqueness on (listId, url).

### Backend APIs (mounted at `/api/discovery`)
- Sessions: `POST /sessions`, `GET /sessions`, `GET /sessions/:id`, `POST /sessions/:id/autosave`, `PATCH /sessions/:id` (pin/unpin).
- Saved lists: `POST /saved-lists`, `GET /saved-lists`, `GET /saved-lists/:id`, `DELETE /saved-lists/:id`.

### Retention & Limits
- Default retention: 90 days from creation/last-activity; pinned items do not expire (expiresAt=null).
- (Future) soft-delete recovery window and per-user quotas configurable.

### Implementation Notes
- Schema applied with `prisma db push` (no migrations tracked yet).
- Autosave: recommended every ~45s and on key step transitions (frontend to implement next).
- Constraints/results snapshots are JSON strings for portability; consider JSONB in future.

### Outcome
- Persistence foundation in place; ready for UI wiring (autosave/resume, lists UI).
### Technical Details

#### Authentication Flow
- JWT tokens stored in localStorage with `bbds_` prefix
- Axios interceptors automatically attach tokens to API requests
- WebSocket authentication working correctly

#### AI Discovery Service Architecture
- Uses ServiceConfigurationService to select AI providers
- Supports Claude AI, OpenAI GPT-4, and Grok
- Falls back to hardcoded suggestions when AI services fail
- Industry limit now configurable (5-30, capped at 50 for performance)

#### Database Configuration
- Service providers stored in `ServiceProvider` table
- Operation mappings in `OperationServiceMapping` table
- API keys encrypted in database (when using encryption)
- Environment variables passed via Docker Compose

### Recommendations

1. **Immediate**: Fix Claude API endpoint bug
2. **Short-term**: Add OpenAI API key configuration
3. **Medium-term**: Improve error handling and user feedback
4. **Long-term**: Add service health monitoring and automatic failover

### Testing Status
## 2025-10-06 - Node 20 Upgrade & Prisma Migrate Baseline

### Changes
- Backend Docker base image upgraded to Node 20; verified in-container `node -v` = v20.x.
- Added `"engines": { "node": ">=20" }` to `backend/package.json`.
- Established Prisma Migrate as deployment mechanism:
  - Generated baseline at `prisma/migrations/0001_init/migration.sql` via `prisma migrate diff`.
  - Marked baseline applied using `prisma migrate resolve --applied 0001_init` (non-destructive).
  - Docker compose updated to run `npx prisma migrate deploy` before backend startup.

### Rationale
- Aligns container and local runtime with Node 20 requirements.
- Provides durable, versioned schema history for CI/production.

### Risks & Mitigations
- Migration drift across environments → Mitigated with baseline and `migrate deploy` on startup.
- Constraint application failures on future changes → Add data backfill/cleanup steps before adding constraints.

### Verification
- `npx prisma migrate status` reports 1 migration found; schema up to date.

- ✅ Authentication flow working
- ✅ Industry limit configuration working
- ❌ Claude API integration (endpoint bug)
- ❌ OpenAI API integration (placeholder key)
- ✅ Fallback mechanism working
- ✅ Database persistence working
