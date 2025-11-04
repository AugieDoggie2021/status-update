# Comprehensive Root Cause Analysis: PKCE Cookie Not Received

## Problem Statement
The PKCE code verifier cookie is not being received by the server during the OAuth callback, resulting in `cookieCount: 0` and the error: "both auth code and code verifier should be non-empty".

## Complete Universe of Possible Causes

### Category 1: Cookie Attributes (Most Likely)
**1.1 SameSite Policy**
- `SameSite=Strict`: Blocks ALL cross-site cookies (breaks OAuth)
- `SameSite=Lax`: Allows top-level redirects but may block some scenarios
- `SameSite=None`: Required for OAuth, but MUST have `Secure` flag
- Default browser behavior: Chrome defaults to `Lax` if not specified

**1.2 Secure Flag**
- Required when `SameSite=None` in all modern browsers
- Must be set in HTTPS contexts
- If missing, browser silently rejects cookie

**1.3 Domain Attribute**
- Cookie domain must match the request domain
- If set to wrong domain (e.g., `.vercel.app` when using custom domain), won't be sent
- Subdomain mismatches (www vs non-www)

**1.4 Path Attribute**
- If path is too restrictive, cookie won't be sent to `/auth/callback`
- Must be `/` or include `/auth/callback`

**1.5 Expiration**
- Cookie expires before callback completes
- MaxAge set too short
- Session cookie expires on tab close

---

### Category 2: Browser Privacy & Security
**2.1 Third-Party Cookie Blocking**
- Chrome: Blocks third-party cookies by default (2024+)
- Safari: ITP (Intelligent Tracking Prevention) blocks cross-site cookies
- Firefox: Enhanced Tracking Protection
- Edge: Similar privacy features

**2.2 Private/Incognito Mode**
- More restrictive cookie policies
- May block cross-site cookies entirely

**2.3 Browser Extensions**
- Privacy extensions (uBlock Origin, Privacy Badger, etc.)
- Cookie blockers
- Ad blockers interfering with OAuth

**2.4 Browser Settings**
- User has disabled third-party cookies
- Strict privacy mode enabled
- Cookie storage disabled

---

### Category 3: OAuth Redirect Chain
**3.1 Redirect Flow**
```
Your App (sets cookie) 
  → Google OAuth (cross-site)
  → Supabase Auth (cross-site)
  → Your Callback (must receive cookie)
```
Each step is cross-site, so cookie must survive multiple domain changes.

**3.2 Origin Mismatch**
- Cookie set on `localhost:3000` but callback is `vercel.app`
- Cookie set on `vercel.app` but callback is custom domain
- Protocol mismatch (HTTP vs HTTPS)

**3.3 Redirect URL Mismatch**
- Supabase redirect URL doesn't match actual callback URL
- Google OAuth redirect URI doesn't match
- Query parameters change redirect URL

---

### Category 4: Environment & Configuration
**4.1 Environment Variables**
- `NEXT_PUBLIC_BASE_URL` not set or incorrect
- `NEXT_PUBLIC_SITE_URL` not set or incorrect
- Different values in local vs Vercel
- Whitespace in URLs (already fixed)

**4.2 Supabase Configuration**
- Site URL in Supabase dashboard doesn't match actual domain
- Redirect URLs in Supabase don't include callback URL
- Auth provider settings incorrect

**4.3 Google OAuth Configuration**
- Authorized redirect URI doesn't match
- Domain mismatch in Google Console
- OAuth consent screen settings

**4.4 Vercel Configuration**
- Domain configuration issues
- Edge network cookie handling
- Function runtime limitations

---

### Category 5: @supabase/ssr Implementation
**5.1 Cookie Storage Mechanism**
- `createBrowserClient` uses `document.cookie` or custom storage
- Cookie name format: `sb-{project-ref}-auth-token-code-verifier-{random}`
- Cookie format may differ from what server expects

**5.2 Cookie Setting Timing**
- Cookie set when `signInWithOAuth` is called
- Cookie may be set after redirect starts
- Race condition between cookie set and redirect

