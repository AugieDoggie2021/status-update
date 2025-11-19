# Azure DevOps Integration Setup - Detailed Implementation Plan

This document provides a step-by-step plan for setting up the Azure DevOps integration feature.

## Overview

The Azure DevOps integration enables bidirectional synchronization between Azure DevOps work items and Status Tracker entities (workstreams, risks, actions). This plan covers all setup steps from database migrations to testing.

## Phase 1: Database Setup

### Step 1.1: Run Database Migrations

**Location**: Supabase SQL Editor

**Files to run** (in order):
1. `scripts/migrations/009_add_ado_connections.sql`
2. `scripts/migrations/010_add_ado_field_mappings.sql`
3. `scripts/migrations/011_add_ado_sync_mappings.sql`
4. `scripts/migrations/012_add_ado_sync_jobs.sql`

**Verification Query**:
```sql
-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'ado_%'
ORDER BY table_name;

-- Should return:
-- ado_connections
-- ado_field_mappings
-- ado_sync_mappings
-- ado_sync_jobs
```

**Verification Query for RLS**:
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'ado_%';

-- All should show rowsecurity = true
```

**Estimated Time**: 5-10 minutes

**Dependencies**: None

**Rollback**: If migration fails, check Supabase logs for specific errors. Each migration is idempotent (uses `IF NOT EXISTS`), so re-running is safe.

---

## Phase 2: Azure AD Application Registration

### Step 2.1: Create App Registration

**Location**: Azure Portal → Azure Active Directory → App registrations

**Steps**:
1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: `Status Tracker ADO Integration` (or your preferred name)
   - **Supported account types**: 
     - Choose based on your needs:
       - "Accounts in this organizational directory only" (single tenant)
       - "Accounts in any organizational directory" (multi-tenant)
   - **Redirect URI**: 
     - Platform: **Web**
     - URI: `https://your-app-domain.vercel.app/api/integrations/ado/callback`
     - For local dev: `http://localhost:3000/api/integrations/ado/callback`
5. Click **Register**

