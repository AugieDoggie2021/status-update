import { getAccessToken } from './auth';
import { getAdminClient } from '@/lib/supabase';

export interface AdoWorkItem {
  id: number;
  rev: number;
  fields: Record<string, any>;
  url: string;
}

export interface AdoWorkItemUpdate {
  op: 'add' | 'replace' | 'remove';
  path: string;
  value: any;
}

/**
 * Create authenticated Azure DevOps REST API client
 */
export async function createAdoClient(connectionId: string) {
  const supabase = getAdminClient();
  
  const { data: connection, error } = await supabase
    .from('ado_connections')
    .select('organization_url, project_name')
    .eq('id', connectionId)
    .single();
  
  if (error || !connection) {
    throw new Error(`Connection not found: ${connectionId}`);
  }
  
  const accessToken = await getAccessToken(connectionId);
  const baseUrl = `${connection.organization_url}/${connection.project_name}`;
  
  return {
    baseUrl,
    accessToken,
    organizationUrl: connection.organization_url,
    projectName: connection.project_name,
  };
}

/**
 * Fetch work items using WIQL (Work Item Query Language)
 */
export async function getWorkItemsByQuery(
  connectionId: string,
  wiql: string
): Promise<AdoWorkItem[]> {
  const client = await createAdoClient(connectionId);
  
  // Execute WIQL query
  const queryUrl = `${client.baseUrl}/_apis/wit/wiql?api-version=7.1`;
  const queryResponse = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${client.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: wiql }),
  });
  
  if (!queryResponse.ok) {
    const errorText = await queryResponse.text();
    throw new Error(`WIQL query failed: ${queryResponse.status} ${errorText}`);
  }
  
  const queryResult = await queryResponse.json();
  const workItemIds = queryResult.workItems.map((wi: any) => wi.id);
  
  if (workItemIds.length === 0) {
    return [];
  }
  
  // Fetch work item details
  return await getWorkItemsByIds(connectionId, workItemIds);
}

/**
 * Fetch work items by IDs
 */
export async function getWorkItemsByIds(
  connectionId: string,
  workItemIds: number[]
): Promise<AdoWorkItem[]> {
  if (workItemIds.length === 0) {
    return [];
  }
  
  const client = await createAdoClient(connectionId);
  
  // ADO API supports up to 200 IDs per request
  const batchSize = 200;
  const batches: number[][] = [];
  for (let i = 0; i < workItemIds.length; i += batchSize) {
    batches.push(workItemIds.slice(i, i + batchSize));
  }
  
  const allWorkItems: AdoWorkItem[] = [];
  
  for (const batch of batches) {
    const idsParam = batch.join(',');
    const workItemsUrl = `${client.baseUrl}/_apis/wit/workitems?ids=${idsParam}&$expand=all&api-version=7.1`;
    
    const response = await fetch(workItemsUrl, {
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch work items: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    allWorkItems.push(...data.value);
  }
  
  return allWorkItems;
}

/**
 * Get a single work item by ID
 */
export async function getWorkItem(
  connectionId: string,
  workItemId: number
): Promise<AdoWorkItem> {
  const client = await createAdoClient(connectionId);
  
  const workItemUrl = `${client.baseUrl}/_apis/wit/workitems/${workItemId}?$expand=all&api-version=7.1`;
  
  const response = await fetch(workItemUrl, {
    headers: {
      'Authorization': `Bearer ${client.accessToken}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch work item: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Update a work item
 */
export async function updateWorkItem(
  connectionId: string,
  workItemId: number,
  updates: AdoWorkItemUpdate[]
): Promise<AdoWorkItem> {
  const client = await createAdoClient(connectionId);
  
  // First get current revision
  const current = await getWorkItem(connectionId, workItemId);
  
  const updateUrl = `${client.baseUrl}/_apis/wit/workitems/${workItemId}?api-version=7.1`;
  
  const response = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${client.accessToken}`,
      'Content-Type': 'application/json-patch+json',
      'If-Match': `"${current.rev}"`,
    },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update work item: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Create a new work item
 */
export async function createWorkItem(
  connectionId: string,
  workItemType: string,
  fields: Record<string, any>
): Promise<AdoWorkItem> {
  const client = await createAdoClient(connectionId);
  
  const updates: AdoWorkItemUpdate[] = [
    {
      op: 'add',
      path: '/fields/System.Title',
      value: fields['System.Title'] || 'Untitled',
    },
  ];
  
  // Add all other fields
  for (const [key, value] of Object.entries(fields)) {
    if (key !== 'System.Title' && value !== null && value !== undefined) {
      updates.push({
        op: 'add',
        path: `/fields/${key}`,
        value,
      });
    }
  }
  
  const createUrl = `${client.baseUrl}/_apis/wit/workitems/$${workItemType}?api-version=7.1`;
  
  const response = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${client.accessToken}`,
      'Content-Type': 'application/json-patch+json',
    },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create work item: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Get work item revisions (for incremental sync)
 */
export async function getWorkItemRevisions(
  connectionId: string,
  workItemId: number,
  since?: Date
): Promise<AdoWorkItem[]> {
  const client = await createAdoClient(connectionId);
  
  let revisionsUrl = `${client.baseUrl}/_apis/wit/workitems/${workItemId}/revisions?$expand=all&api-version=7.1`;
  
  if (since) {
    // Filter by changed date if provided
    const sinceDate = since.toISOString();
    revisionsUrl += `&$filter=System.ChangedDate ge ${sinceDate}`;
  }
  
  const response = await fetch(revisionsUrl, {
    headers: {
      'Authorization': `Bearer ${client.accessToken}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch revisions: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  return data.value || [];
}