**5.3 Cookie Retrieval**
- `createServerClient` expects cookies in specific format
- `getAll()` must return cookies in exact format Supabase expects
- Cookie name matching logic

**5.4 Version Compatibility**
- `@supabase/ssr` version may have bugs
- Breaking changes between versions
- Known issues with PKCE flow

---

### Category 6: Next.js Cookie API
**6.1 cookies() Function**
- Lazy evaluation in Next.js 15+
- Must be `await cookies()` in route handlers
- Edge runtime limitations

**6.2 Cookie Serialization**
- Next.js may serialize cookies differently
- Request headers vs cookieStore mismatch
- Cookie encoding/decoding issues

**6.3 Route Handler Context**
- Cookies may not be available in route handlers
- Edge runtime doesn't support all cookie operations
- Serverless function cold starts

**6.4 Middleware Interference**
- Middleware may read cookies before route handler
- CookieStore may be consumed by middleware
- Multiple cookie reads causing issues

---

### Category 7: Network & Infrastructure
**7.1 CDN/Edge Network**
- Vercel Edge Network may strip cookies
- CDN caching issues
- Geographic distribution affecting cookies

**7.2 Load Balancing**
- Multiple servers with different cookie stores
- Sticky sessions not configured
- Cookie replication issues

**7.3 HTTPS/HTTP Mixed Content**
- Cookie set on HTTPS but callback on HTTP (or vice versa)
- Secure flag mismatch
- Mixed content policies

---

### Category 8: PKCE Flow Implementation
**8.1 Code Verifier Generation**
- Verifier generated client-side
- Stored in cookie before redirect
- Verifier must match code_challenge sent to Supabase

**8.2 Code Exchange**
- `exchangeCodeForSession` must receive both code and verifier
- Verifier retrieved from cookie
- Code from URL query parameter

**8.3 Timing Issues**
- Cookie expires before exchange
- Cookie cleared during redirect
- Multiple redirects clearing cookies

---

## Systematic Diagnostic Plan

### Phase 1: Verify Cookie is Set (Client-Side)
**Goal**: Confirm cookie is actually set before redirect

1. Add client-side logging before redirect:
   ```js
   console.log('Before redirect, cookies:', document.cookie);
   console.log('PKCE cookies:', document.cookie.split(';').filter(c => c.includes('code-verifier')));
   ```

2. Check cookie attributes in DevTools:
   - Open DevTools → Application → Cookies
   - Find cookie with `code-verifier` in name
   - Verify: SameSite=None, Secure=true, Domain matches, Path=/

3. Check Network tab:
   - Before redirect: Confirm cookie is set
   - After redirect: Check if cookie is sent in request headers

### Phase 2: Verify Cookie is Received (Server-Side)
**Goal**: Confirm cookie reaches server

1. Log raw request headers:
   ```js
   const cookieHeader = request.headers.get('cookie');
   console.log('Raw cookie header:', cookieHeader);
   ```

2. Log cookieStore contents:
   ```js
   const cookies = await cookies();
   const all = cookies.getAll();
   console.log('CookieStore cookies:', all.map(c => ({ name: c.name, valueLength: c.value?.length })));
   ```

3. Check for cookie name variations:
   - `sb-*-code-verifier-*`
   - `code_verifier`
   - `verifier`
   - Any cookie with `verifier` in name

### Phase 3: Verify Cookie Attributes
**Goal**: Ensure cookie can survive cross-site redirect

1. Check cookie SameSite attribute:
   - Must be `SameSite=None`
   - Must have `Secure` flag (in production)

2. Check cookie Domain:
   - Must match actual domain (not subdomain)
   - Must not have leading dot unless needed

3. Check cookie Path:
   - Must be `/` or include `/auth/callback`

4. Check cookie expiration:
   - Must not expire before callback completes
   - Set reasonable maxAge (e.g., 10 minutes)

### Phase 4: Verify Environment Alignment
**Goal**: Ensure all URLs match across services

1. Check Vercel environment variables:
   - `NEXT_PUBLIC_BASE_URL` = actual domain
   - `NEXT_PUBLIC_SITE_URL` = actual domain (if used)