**Output**: Application (client) ID (copy this - you'll need it)

**Estimated Time**: 5 minutes

**Dependencies**: Azure AD admin access

---

### Step 2.2: Configure API Permissions

**Location**: Azure Portal → Your App Registration → API permissions

**Steps**:
1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Azure DevOps**
4. Choose **Delegated permissions**
5. Select the following scopes:
   - `vso.work_write` - Write work items
   - `vso.work_read` - Read work items
6. Click **Add permissions**
7. **CRITICAL**: Click **Grant admin consent for [Your Organization]**
   - This must be done by an Azure AD admin
   - Without admin consent, users will see consent prompts

**Verification**: 
- Check that both permissions show "Granted for [Your Organization]" with a green checkmark
- Status should be "Granted" not "Not granted"

**Estimated Time**: 5 minutes

**Dependencies**: Azure AD admin access (for admin consent)

**Troubleshooting**:
- If "Azure DevOps" doesn't appear in the list, ensure you're using Azure DevOps (not Azure DevOps Server)
- If admin consent fails, verify you have Global Administrator or Application Administrator role

---

### Step 2.3: Create Client Secret

**Location**: Azure Portal → Your App Registration → Certificates & secrets

**Steps**:
1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Enter a description (e.g., "Status Tracker Integration - Production")
4. Choose expiration:
   - **Recommended**: 24 months (longer = less frequent rotation)
   - **Security best practice**: 12 months
5. Click **Add**
6. **CRITICAL**: Copy the **Value** immediately
   - This is the only time you'll see it
   - Store it securely (password manager, secure notes)
   - You'll need this for environment variables

**Output**: Client secret value (copy immediately)

**Estimated Time**: 2 minutes

**Dependencies**: None

**Security Notes**:
- Never commit secrets to version control
- Rotate secrets before expiration
- Use different secrets for dev/staging/production

---

### Step 2.4: Note Application Details

**Location**: Azure Portal → Your App Registration → Overview

**Information to collect**:
- **Application (client) ID**: Found on Overview page
- **Client secret value**: From Step 2.3
- **Directory (tenant) ID**: Found on Overview page (may be needed for some OAuth flows)

**Store these securely** - you'll need them for environment variables.

**Estimated Time**: 1 minute

---

## Phase 3: Environment Configuration

### Step 3.1: Generate Encryption Key

**Purpose**: Encrypts OAuth tokens stored in the database

**Method 1 - Using OpenSSL** (if installed):
```bash
openssl rand -hex 32
```

**Method 2 - Using Node.js**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Method 3 - Using PowerShell**:
```powershell
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**Output**: 64-character hex string (e.g., `a1b2c3d4e5f6...`)

**Security**: 
- Keep this secret secure
- Use different keys for dev/staging/production
- Never commit to version control

**Estimated Time**: 2 minutes

---

### Step 3.2: Configure Local Environment Variables

**File**: `.env.local` (in `advisory-status-tracker/` directory)

**Add the following**:
```env
# Azure DevOps OAuth Configuration
AZURE_DEVOPS_CLIENT_ID="your-client-id-from-step-2.4"
AZURE_DEVOPS_CLIENT_SECRET="your-client-secret-value-from-step-2.3"
AZURE_DEVOPS_REDIRECT_URI="http://localhost:3000/api/integrations/ado/callback"

# Token Encryption Key (from Step 3.1)
ADO_TOKEN_ENCRYPTION_KEY="your-64-character-hex-string"
```

**Important Notes**:
- Replace placeholder values with actual values from Azure Portal
- `AZURE_DEVOPS_REDIRECT_URI` must match exactly what you configured in Azure AD
- For local development, use `http://localhost:3000`
- The encryption key should be a secure random 64-character hex string

**Verification**:
```bash
# Check that variables are set (don't print values)
node -e "console.log('CLIENT_ID:', process.env.AZURE_DEVOPS_CLIENT_ID ? 'SET' : 'MISSING')"
```

**Estimated Time**: 5 minutes

**Dependencies**: Steps 2.3, 2.4, 3.1

---

### Step 3.3: Configure Production Environment Variables

**Location**: Vercel Dashboard → Your Project → Settings → Environment Variables

**Steps**:
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for **Production** environment:
   - `AZURE_DEVOPS_CLIENT_ID` = (from Step 2.4)
   - `AZURE_DEVOPS_CLIENT_SECRET` = (from Step 2.3)
   - `AZURE_DEVOPS_REDIRECT_URI` = `https://your-app-domain.vercel.app/api/integrations/ado/callback`
   - `ADO_TOKEN_ENCRYPTION_KEY` = (from Step 3.1, use a different key for production)

**Important**:
- Use your actual Vercel deployment URL
- Ensure redirect URI matches exactly (including https://)
- Use a different encryption key for production (don't reuse dev key)

**Verification**: 
- After adding variables, trigger a new deployment
- Check deployment logs to ensure variables are loaded (don't log actual values)

**Estimated Time**: 5 minutes

**Dependencies**: Steps 2.3, 2.4, 3.1, Vercel project access

---

## Phase 4: Supabase Configuration

### Step 4.1: Update Supabase Redirect URLs

**Location**: Supabase Dashboard → Authentication → URL Configuration

**Steps**:
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add to **Redirect URLs**:
   - `https://your-app-domain.vercel.app/api/integrations/ado/callback`
   - `http://localhost:3000/api/integrations/ado/callback` (for local dev)

**Why**: Ensures OAuth redirects work correctly

**Estimated Time**: 2 minutes

**Dependencies**: Supabase admin access

---

## Phase 5: Testing

### Step 5.1: Test Local Development Setup

**Prerequisites**:
- All environment variables set in `.env.local`
- Database migrations run
- Dev server running (`npm run dev`)

**Steps**:
1. Navigate to `http://localhost:3000/admin/integrations`
2. Verify you see the integrations page (OWNER role required)
3. Click **Connect Azure DevOps**
4. Enter:
   - Organization URL: `https://dev.azure.com/your-org-name`
   - Project Name: Your Azure DevOps project name
5. Click **Connect**
6. You should be redirected to Azure AD login
7. After authentication, you should be redirected back to `/admin/integrations?success=true`

**Expected Results**:
- OAuth flow completes successfully
- Connection appears in the list
- No errors in browser console or server logs

**Troubleshooting**:
- **Redirect mismatch**: Verify `AZURE_DEVOPS_REDIRECT_URI` matches Azure AD config exactly
- **403 Forbidden**: Verify API permissions are granted with admin consent
- **Connection fails**: Check server logs for specific error messages

**Estimated Time**: 10-15 minutes

**Dependencies**: All previous phases complete

---

### Step 5.2: Test Field Mappings

**Steps**:
1. On the integrations page, click **Configure** on your connection
2. Verify default field mappings are created automatically:
   - Workstream mappings (5 mappings)
   - Risk mappings (4 mappings)
   - Action mappings (4 mappings)
3. Test adding a custom mapping:
   - Click **Add Mapping**
   - Select entity type, ADO field, tracker field
   - Save and verify it appears in the list

**Expected Results**:
- Default mappings appear automatically after first connection
- Custom mappings can be added and deleted
- Mappings persist after page refresh

**Estimated Time**: 5 minutes

**Dependencies**: Step 5.1 complete

---

### Step 5.3: Test Synchronization

**Prerequisites**:
- Azure DevOps project with some work items (Epics, Features, Tasks, Risks, Bugs)
- Connection established (Step 5.1)

**Steps**:
1. In the sync panel, select:
   - **Sync Type**: Manual Sync
   - **Direction**: Bidirectional
2. Click **Start Sync**
3. Monitor sync status:
   - Check sync history table
   - Verify job status changes: pending → running → completed
4. Verify data appears:
   - Check Status Tracker dashboard for synced workstreams
   - Check risks page for synced risks
   - Check actions page for synced actions

**Expected Results**:
- Sync job completes successfully
- Work items appear in Status Tracker
- Sync history shows completed job with item count
- No errors in sync history

**Troubleshooting**:
- **No items synced**: Verify work items exist in ADO and match query criteria (Epic/Feature for workstreams, etc.)
- **Sync fails**: Check sync history for error details
- **Partial sync**: Review error messages in sync job details

**Estimated Time**: 15-20 minutes

**Dependencies**: Step 5.1, 5.2 complete

---

### Step 5.4: Test Bidirectional Sync

**Steps**:
1. Create a workstream in Status Tracker
2. Run sync with direction: **Tracker → ADO**
3. Verify workstream appears as Epic in Azure DevOps
4. Update the Epic in Azure DevOps
5. Run sync with direction: **ADO → Tracker**
6. Verify changes appear in Status Tracker

**Expected Results**:
- Data flows correctly in both directions
- Updates are reflected after sync
- Sync mappings maintain entity relationships

**Estimated Time**: 10 minutes

**Dependencies**: Step 5.3 complete

---

## Phase 6: Production Deployment

### Step 6.1: Deploy to Vercel

**Steps**:
1. Ensure all code is committed and pushed to repository
2. Verify production environment variables are set in Vercel
3. Trigger deployment (or wait for automatic deployment)
4. Monitor deployment logs for errors

**Verification**:
- Deployment completes successfully
- No build errors
- Environment variables are loaded (check logs, don't print values)

**Estimated Time**: 5-10 minutes (depending on build time)

**Dependencies**: All previous phases, Vercel project configured

---

### Step 6.2: Test Production OAuth Flow

**Steps**:
1. Navigate to `https://your-app-domain.vercel.app/admin/integrations`
2. Test connection flow (same as Step 5.1)
3. Verify redirect URL matches production URL exactly

**Expected Results**:
- OAuth flow works in production
- Connection is established successfully
- No redirect errors

**Troubleshooting**:
- **Redirect mismatch**: Update Azure AD redirect URI to match production URL
- **CORS errors**: Verify Supabase redirect URLs include production URL

**Estimated Time**: 10 minutes

**Dependencies**: Step 6.1 complete

---

## Phase 7: Monitoring and Maintenance

### Step 7.1: Set Up Monitoring

**Recommended**:
- Monitor sync job failures in `ado_sync_jobs` table
- Set up alerts for:
  - High error rates in sync jobs
  - Token expiration warnings
  - Failed connection attempts

**SQL Query for Monitoring**:
```sql
-- Check recent sync job failures
SELECT * 
FROM ado_sync_jobs 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check token expiration (tokens expiring in next 7 days)
SELECT 
  ac.id,
  ac.organization_url,
  ac.project_name,
  ac.token_expires_at,
  ac.token_expires_at - NOW() as days_until_expiry
FROM ado_connections ac
WHERE ac.token_expires_at IS NOT NULL
AND ac.token_expires_at < NOW() + INTERVAL '7 days'
ORDER BY ac.token_expires_at ASC;
```

**Estimated Time**: 15 minutes

---

### Step 7.2: Document Configuration

**Create documentation**:
- Azure AD app registration details (client ID, tenant ID)
- Encryption key storage location (secure password manager)
- Connection details per program
- Field mapping customizations

**Estimated Time**: 10 minutes

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: OAuth Redirect Mismatch

**Symptoms**: Error "redirect_uri_mismatch" during OAuth flow

**Solutions**:
1. Verify `AZURE_DEVOPS_REDIRECT_URI` matches Azure AD configuration exactly
2. Check for trailing slashes or protocol mismatches (http vs https)
3. Ensure redirect URLs are added in Supabase Authentication settings

---

#### Issue 2: Token Refresh Fails

**Symptoms**: Sync stops working after token expires

**Solutions**:
1. Verify refresh token was stored during initial connection
2. Check `refresh_token_encrypted` is not null in `ado_connections` table
3. Verify `AZURE_DEVOPS_CLIENT_SECRET` is correct
4. Reconnect integration if refresh token is missing

---

#### Issue 3: Sync Errors - No Items Found

**Symptoms**: Sync completes but no items are synced

**Solutions**:
1. Verify work items exist in Azure DevOps project
2. Check work item types match query criteria:
   - Workstreams: Epic or Feature
   - Risks: Risk or Bug
   - Actions: Task
3. Verify work items are not in "Closed" state (query excludes closed items)
4. Check user has permissions to read work items in ADO project

---

#### Issue 4: Field Mapping Errors

**Symptoms**: Sync fails with field mapping errors

**Solutions**:
1. Verify default mappings were created (check `ado_field_mappings` table)
2. Check ADO field names are correct (e.g., `System.Title` not `Title`)
3. Verify field exists in ADO work item type
4. Check transform functions are valid JSON

---

#### Issue 5: Database Migration Fails

**Symptoms**: Migration errors in Supabase SQL Editor

**Solutions**:
1. Check Supabase logs for specific error messages
2. Verify you have admin access to Supabase
3. Ensure previous migrations (001-008) have been run
4. Check for conflicting table/constraint names
5. Run migrations one at a time to isolate issues

---

## Security Checklist

Before going to production, verify:

- [ ] Client secret is stored securely (not in code)
- [ ] Encryption key is strong and unique per environment
- [ ] OAuth tokens are encrypted at rest
- [ ] RLS policies are enabled and tested
- [ ] Only OWNERs can manage connections (verified)
- [ ] Redirect URLs are restricted to your domains
- [ ] API permissions are minimal (only work_read and work_write)
- [ ] Admin consent is granted (no user consent prompts)
- [ ] Environment variables are set in Vercel (not committed)

---

## Rollback Plan

If you need to rollback:

1. **Disconnect all integrations**: Delete connections via UI or SQL
2. **Remove environment variables**: Remove from Vercel and `.env.local`
3. **Drop tables** (if needed):
   ```sql
   DROP TABLE IF EXISTS ado_sync_jobs CASCADE;
   DROP TABLE IF EXISTS ado_sync_mappings CASCADE;
   DROP TABLE IF EXISTS ado_field_mappings CASCADE;
   DROP TABLE IF EXISTS ado_connections CASCADE;
   ```
4. **Revoke Azure AD permissions**: Remove app registration or revoke permissions

---

## Next Steps After Setup

1. **Configure Custom Mappings**: Adjust field mappings for your specific use case
2. **Test Bidirectional Sync**: Verify data flows correctly both ways
3. **Set Up Scheduled Syncs**: (Future enhancement) Configure automatic periodic syncs
4. **Monitor Sync Jobs**: Regularly check sync history for errors
5. **Document Customizations**: Record any custom field mappings or configurations

---

## Support Resources

- **Azure DevOps REST API Docs**: https://learn.microsoft.com/en-us/rest/api/azure/devops/
- **Azure AD App Registration Guide**: https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app
- **Supabase RLS Documentation**: https://supabase.com/docs/guides/auth/row-level-security
- **Status Tracker Integration Docs**: `docs/AZURE_DEVOPS_SETUP.md`

---

## Estimated Total Time

- **Phase 1 (Database)**: 10 minutes
- **Phase 2 (Azure AD)**: 20 minutes
- **Phase 3 (Environment)**: 15 minutes
- **Phase 4 (Supabase)**: 5 minutes
- **Phase 5 (Testing)**: 45 minutes
- **Phase 6 (Production)**: 20 minutes
- **Phase 7 (Monitoring)**: 25 minutes

**Total**: ~2.5 hours (including testing and troubleshooting)

---

*Last Updated: 2025-01-27*

