/**
 * Alias helpers for workstream name resolution
 * Returns a map of workstream ID -> array of aliases
 */

import { getAdminClient } from '@/lib/supabase';

/**
 * Get alias map for workstreams in a program
 * Returns { [workstreamId]: ["alias1", "alias2"] }
 * 
 * For now, returns a hardcoded map. In the future, this could query
 * a workstream_aliases table or similar.
 */
export async function getAliasMap(programId: string): Promise<Record<string, string[]>> {
  // TODO: If you add a workstream_aliases table, query it here
  // For now, return hardcoded aliases for common workstreams
  
  const supabase = getAdminClient();
  
  // Get all workstreams to build alias map
  const { data: workstreams } = await supabase
    .from('workstreams')
    .select('id, name')
    .eq('program_id', programId)
    .is('deleted_at', null);

  const aliasMap: Record<string, string[]> = {};

  if (!workstreams) return aliasMap;

  // Hardcoded aliases for common patterns
  for (const ws of workstreams) {
    const name = (ws.name ?? '').toLowerCase();
    const aliases: string[] = [];

    // "Modeling & Analytics" -> ["M&A", "Modeling Analytics", "M and A"]
    if (name.includes('modeling') && name.includes('analytics')) {
      aliases.push('M&A', 'M and A', 'Modeling Analytics', 'M & A');
    }

    // "Data Pipeline Ingest" -> ["Data Ingest", "Pipeline Ingest", "DPI"]
    if (name.includes('data pipeline') && name.includes('ingest')) {
      aliases.push('Data Ingest', 'Pipeline Ingest', 'DPI');
    }

    // Add abbreviation if name has multiple words
    const words = (ws.name ?? '').split(/\s+/).filter((segment): segment is string => Boolean(segment));
    if (words.length >= 2) {
      const abbrev = words.map((word: string) => word[0] ?? '').join('');
      if (abbrev.length >= 2) {
        aliases.push(abbrev);
      }
    }

    if (aliases.length > 0) {
      aliasMap[ws.id] = aliases;
    }
  }

  return aliasMap;
}