2. Check Supabase dashboard:
   - Site URL = actual domain
   - Redirect URLs include: `https://yourdomain.com/auth/callback`

3. Check Google OAuth Console:
   - Authorized redirect URI = `https://yourdomain.com/auth/callback`
   - Domain matches

4. Check actual request URL:
   - Origin matches configured URLs
   - No protocol/domain mismatches

### Phase 5: Verify Browser Capabilities
**Goal**: Ensure browser supports required features

1. Test in different browsers:
   - Chrome (latest)
   - Firefox (latest)
   - Safari (if available)
   - Edge (latest)

2. Test in different modes:
   - Normal window
   - Private/Incognito
   - With extensions disabled

3. Check browser console for warnings:
   - Cookie blocked warnings
   - SameSite warnings
   - Secure flag warnings

---

## Foolproof Fix Strategy

### Strategy 1: Use Supabase's Built-in Cookie Handling (Recommended)
**Rationale**: Let `@supabase/ssr` handle cookies automatically without custom overrides.

**Implementation**:
1. Remove custom cookie handlers from `createBrowserClientSupabase`
2. Use default `@supabase/ssr` cookie handling
3. Ensure `createServerClient` uses default cookie handling
4. Only override if absolutely necessary

### Strategy 2: Explicit Cookie Attribute Setting
**Rationale**: Explicitly set all required attributes to ensure cookie survives redirects.

**Implementation**:
1. Set `SameSite=None` explicitly
2. Set `Secure=true` in production
3. Set `Path=/` explicitly
4. Set appropriate `maxAge` (600 seconds = 10 minutes)
5. Do NOT set `Domain` unless absolutely necessary

### Strategy 3: Use Session Storage Fallback
**Rationale**: If cookies fail, use sessionStorage as backup (though this won't work for cross-site).

**Implementation**:
1. Store verifier in sessionStorage before redirect
2. On callback, check sessionStorage if cookie missing
3. Note: This only works for same-site redirects, not OAuth

### Strategy 4: Server-Side PKCE (Skip Client Cookies)
**Rationale**: Generate and store verifier server-side to avoid cookie issues.

**Implementation**:
1. Generate verifier on server
2. Store in server-side session/database
3. Pass verifier ID to client
4. Retrieve verifier on callback using ID
5. Note: This requires session management infrastructure

### Strategy 5: Use Implicit Flow (Not Recommended)
**Rationale**: Skip PKCE entirely (less secure, but simpler).

**Implementation**:
1. Use implicit OAuth flow
2. No code verifier needed
3. Note: Less secure, may not be supported by Supabase

### Strategy 6: Use Supabase Hosted Auth Pages
**Rationale**: Let Supabase handle the entire OAuth flow.

**Implementation**:
1. Redirect to Supabase hosted auth pages
2. Handle callback on Supabase side
3. Redirect back to app with session
4. Note: Less control over UX

---

## Recommended Implementation Plan

### Step 1: Simplify to Default Behavior
Remove all custom cookie handling and use `@supabase/ssr` defaults.

### Step 2: Add Comprehensive Logging
Add logging at every step to track cookie lifecycle.

### Step 3: Test Cookie Setting
Verify cookie is set with correct attributes before redirect.

### Step 4: Test Cookie Receiving
Verify cookie is received by server with correct attributes.

### Step 5: Verify Environment Alignment
Ensure all URLs match across all services.

### Step 6: Test in Multiple Browsers
Verify behavior across different browsers and privacy settings.

### Step 7: Fallback Strategy
Implement fallback if cookies continue to fail.

---

## Success Criteria

1. Cookie is set before redirect with correct attributes
2. Cookie is received by server during callback
3. Cookie survives entire OAuth redirect chain
4. `exchangeCodeForSession` succeeds
5. User is authenticated and redirected to dashboard
6. Works in all major browsers
7. Works in private/incognito mode (if cookies are supported)

---

## Next Steps

1. Review this analysis
2. Choose implementation strategy
3. Implement fixes systematically
4. Test each fix independently
5. Document what works

