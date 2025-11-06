import OpenAI from 'openai';
import type { ParsedUpdate } from './types';

export function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Parse natural language notes into structured JSON using OpenAI
 * Uses JSON Schema response format to ensure valid structure
 */
export async function parseNotesToJSON(
  notes: string,
  todayISO: string
): Promise<ParsedUpdate> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const systemPrompt = `You are a parser for program status updates. Your task is to extract structured information from natural language notes about workstreams, risks, and action items.

Rules:
1. Extract workstream updates: name, status (GREEN/YELLOW/RED), percent_complete (0-100), summary, next_milestone, next_milestone_due (YYYY-MM-DD or null)
2. Extract risks: workstream (can be null), title, severity (LOW/MEDIUM/HIGH), status (OPEN/MITIGATED/CLOSED), owner, due_date, notes
3. Extract actions: workstream (can be null), title, owner, due_date, status (OPEN/IN_PROGRESS/DONE), notes
4. Infer statuses from keywords: "slipped", "delayed", "blocker", "at risk" → YELLOW/RED; "on track", "complete" → GREEN
5. Normalize relative dates to ISO format (YYYY-MM-DD) using today's date: ${todayISO}
6. Default statuses: workstream = GREEN if not specified, risk = OPEN, action = OPEN
7. Return null for optional fields if not mentioned

Return ONLY valid JSON matching the schema.`;

  try {
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: notes },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'StatusUpdateSchema',
          schema: {
            type: 'object',
            properties: {
              workstreams: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    status: { type: 'string', enum: ['GREEN', 'YELLOW', 'RED'] },
                    percent_complete: { type: 'integer', minimum: 0, maximum: 100 },
                    summary: { type: 'string' },
                    next_milestone: { type: ['string', 'null'] },
                    next_milestone_due: {
                      type: ['string', 'null'],
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    },
                  },
                  required: ['name', 'status', 'percent_complete', 'summary', 'next_milestone', 'next_milestone_due'],
                  additionalProperties: false,
                },
              },
              risks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    workstream: { type: ['string', 'null'] },
                    title: { type: 'string' },
                    severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                    status: { type: 'string', enum: ['OPEN', 'MITIGATED', 'CLOSED'] },
                    owner: { type: ['string', 'null'] },
                    due_date: {
                      type: ['string', 'null'],
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    },
                    notes: { type: ['string', 'null'] },
                  },
                  required: ['workstream', 'title', 'severity', 'status', 'owner', 'due_date', 'notes'],
                  additionalProperties: false,
                },
              },
              actions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    workstream: { type: ['string', 'null'] },
                    title: { type: 'string' },
                    owner: { type: ['string', 'null'] },
                    due_date: {
                      type: ['string', 'null'],
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    },
                    status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'DONE'] },
                    notes: { type: ['string', 'null'] },
                  },
                  required: ['workstream', 'title', 'owner', 'due_date', 'status', 'notes'],
                  additionalProperties: false,
                },
              },
              overall_status_rule_hint: { type: ['string', 'null'] },
            },
            required: ['workstreams', 'risks', 'actions'],
            additionalProperties: false,
          },
          strict: true,
        },
      },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    const parsed = JSON.parse(content) as ParsedUpdate;
    return parsed;
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse OpenAI JSON response: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fallback regex-based parser (naive, for when OpenAI fails)
 * Upgraded to recognize natural speech patterns like:
 * - "The Data Pipeline Ingest workstream is now at 70% and a status of Red"
 * - "Set Data Ingest to Red at 70%"
 * - "Data Ingest: now at 70%, status Red"
 */
