import { getAdminClient } from '@/lib/supabase';
import { getWorkItemsByQuery, getWorkItemRevisions, createWorkItem, updateWorkItem, getWorkItem } from './client';
import { mapAdoToTracker, mapTrackerToAdo, getFieldMappings, ensureDefaultMappings } from './mapper';
import { Workstream, Risk, ActionItem } from '@/lib/types';

export type SyncDirection = 'ado_to_tracker' | 'tracker_to_ado' | 'bidirectional';
export type SyncType = 'full_sync' | 'incremental_sync' | 'manual_sync';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SyncResult {
  itemsSynced: number;
  errors: Array<{ entityId?: string; error: string }>;
}

/**
 * Create a sync job record
 */
export async function createSyncJob(
  connectionId: string,
  jobType: SyncType,
  createdBy: string
): Promise<string> {
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('ado_sync_jobs')
    .insert({
      connection_id: connectionId,
      job_type: jobType,
      status: 'pending',
      created_by: createdBy,
    })
    .select('id')
    .single();
  
  if (error || !data) {
    throw new Error(`Failed to create sync job: ${error?.message || 'Unknown error'}`);
  }
  
  return data.id;
}

/**
 * Update sync job status
 */
export async function updateSyncJob(
  jobId: string,
  status: JobStatus,
  results?: SyncResult
): Promise<void> {
  const supabase = getAdminClient();
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  
  if (status === 'running' && !results) {
    updateData.started_at = new Date().toISOString();
  }
  
  if (status === 'completed' || status === 'failed') {
    updateData.completed_at = new Date().toISOString();
  }
  
  if (results) {
    updateData.items_synced = results.itemsSynced;
    updateData.errors = results.errors;
  }
  
  const { error } = await supabase
    .from('ado_sync_jobs')
    .update(updateData)
    .eq('id', jobId);
  
  if (error) {
    throw new Error(`Failed to update sync job: ${error.message}`);
  }
}

/**
 * Sync workstreams between ADO and Status Tracker
 */
