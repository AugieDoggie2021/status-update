# Systematic Fix Implementation Plan

## Root Cause Hypothesis
The PKCE verifier cookie is not being sent with the callback request because:
1. Our custom cookie handler may not match @supabase/ssr's expected format
2. Cookie attributes may not be set correctly for cross-site redirects
3. Browser may be blocking the cookie due to missing/mismatched attributes

## Implementation Strategy

### Phase 1: Use @supabase/ssr Defaults (Remove Custom Overrides)
**Rationale**: @supabase/ssr is designed to handle PKCE cookies automatically. Our custom handlers may be interfering.

**Action**: Remove custom cookie handlers and let @supabase/ssr handle everything.

### Phase 2: Add Comprehensive Logging
**Rationale**: We need visibility into what's happening at each step.

**Action**: Add logging for:
- Cookie setting (client-side)
- Cookie reading (client-side before redirect)
- Cookie receiving (server-side)
- Cookie attributes (client and server)

### Phase 3: Create Diagnostic Tools
**Rationale**: Need tools to verify cookie attributes and environment alignment.

**Action**: Create endpoints/pages to:
- Display all cookies with their attributes
- Verify environment variables
- Test cookie setting/reading

### Phase 4: Fallback: Explicit Cookie Attributes
**Rationale**: If defaults don't work, explicitly set required attributes.

**Action**: Ensure cookies have:
- SameSite=None
- Secure=true (in production)
- Path=/
- Appropriate maxAge

### Phase 5: Environment Verification
**Rationale**: Ensure all URLs match across services.

**Action**: Create verification utility and documentation.

