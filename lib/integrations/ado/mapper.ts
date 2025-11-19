import { getAdminClient } from '@/lib/supabase';
import { AdoWorkItem, AdoWorkItemUpdate } from './client';
import { Workstream, Risk, ActionItem, Status, Severity, RiskStatus, ActionStatus } from '@/lib/types';

export type EntityType = 'workstream' | 'risk' | 'action';
export type MappingType = 'direct' | 'transform' | 'custom';

export interface FieldMapping {
  id: string;
  connection_id: string;
  entity_type: EntityType;
  ado_field_name: string;
  tracker_field_name: string;
  mapping_type: MappingType;
  transform_function: string | null;
}

/**
 * Get field mappings for a connection
 */
export async function getFieldMappings(connectionId: string): Promise<FieldMapping[]> {
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('ado_field_mappings')
    .select('*')
    .eq('connection_id', connectionId)
    .order('entity_type', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to fetch field mappings: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Apply default field mappings if none exist
 */
export async function ensureDefaultMappings(connectionId: string): Promise<void> {
  const existing = await getFieldMappings(connectionId);
  
  if (existing.length > 0) {
    return; // Mappings already exist
  }
  
  const supabase = getAdminClient();
  const defaultMappings: Omit<FieldMapping, 'id'>[] = [
    // Workstreams ↔ ADO Epics/Features
    { connection_id: connectionId, entity_type: 'workstream', ado_field_name: 'System.Title', tracker_field_name: 'name', mapping_type: 'direct', transform_function: null },
    { connection_id: connectionId, entity_type: 'workstream', ado_field_name: 'System.State', tracker_field_name: 'status', mapping_type: 'transform', transform_function: JSON.stringify({ type: 'state_to_status' }) },
    { connection_id: connectionId, entity_type: 'workstream', ado_field_name: 'System.AssignedTo', tracker_field_name: 'lead', mapping_type: 'transform', transform_function: JSON.stringify({ type: 'extract_display_name' }) },
    { connection_id: connectionId, entity_type: 'workstream', ado_field_name: 'Microsoft.VSTS.Scheduling.PercentComplete', tracker_field_name: 'percent_complete', mapping_type: 'direct', transform_function: null },
    { connection_id: connectionId, entity_type: 'workstream', ado_field_name: 'System.Description', tracker_field_name: 'summary', mapping_type: 'direct', transform_function: null },
    
    // Risks ↔ ADO Risks/Bugs
    { connection_id: connectionId, entity_type: 'risk', ado_field_name: 'System.Title', tracker_field_name: 'title', mapping_type: 'direct', transform_function: null },
    { connection_id: connectionId, entity_type: 'risk', ado_field_name: 'Microsoft.VSTS.Common.Severity', tracker_field_name: 'severity', mapping_type: 'transform', transform_function: JSON.stringify({ type: 'severity_mapping' }) },
    { connection_id: connectionId, entity_type: 'risk', ado_field_name: 'System.State', tracker_field_name: 'status', mapping_type: 'transform', transform_function: JSON.stringify({ type: 'state_to_risk_status' }) },
    { connection_id: connectionId, entity_type: 'risk', ado_field_name: 'System.AssignedTo', tracker_field_name: 'owner', mapping_type: 'transform', transform_function: JSON.stringify({ type: 'extract_display_name' }) },
    
    // Actions ↔ ADO Tasks
    { connection_id: connectionId, entity_type: 'action', ado_field_name: 'System.Title', tracker_field_name: 'title', mapping_type: 'direct', transform_function: null },
    { connection_id: connectionId, entity_type: 'action', ado_field_name: 'System.State', tracker_field_name: 'status', mapping_type: 'transform', transform_function: JSON.stringify({ type: 'state_to_action_status' }) },
    { connection_id: connectionId, entity_type: 'action', ado_field_name: 'System.AssignedTo', tracker_field_name: 'owner', mapping_type: 'transform', transform_function: JSON.stringify({ type: 'extract_display_name' }) },
    { connection_id: connectionId, entity_type: 'action', ado_field_name: 'Microsoft.VSTS.Scheduling.DueDate', tracker_field_name: 'due_date', mapping_type: 'direct', transform_function: null },
  ];
  
  // Insert default mappings
  for (const mapping of defaultMappings) {
    await supabase.from('ado_field_mappings').insert(mapping);
  }
}

/**
 * Map ADO work item to Status Tracker entity
 */
export function mapAdoToTracker(
  adoWorkItem: AdoWorkItem,
  entityType: EntityType,
  mappings: FieldMapping[]
): Partial<Workstream | Risk | ActionItem> {
  const entityMappings = mappings.filter(m => m.entity_type === entityType);
  const result: Record<string, any> = {};
  
  for (const mapping of entityMappings) {
    const adoValue = adoWorkItem.fields[mapping.ado_field_name];
    
    if (adoValue === null || adoValue === undefined) {
      continue;
    }
    
    let mappedValue = adoValue;
    
    // Apply transformation if needed
    if (mapping.mapping_type === 'transform' && mapping.transform_function) {
      const transform = JSON.parse(mapping.transform_function);
      mappedValue = applyTransform(adoValue, transform);
    }
    
    result[mapping.tracker_field_name] = mappedValue;
  }
  
  return result;
}

/**
 * Map Status Tracker entity to ADO work item updates
 */
export function mapTrackerToAdo(
  trackerEntity: Partial<Workstream | Risk | ActionItem>,
  entityType: EntityType,
  mappings: FieldMapping[]
): AdoWorkItemUpdate[] {
  const entityMappings = mappings.filter(m => m.entity_type === entityType);
  const updates: AdoWorkItemUpdate[] = [];
  
  for (const mapping of entityMappings) {
    const trackerValue = (trackerEntity as any)[mapping.tracker_field_name];
    
    if (trackerValue === null || trackerValue === undefined) {
      continue;
    }
    
    let adoValue = trackerValue;
    
    // Apply reverse transformation if needed
    if (mapping.mapping_type === 'transform' && mapping.transform_function) {
      const transform = JSON.parse(mapping.transform_function);
      adoValue = applyReverseTransform(trackerValue, transform);
    }
    
    updates.push({
      op: 'replace',
      path: `/fields/${mapping.ado_field_name}`,
      value: adoValue,
    });
  }
  
  return updates;
}

/**
 * Apply transformation to a value
 */
function applyTransform(value: any, transform: any): any {
  switch (transform.type) {
    case 'state_to_status':
      // Map ADO state to Status Tracker status
      const state = String(value).toLowerCase();
      if (state === 'new' || state === 'active') return 'GREEN';
      if (state === 'resolved' || state === 'closed') return 'RED';
      return 'YELLOW';
    
    case 'state_to_risk_status':
      const riskState = String(value).toLowerCase();
      if (riskState === 'new' || riskState === 'active') return 'OPEN';
      if (riskState === 'resolved') return 'MITIGATED';
      if (riskState === 'closed') return 'CLOSED';
      return 'OPEN';
    
    case 'state_to_action_status':
      const actionState = String(value).toLowerCase();
      if (actionState === 'new') return 'OPEN';
      if (actionState === 'active' || actionState === 'in progress') return 'IN_PROGRESS';
      if (actionState === 'resolved' || actionState === 'closed' || actionState === 'done') return 'DONE';
      return 'OPEN';
    
    case 'severity_mapping':
      // ADO severity: 1-Low, 2-Medium, 3-High
      const severityNum = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (severityNum === 1) return 'LOW';
      if (severityNum === 2) return 'MEDIUM';
      if (severityNum === 3) return 'HIGH';
      return 'MEDIUM';
    
    case 'extract_display_name':
      // Extract display name from ADO identity object
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && 'displayName' in value) {
        return value.displayName;
      }
      if (value && typeof value === 'object' && 'uniqueName' in value) {
        return value.uniqueName.split('@')[0];
      }
      return null;
    
    default:
      return value;
  }
}

/**
 * Apply reverse transformation (Tracker → ADO)
 */
function applyReverseTransform(value: any, transform: any): any {
  switch (transform.type) {
    case 'state_to_status':
      // Map Status Tracker status to ADO state
      const status = String(value).toUpperCase();
      if (status === 'GREEN') return 'Active';
      if (status === 'RED') return 'Resolved';
      return 'Active';
    
    case 'state_to_risk_status':
      const riskStatus = String(value).toUpperCase();
      if (riskStatus === 'OPEN') return 'Active';
      if (riskStatus === 'MITIGATED') return 'Resolved';
      if (riskStatus === 'CLOSED') return 'Closed';
      return 'Active';
    
    case 'state_to_action_status':
      const actionStatus = String(value).toUpperCase();
      if (actionStatus === 'OPEN') return 'New';
      if (actionStatus === 'IN_PROGRESS') return 'Active';
      if (actionStatus === 'DONE') return 'Closed';
      return 'New';
    
    case 'severity_mapping':
      // Map Status Tracker severity to ADO severity number
      const severity = String(value).toUpperCase();
      if (severity === 'LOW') return 1;
      if (severity === 'MEDIUM') return 2;
      if (severity === 'HIGH') return 3;
      return 2;
    
    case 'extract_display_name':
      // For reverse mapping, we'd need to look up the ADO identity
      // For now, just return the value as-is
      return value;
    
    default:
      return value;
  }
}

