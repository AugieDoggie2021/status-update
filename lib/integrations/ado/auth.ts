import crypto from 'crypto';
import { getAdminClient } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth';

// Encryption key from environment (should be a 32-byte hex string)
const ENCRYPTION_KEY = process.env.ADO_TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt a token before storing in database
 */
export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return IV + authTag + encrypted data as hex strings, separated by ':'
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a token from database
 */
export function decryptToken(encryptedToken: string): string {
  const parts = encryptedToken.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate OAuth authorization URL for Azure DevOps
 */
export function initiateOAuthFlow(
  organizationUrl: string,
  projectName: string,
  programId: string
): string {
  const clientId = process.env.AZURE_DEVOPS_CLIENT_ID;
  const redirectUri = process.env.AZURE_DEVOPS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/integrations/ado/callback`;
  
  if (!clientId) {
    throw new Error('AZURE_DEVOPS_CLIENT_ID environment variable is not set');
  }
  
  // Create state parameter with programId and project info (base64 encoded)
  const state = Buffer.from(JSON.stringify({ programId, organizationUrl, projectName })).toString('base64');
  
  // Azure DevOps OAuth endpoint
  const authUrl = new URL(`https://app.vssps.visualstudio.com/oauth2/authorize`);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'Assertion');
  authUrl.searchParams.set('scope', 'vso.work_write vso.work_read');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  
  return authUrl.toString();
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(code: string, state: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const clientId = process.env.AZURE_DEVOPS_CLIENT_ID;
  const clientSecret = process.env.AZURE_DEVOPS_CLIENT_SECRET;
  const redirectUri = process.env.AZURE_DEVOPS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/integrations/ado/callback`;
  
  if (!clientId || !clientSecret) {
    throw new Error('Azure DevOps OAuth credentials not configured');
  }
  
  // Exchange code for token
  const tokenUrl = 'https://app.vssps.visualstudio.com/oauth2/token';
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientSecret,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: code,
      redirect_uri: redirectUri,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code for token: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in ? parseInt(data.expires_in, 10) : undefined,
  };
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(connectionId: string): Promise<string> {
  const supabase = getAdminClient();
  
  // Get connection with encrypted tokens
  const { data: connection, error } = await supabase
    .from('ado_connections')
    .select('refresh_token_encrypted, token_expires_at')
    .eq('id', connectionId)
    .single();
  
  if (error || !connection) {
    throw new Error(`Connection not found: ${connectionId}`);
  }
  
  if (!connection.refresh_token_encrypted) {
    throw new Error('No refresh token available');
  }
  
  const refreshToken = decryptToken(connection.refresh_token_encrypted);
  const clientId = process.env.AZURE_DEVOPS_CLIENT_ID;
  const clientSecret = process.env.AZURE_DEVOPS_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Azure DevOps OAuth credentials not configured');
  }
  
  // Refresh token
  const tokenUrl = 'https://app.vssps.visualstudio.com/oauth2/token';
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientSecret,
      grant_type: 'refresh_token',
      assertion: refreshToken,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  const newAccessToken = data.access_token;
  
  // Update connection with new token
  const expiresAt = data.expires_in
    ? new Date(Date.now() + parseInt(data.expires_in, 10) * 1000).toISOString()
    : null;
  
  await supabase
    .from('ado_connections')
    .update({
      access_token_encrypted: encryptToken(newAccessToken),
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId);
  
  return newAccessToken;
}

/**
 * Get decrypted access token, refreshing if necessary
 */
export async function getAccessToken(connectionId: string): Promise<string> {
  const supabase = getAdminClient();
  
  const { data: connection, error } = await supabase
    .from('ado_connections')
    .select('access_token_encrypted, token_expires_at')
    .eq('id', connectionId)
    .single();
  
  if (error || !connection) {
    throw new Error(`Connection not found: ${connectionId}`);
  }
  
  // Check if token is expired or expires within 5 minutes
  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at)
    : null;
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  if (expiresAt && expiresAt < fiveMinutesFromNow) {
    // Token expired or expiring soon, refresh it
    return await refreshAccessToken(connectionId);
  }
  
  return decryptToken(connection.access_token_encrypted);
}

