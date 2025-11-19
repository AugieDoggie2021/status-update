# Azure DevOps Integration Setup Guide

This guide walks you through setting up the Azure DevOps integration for bidirectional synchronization between Azure DevOps work items and Status Tracker entities.

## Prerequisites

- Azure DevOps organization with admin access
- Azure AD application registration permissions
- Supabase project with admin access
- Status Tracker application deployed (or running locally)

## Step 1: Run Database Migrations

Run the following migrations in your Supabase SQL Editor **in order**:

1. `scripts/migrations/009_add_ado_connections.sql`
2. `scripts/migrations/010_add_ado_field_mappings.sql`
3. `scripts/migrations/011_add_ado_sync_mappings.sql`
4. `scripts/migrations/012_add_ado_sync_jobs.sql`

**Verification:**
```sql
-- Check that tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'ado_%'
ORDER BY table_name;
```

You should see:
- `ado_connections`
- `ado_field_mappings`
- `ado_sync_mappings`
- `ado_sync_jobs`

## Step 2: Register Azure AD Application

### 2.1 Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: `Status Tracker ADO Integration` (or your preferred name)
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: 
     - Platform: Web
     - URI: `https://your-app-domain.vercel.app/api/integrations/ado/callback`
     - For local dev: `http://localhost:3000/api/integrations/ado/callback`
5. Click **Register**

### 2.2 Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Azure DevOps**
4. Choose **Delegated permissions**
5. Select the following scopes:
   - `vso.work_write` - Write work items
   - `vso.work_read` - Read work items
6. Click **Add permissions**
7. **Important**: Click **Grant admin consent** for your organization

### 2.3 Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Enter a description (e.g., "Status Tracker Integration")
4. Choose expiration (recommend 24 months)
5. Click **Add**
6. **Copy the secret value immediately** - you won't be able to see it again!

### 2.4 Note Your Application Details

You'll need:
- **Application (client) ID**: Found on the Overview page
- **Client secret value**: From step 2.3
- **Directory (tenant) ID**: Found on the Overview page (optional, may be needed)

## Step 3: Configure Environment Variables

Add the following to your `.env.local` file (for local development) and Vercel environment variables (for production):

```env
# Azure DevOps OAuth Configuration
AZURE_DEVOPS_CLIENT_ID="your-client-id-from-azure-portal"
AZURE_DEVOPS_CLIENT_SECRET="your-client-secret-value"
AZURE_DEVOPS_REDIRECT_URI="https://your-app-domain.vercel.app/api/integrations/ado/callback"

# Token Encryption (Optional - will auto-generate if not set)
# Generate a 32-byte hex string: openssl rand -hex 32
ADO_TOKEN_ENCRYPTION_KEY="your-64-character-hex-string"
```

**Important Notes:**
- `AZURE_DEVOPS_REDIRECT_URI` must match exactly what you configured in Azure AD
- For local development, use `http://localhost:3000/api/integrations/ado/callback`
- For production, use your Vercel deployment URL
- `ADO_TOKEN_ENCRYPTION_KEY` should be a secure random 64-character hex string
  - Generate with: `openssl rand -hex 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - **Keep this secret secure** - it encrypts OAuth tokens in the database

## Step 4: Update Supabase Redirect URLs

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **URL Configuration**
3. Add to **Redirect URLs**:
   - `https://your-app-domain.vercel.app/api/integrations/ado/callback`
   - `http://localhost:3000/api/integrations/ado/callback` (for local dev)

## Step 5: Test the Integration

### 5.1 Connect Azure DevOps

1. Navigate to `/admin/integrations` in your Status Tracker app
2. Click **Connect Azure DevOps**
3. Enter:
   - **Organization URL**: `https://dev.azure.com/your-org-name`
   - **Project Name**: Your Azure DevOps project name
4. Click **Connect**
5. You'll be redirected to Azure AD for authentication
6. Grant permissions when prompted
7. You'll be redirected back to the integrations page

### 5.2 Configure Field Mappings

1. Click **Configure** on your connection
2. Review the default field mappings:
   - **Workstreams** ↔ ADO Epics/Features
   - **Risks** ↔ ADO Risks/Bugs
   - **Actions** ↔ ADO Tasks
3. Add custom mappings if needed

### 5.3 Test Synchronization

1. In the sync panel, select:
   - **Sync Type**: Manual Sync (for testing)
   - **Direction**: Bidirectional
2. Click **Start Sync**
3. Monitor the sync status and history
4. Verify that work items appear in both systems

## Step 6: Troubleshooting

### OAuth Flow Fails

**Symptoms**: Redirect fails or shows error

**Solutions**:
- Verify `AZURE_DEVOPS_REDIRECT_URI` matches Azure AD configuration exactly
- Check that redirect URLs are added in Supabase
- Ensure client ID and secret are correct
- Verify API permissions are granted and admin consent is given

### Token Refresh Fails

**Symptoms**: Sync stops working after token expires

**Solutions**:
- Check that refresh token was stored during initial connection
- Verify `AZURE_DEVOPS_CLIENT_SECRET` is correct
- Reconnect the integration if refresh token is missing

### Sync Errors

**Symptoms**: Sync job fails with errors

**Solutions**:
- Check sync history for specific error messages
- Verify field mappings are correct
- Ensure work item types match (Epic/Feature for workstreams, etc.)
- Check that user has permissions in Azure DevOps project

### Database Errors

**Symptoms**: Migration fails or tables missing

**Solutions**:
- Run migrations in order (009 → 010 → 011 → 012)
- Check Supabase logs for specific errors
- Verify RLS policies were created correctly
- Ensure you have admin access to Supabase

## Security Best Practices

1. **Encryption Key**: Use a strong, randomly generated encryption key for `ADO_TOKEN_ENCRYPTION_KEY`
2. **Client Secret**: Never commit client secrets to version control
3. **Token Storage**: Tokens are encrypted at rest in the database
4. **Access Control**: Only OWNERs can manage connections (enforced by RLS)
5. **Audit Logging**: All sync operations are logged in `ado_sync_jobs` table

## Next Steps

After successful setup:

1. **Configure Default Mappings**: Review and adjust default field mappings for your use case
2. **Test Bidirectional Sync**: Verify data flows correctly in both directions
3. **Set Up Scheduled Syncs**: (Future enhancement) Configure automatic periodic syncs
4. **Monitor Sync Jobs**: Regularly check sync history for errors or issues

## Support

For issues or questions:
- Check sync job history for error details
- Review Supabase logs for database errors
- Check Azure DevOps API logs for permission issues
- Verify environment variables are set correctly