export function naiveParseNotes(notes: string, todayISO: string): ParsedUpdate {
  // Normalize whitespace
  const text = notes.replace(/\s+/g, ' ').trim();

  const workstreams: {
    name: string;
    status: 'GREEN' | 'YELLOW' | 'RED';
    percent_complete: number;
    summary: string;
    next_milestone: string | null;
    next_milestone_due: string | null;
  }[] = [];

  // 1) Pattern: "<Name>: details…" (existing behavior)
  //    e.g., "Data Ingest Pipeline: now at 70%, status Red"
  const colonMatches = text.match(/([A-Za-z0-9&/\-\s]+):\s*([^;.]+)(?=[;. ]|$)/g) || [];
  for (const m of colonMatches) {
    const mm = m.match(/([A-Za-z0-9&/\-\s]+):\s*(.+)/);
    if (!mm) continue;
    const name = mm[1].trim();
    const rest = mm[2].trim();
    const status = /red/i.test(rest) ? 'RED' : /yellow|at\s*risk/i.test(rest) ? 'YELLOW' : 'GREEN';
    const pct = (() => {
      const pm = rest.match(/(\d{1,3})\s*%/);
      if (!pm) return 0;
      const v = parseInt(pm[1], 10);
      return Math.max(0, Math.min(100, v));
    })();
    workstreams.push({
      name,
      status,
      percent_complete: pct,
      summary: rest,
      next_milestone: null,
      next_milestone_due: null,
    });
  }

  // 2) Pattern: "The <Name> workstream is now at 70% and (a )?status (of|is|=) Red"
  //    Flexible pieces: optional "The", order of phrases, commas, "is now", "now at", etc.
  //    Also handle: "<Name> is now 70% and Red"  /  "Set <Name> to Red at 70%"
  //    We'll scan sentences and try multiple regexes.
  const sentences = text.split(/[.;]\s*/).filter(Boolean);

  const tryPush = (nameRaw: string, pctRaw?: string, statusRaw?: string, fullSentence?: string) => {
    const name = (nameRaw || '').replace(/\b(workstream|stream)\b/i, '').trim();
    if (!name) return false;

    let percent = 0;
    if (pctRaw) {
      const v = parseInt(pctRaw, 10);
      if (!Number.isNaN(v)) percent = Math.max(0, Math.min(100, v));
    }

    let status: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
    if (statusRaw) {
      const s = statusRaw.toUpperCase();
      if (s.startsWith('R')) status = 'RED';
      else if (s.startsWith('Y')) status = 'YELLOW';
      else status = 'GREEN';
    } else {
      // Infer from words if present
      if (/\bred\b/i.test(fullSentence || '')) status = 'RED';
      else if (/\byellow|at\s*risk\b/i.test(fullSentence || '')) status = 'YELLOW';
    }

    workstreams.push({
      name,
      status,
      percent_complete: percent,
      summary: (fullSentence || '').trim() || `${name} updated.`,
      next_milestone: null,
      next_milestone_due: null,
    });

    return true;
  };

  for (const s of sentences) {
    const sent = s.trim();

    // a) "The <Name> workstream … at 70% … status (is|of|=) (Red|Yellow|Green)"
    let m = sent.match(/^(?:the\s+)?(.+?)\s+workstream\b.*?(?:now\s+at\s+|at\s+|is\s+at\s+)?(\d{1,3})\s*%.*?(?:status\s*(?:is|of|=)\s*)(red|yellow|green)\b/i);
    if (m && tryPush(m[1], m[2], m[3], sent)) continue;

    // b) "The <Name> workstream … status (is|of|=) Red … at 70%"
    m = sent.match(/^(?:the\s+)?(.+?)\s+workstream\b.*?(?:status\s*(?:is|of|=)\s*)(red|yellow|green)\b.*?(?:at\s+|now\s+at\s+)?(\d{1,3})\s*%/i);
    if (m && tryPush(m[1], m[3], m[2], sent)) continue;

    // c) "<Name> is now 70% and Red" (no "workstream" keyword)
    m = sent.match(/^(.+?)\s+(?:is\s+now\s+|is\s+|now\s+at\s+)?(\d{1,3})\s*%.*?\b(red|yellow|green)\b/i);
    if (m && tryPush(m[1], m[2], m[3], sent)) continue;

    // d) "Set <Name> to Red at 70%"
    m = sent.match(/^set\s+(.+?)\s+to\s+(red|yellow|green)\b.*?(?:at\s+)?(\d{1,3})\s*%/i);
    if (m && tryPush(m[1], m[3], m[2], sent)) continue;

    // e) "<Name> … at 70%" (percent only)
    m = sent.match(/^(.+?)\s+.*?(?:at\s+|now\s+at\s+)?(\d{1,3})\s*%/i);
    if (m && tryPush(m[1], m[2], undefined, sent)) continue;
  }

  // Deduplicate by name (last one wins)
  const seen = new Map<string, number>();
  for (let i = workstreams.length - 1; i >= 0; i--) {
    const key = workstreams[i].name.toLowerCase();
    if (seen.has(key)) workstreams.splice(i, 1);
    else seen.set(key, 1);
  }

  return {
    workstreams,
    risks: [],
    actions: [],
  };
}

