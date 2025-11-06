/**
 * Client-side API helpers for dashboard and update operations
 */

export type Workstream = {
  id: string;
  name: string;
  statusLabel?: string;
  statusColorBg?: string;
  statusColorFg?: string;
  percentComplete?: number;
  nextMilestone?: string;
  riskCount?: number;
  actionCount?: number;
  // Map from existing Workstream type
  status?: 'GREEN' | 'YELLOW' | 'RED';
  percent_complete?: number;
  next_milestone?: string | null;
};

export type NarrativeResponse = {
  summary: string;         // main narrative paragraph(s)
  statusSentence?: string; // e.g., "We're still Green because…"
};

/**
 * Submit an update (parse and apply notes)
 * Returns the number of items updated
 */
export async function submitUpdate(notes: string, programId: string): Promise<{ updatedCount: number }> {
  const res = await fetch('/api/apply-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ programId, notes }),
  });

  if (!res.ok) {
    // Try to parse JSON error response
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        const json = await res.json();
        if (json.error) {
          throw new Error(json.error);
        }
      } catch (parseError) {
        // If JSON parse fails, fall through to generic error
      }
    } else {
      // Try text if not JSON
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to apply update');
    }
    throw new Error('Failed to apply update');
  }

  const data = await res.json();
  return { updatedCount: data.updatedCount ?? 0 };
}

/**
 * Get narrative summary from explain-weekly endpoint
 * Note: This endpoint requires OWNER or CONTRIBUTOR role.
 * Viewers will get an empty summary gracefully.
 */
export async function getNarrative(programId: string): Promise<NarrativeResponse> {
  try {
    const res = await fetch('/api/explain-weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programId }),
    });

    if (!res.ok) {
      // 403 Forbidden means user is a viewer - this is expected, return empty gracefully
      if (res.status === 403) {
        return { summary: '' };
      }
      // Other errors: return empty narrative so UI stays graceful
      return { summary: '' };
    }

    const data = await res.json();
    
    // explain-weekly returns { ok: boolean, text: string }
    // Convert to NarrativeResponse format
    if (data.ok && data.text) {
      // Try to extract a status sentence if present
      const text = data.text;
      const statusMatch = text.match(/We'?re\s+still\s+(Green|Yellow|Red)\s+because[^.]*\./i);
      const statusSentence = statusMatch ? statusMatch[0] : undefined;
      const summary = statusSentence ? text.replace(statusSentence, '').trim() : text;
      
      return {
        summary,
        statusSentence,
      };
    }

    return { summary: '' };
  } catch (error) {
    console.error('Failed to fetch narrative:', error);
    return { summary: '' };
  }
}

/**
 * Get deleted workstreams for admin view
 */
export async function getDeletedWorkstreams(programId: string) {
  const r = await fetch(`/api/workstreams/deleted?programId=${encodeURIComponent(programId)}`, { 
    cache: 'no-store' 
  });
  if (!r.ok) throw new Error('Failed to load deleted items');
  return r.json();
}

/**
 * Restore a soft-deleted workstream
 */
export async function restoreWorkstream(id: string, programId: string) {
  const r = await fetch(`/api/workstreams/${id}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ programId }),
  });
  if (!r.ok) {
    const json = await r.json().catch(() => ({}));
    throw new Error(json.error || await r.text().catch(() => 'Failed to restore'));
  }
  return r.json();
}

