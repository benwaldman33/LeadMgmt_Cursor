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
- ✅ Authentication flow working
- ✅ Industry limit configuration working
- ❌ Claude API integration (endpoint bug)
- ❌ OpenAI API integration (placeholder key)
- ✅ Fallback mechanism working
- ✅ Database persistence working