export async function syncWorkstreams(
  connectionId: string,
  direction: SyncDirection,
  programId: string
): Promise<SyncResult> {
  const supabase = getAdminClient();
  await ensureDefaultMappings(connectionId);
  const mappings = await getFieldMappings(connectionId);
  
  const result: SyncResult = {
    itemsSynced: 0,
    errors: [],
  };
  
  try {
    if (direction === 'ado_to_tracker' || direction === 'bidirectional') {
      // Sync from ADO to Tracker
      const adoWorkItems = await getWorkItemsByQuery(
        connectionId,
        "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] IN ('Epic', 'Feature') AND [System.State] <> 'Closed'"
      );
      
      for (const adoItem of adoWorkItems) {
        try {
          const mapped = mapAdoToTracker(adoItem, 'workstream', mappings);
          
          // Check if sync mapping exists
          const { data: existingMapping } = await supabase
            .from('ado_sync_mappings')
            .select('tracker_entity_id')
            .eq('connection_id', connectionId)
            .eq('ado_work_item_id', adoItem.id)
            .eq('entity_type', 'workstream')
            .single();
          
          if (existingMapping) {
            // Update existing workstream
            const { error: updateError } = await supabase
              .from('workstreams')
              .update({
                ...mapped,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingMapping.tracker_entity_id)
              .eq('program_id', programId);
            
            if (updateError) {
              result.errors.push({ entityId: existingMapping.tracker_entity_id, error: updateError.message });
            } else {
              result.itemsSynced++;
              
              // Update sync mapping timestamp
              await supabase
                .from('ado_sync_mappings')
                .update({ last_synced_at: new Date().toISOString() })
                .eq('connection_id', connectionId)
                .eq('ado_work_item_id', adoItem.id);
            }
          } else {
            // Create new workstream
            const mappedData = mapped as Partial<Workstream>;
            const { data: newWorkstream, error: insertError } = await supabase
              .from('workstreams')
              .insert({
                program_id: programId,
                name: mappedData.name || `Workstream ${adoItem.id}`,
                status: mappedData.status || 'GREEN',
                percent_complete: mappedData.percent_complete || 0,
                summary: mappedData.summary || '',
                lead: mappedData.lead || null,
                next_milestone: mappedData.next_milestone || null,
                next_milestone_due: mappedData.next_milestone_due || null,
              })
              .select('id')
              .single();
            
            if (insertError || !newWorkstream) {
              result.errors.push({ error: insertError?.message || 'Failed to create workstream' });
            } else {
              result.itemsSynced++;
              
              // Create sync mapping
              await supabase.from('ado_sync_mappings').insert({
                connection_id: connectionId,
                entity_type: 'workstream',
                tracker_entity_id: newWorkstream.id,
                ado_work_item_id: adoItem.id,
                ado_work_item_type: adoItem.fields['System.WorkItemType'] || 'Epic',
                last_synced_at: new Date().toISOString(),
              });
            }
          }
        } catch (error) {
          result.errors.push({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }
    
    if (direction === 'tracker_to_ado' || direction === 'bidirectional') {
      // Sync from Tracker to ADO
      const { data: workstreams } = await supabase
        .from('workstreams')
        .select('*')
        .eq('program_id', programId)
        .is('deleted_at', null);
      
      if (workstreams) {
        for (const workstream of workstreams) {
          try {
            // Check if sync mapping exists
            const { data: existingMapping } = await supabase
              .from('ado_sync_mappings')
              .select('ado_work_item_id')
              .eq('connection_id', connectionId)
              .eq('tracker_entity_id', workstream.id)
              .eq('entity_type', 'workstream')
              .single();
            
            const updates = mapTrackerToAdo(workstream, 'workstream', mappings);
            
            if (existingMapping) {
              // Update existing ADO work item
              await updateWorkItem(connectionId, existingMapping.ado_work_item_id, updates);
              result.itemsSynced++;
              
              // Update sync mapping timestamp
              await supabase
                .from('ado_sync_mappings')
                .update({ last_synced_at: new Date().toISOString() })
                .eq('connection_id', connectionId)
                .eq('tracker_entity_id', workstream.id);
            } else {
              // Create new ADO work item
              const adoItem = await createWorkItem(connectionId, 'Epic', {
                'System.Title': workstream.name,
                'System.Description': workstream.summary,
              });
              
              // Apply remaining updates
              if (updates.length > 0) {
                await updateWorkItem(connectionId, adoItem.id, updates);
              }
              
              result.itemsSynced++;
              
              // Create sync mapping
              await supabase.from('ado_sync_mappings').insert({
                connection_id: connectionId,
                entity_type: 'workstream',
                tracker_entity_id: workstream.id,
                ado_work_item_id: adoItem.id,
                ado_work_item_type: 'Epic',
                last_synced_at: new Date().toISOString(),
              });
            }
          } catch (error) {
            result.errors.push({ entityId: workstream.id, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
      }
    }
  } catch (error) {
    result.errors.push({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
  
  return result;
}

/**
 * Sync risks between ADO and Status Tracker
 */
export async function syncRisks(
  connectionId: string,
  direction: SyncDirection,
  programId: string
): Promise<SyncResult> {
  const supabase = getAdminClient();
  await ensureDefaultMappings(connectionId);
  const mappings = await getFieldMappings(connectionId);
  
  const result: SyncResult = {
    itemsSynced: 0,
    errors: [],
  };
  
  try {
    if (direction === 'ado_to_tracker' || direction === 'bidirectional') {
      // Sync from ADO to Tracker
      const adoWorkItems = await getWorkItemsByQuery(
        connectionId,
        "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] IN ('Risk', 'Bug') AND [System.State] <> 'Closed'"
      );
      
      for (const adoItem of adoWorkItems) {
        try {
          const mapped = mapAdoToTracker(adoItem, 'risk', mappings);
          
          // Check if sync mapping exists
          const { data: existingMapping } = await supabase
            .from('ado_sync_mappings')
            .select('tracker_entity_id')
            .eq('connection_id', connectionId)
            .eq('ado_work_item_id', adoItem.id)
            .eq('entity_type', 'risk')
            .single();
          
          if (existingMapping) {
            // Update existing risk
            const { error: updateError } = await supabase
              .from('risks')
              .update(mapped)
              .eq('id', existingMapping.tracker_entity_id)
              .eq('program_id', programId);
            
            if (updateError) {
              result.errors.push({ entityId: existingMapping.tracker_entity_id, error: updateError.message });
            } else {
              result.itemsSynced++;
              await supabase
                .from('ado_sync_mappings')
                .update({ last_synced_at: new Date().toISOString() })
                .eq('connection_id', connectionId)
                .eq('ado_work_item_id', adoItem.id);
            }
          } else {
            // Create new risk
            const mappedData = mapped as Partial<Risk>;
            const { data: newRisk, error: insertError } = await supabase
              .from('risks')
              .insert({
                program_id: programId,
                title: mappedData.title || `Risk ${adoItem.id}`,
                severity: mappedData.severity || 'MEDIUM',
                status: mappedData.status || 'OPEN',
                owner: mappedData.owner || null,
                due_date: mappedData.due_date || null,
                notes: mappedData.notes || null,
                workstream_id: mappedData.workstream_id || null,
              })
              .select('id')
              .single();
            
            if (insertError || !newRisk) {
              result.errors.push({ error: insertError?.message || 'Failed to create risk' });
            } else {
              result.itemsSynced++;
              await supabase.from('ado_sync_mappings').insert({
                connection_id: connectionId,
                entity_type: 'risk',
                tracker_entity_id: newRisk.id,
                ado_work_item_id: adoItem.id,
                ado_work_item_type: adoItem.fields['System.WorkItemType'] || 'Risk',
                last_synced_at: new Date().toISOString(),
              });
            }
          }
        } catch (error) {
          result.errors.push({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }
    
    if (direction === 'tracker_to_ado' || direction === 'bidirectional') {
      // Sync from Tracker to ADO
      const { data: risks } = await supabase
        .from('risks')
        .select('*')
        .eq('program_id', programId);
      
      if (risks) {
        for (const risk of risks) {
          try {
            const { data: existingMapping } = await supabase
              .from('ado_sync_mappings')
              .select('ado_work_item_id')
              .eq('connection_id', connectionId)
              .eq('tracker_entity_id', risk.id)
              .eq('entity_type', 'risk')
              .single();
            
            const updates = mapTrackerToAdo(risk, 'risk', mappings);
            
            if (existingMapping) {
              await updateWorkItem(connectionId, existingMapping.ado_work_item_id, updates);
              result.itemsSynced++;
              await supabase
                .from('ado_sync_mappings')
                .update({ last_synced_at: new Date().toISOString() })
                .eq('connection_id', connectionId)
                .eq('tracker_entity_id', risk.id);
            } else {
              const adoItem = await createWorkItem(connectionId, 'Risk', {
                'System.Title': risk.title,
              });
              
              if (updates.length > 0) {
                await updateWorkItem(connectionId, adoItem.id, updates);
              }
              
              result.itemsSynced++;
              await supabase.from('ado_sync_mappings').insert({
                connection_id: connectionId,
                entity_type: 'risk',
                tracker_entity_id: risk.id,
                ado_work_item_id: adoItem.id,
                ado_work_item_type: 'Risk',
                last_synced_at: new Date().toISOString(),
              });
            }
          } catch (error) {
            result.errors.push({ entityId: risk.id, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
      }
    }
  } catch (error) {
    result.errors.push({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
  
  return result;
}

/**
 * Sync actions between ADO and Status Tracker
 */
export async function syncActions(
  connectionId: string,
  direction: SyncDirection,
  programId: string
): Promise<SyncResult> {
  const supabase = getAdminClient();
  await ensureDefaultMappings(connectionId);
  const mappings = await getFieldMappings(connectionId);
  
  const result: SyncResult = {
    itemsSynced: 0,
    errors: [],
  };
  
  try {
    if (direction === 'ado_to_tracker' || direction === 'bidirectional') {
      const adoWorkItems = await getWorkItemsByQuery(
        connectionId,
        "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Task' AND [System.State] <> 'Closed'"
      );
      
      for (const adoItem of adoWorkItems) {
        try {
          const mapped = mapAdoToTracker(adoItem, 'action', mappings);
          
          const { data: existingMapping } = await supabase
            .from('ado_sync_mappings')
            .select('tracker_entity_id')
            .eq('connection_id', connectionId)
            .eq('ado_work_item_id', adoItem.id)
            .eq('entity_type', 'action')
            .single();
          
          if (existingMapping) {
            const { error: updateError } = await supabase
              .from('actions')
              .update(mapped)
              .eq('id', existingMapping.tracker_entity_id)
              .eq('program_id', programId);
            
            if (updateError) {
              result.errors.push({ entityId: existingMapping.tracker_entity_id, error: updateError.message });
            } else {
              result.itemsSynced++;
              await supabase
                .from('ado_sync_mappings')
                .update({ last_synced_at: new Date().toISOString() })
                .eq('connection_id', connectionId)
                .eq('ado_work_item_id', adoItem.id);
            }
          } else {
            const mappedData = mapped as Partial<ActionItem>;
            const { data: newAction, error: insertError } = await supabase
              .from('actions')
              .insert({
                program_id: programId,
                title: mappedData.title || `Action ${adoItem.id}`,
                status: mappedData.status || 'OPEN',
                owner: mappedData.owner || null,
                due_date: mappedData.due_date || null,
                notes: mappedData.notes || null,
                workstream_id: mappedData.workstream_id || null,
              })
              .select('id')
              .single();
            
            if (insertError || !newAction) {
              result.errors.push({ error: insertError?.message || 'Failed to create action' });
            } else {
              result.itemsSynced++;
              await supabase.from('ado_sync_mappings').insert({
                connection_id: connectionId,
                entity_type: 'action',
                tracker_entity_id: newAction.id,
                ado_work_item_id: adoItem.id,
                ado_work_item_type: 'Task',
                last_synced_at: new Date().toISOString(),
              });
            }
          }
        } catch (error) {
          result.errors.push({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }
    
    if (direction === 'tracker_to_ado' || direction === 'bidirectional') {
      const { data: actions } = await supabase
        .from('actions')
        .select('*')
        .eq('program_id', programId);
      
      if (actions) {
        for (const action of actions) {
          try {
            const { data: existingMapping } = await supabase
              .from('ado_sync_mappings')
              .select('ado_work_item_id')
              .eq('connection_id', connectionId)
              .eq('tracker_entity_id', action.id)
              .eq('entity_type', 'action')
              .single();
            
            const updates = mapTrackerToAdo(action, 'action', mappings);
            
            if (existingMapping) {
              await updateWorkItem(connectionId, existingMapping.ado_work_item_id, updates);
              result.itemsSynced++;
              await supabase
                .from('ado_sync_mappings')
                .update({ last_synced_at: new Date().toISOString() })
                .eq('connection_id', connectionId)
                .eq('tracker_entity_id', action.id);
            } else {
              const adoItem = await createWorkItem(connectionId, 'Task', {
                'System.Title': action.title,
              });
              
              if (updates.length > 0) {
                await updateWorkItem(connectionId, adoItem.id, updates);
              }
              
              result.itemsSynced++;
              await supabase.from('ado_sync_mappings').insert({
                connection_id: connectionId,
                entity_type: 'action',
                tracker_entity_id: action.id,
                ado_work_item_id: adoItem.id,
                ado_work_item_type: 'Task',
                last_synced_at: new Date().toISOString(),
              });
            }
          } catch (error) {
            result.errors.push({ entityId: action.id, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
      }
    }
  } catch (error) {
    result.errors.push({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
  
  return result;
}

