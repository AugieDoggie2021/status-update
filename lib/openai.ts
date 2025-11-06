import OpenAI from 'openai';
import type { ParsedUpdate } from './types';

/**
 * Action type for two-stage parse → confirm → apply flow
 */
export type Action = {
  intent: 'update' | 'delete' | 'create' | 'noop';
  name?: string; // as typed by user
  workstreamId?: string; // when resolved
  percent?: number;
  status?: 'GREEN' | 'YELLOW' | 'RED';
  next_milestone?: string | null;
};

export type ParseResult = {
  actions: Action[];
  raw_text: string;
};

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
4. Extract deletions: If user says "delete/remove <name> workstream" or "delete the workstream named X", add the workstream name to deletions.workstreams array
5. Infer statuses from keywords: "slipped", "delayed", "blocker", "at risk" → YELLOW/RED; "on track", "complete" → GREEN
6. Map status synonyms: "amber" → YELLOW; "on-track" → GREEN; "at risk" → YELLOW
7. Normalize relative dates to ISO format (YYYY-MM-DD) using today's date: ${todayISO}
8. Default statuses: workstream = GREEN if not specified, risk = OPEN, action = OPEN
9. Return null for optional fields if not mentioned

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
              deletions: {
                type: 'object',
                properties: {
                  workstreams: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
                additionalProperties: false,
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
 * Upgraded to recognize natural speech patterns and verb-led commands:
 * - "update the Modeling & Analytics workstream to 47% and change the status to amber"
 * - "The Data Pipeline Ingest workstream is now at 70% and a status of Red"
 * - "Set Data Ingest to Red at 70%"
 * - "Data Ingest: now at 70%, status Red"
 */
const STATUS_WORDS: Record<string, 'GREEN'|'YELLOW'|'RED'> = {
  green: 'GREEN',
  'on track': 'GREEN',
  red: 'RED',
  'at risk': 'YELLOW',
  yellow: 'YELLOW',
  amber: 'YELLOW',
  orange: 'YELLOW',
};

const STATUS_MAP: Record<string, 'GREEN'|'YELLOW'|'RED'> = {
  green: 'GREEN',
  'on track': 'GREEN',
  yellow: 'YELLOW',
  amber: 'YELLOW',
  orange: 'YELLOW',
  'at risk': 'YELLOW',
  red: 'RED',
};

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function detectStatus(s: string): 'GREEN'|'YELLOW'|'RED' {
  const n = norm(s);
  if (/\bred\b/.test(n)) return 'RED';
  if (/\b(amber|yellow|at risk)\b/.test(n)) return 'YELLOW';
  if (/\b(on track|green)\b/.test(n)) return 'GREEN';
  // default if not specified
  return 'GREEN';
}

function detectPercent(s: string): number {
  const m = s.match(/(\d{1,3})\s*%/);
  if (!m) return 0;
  const v = parseInt(m[1], 10);
  return Math.max(0, Math.min(100, v));
}

export function naiveParseNotes(notes: string, todayISO: string): ParsedUpdate {
  const text = notes.replace(/\s+/g, ' ').trim();

  const workstreams: {
    name: string;
    status: 'GREEN' | 'YELLOW' | 'RED';
    percent_complete: number;
    summary: string;
    next_milestone: string | null;
    next_milestone_due: string | null;
  }[] = [];

  const deletions: { workstreams: string[] } = { workstreams: [] };

  // A) Support "Name: details" (existing behavior)
  const colonMatches = text.match(/([A-Za-z0-9&/\-\s]+):\s*([^.;]+)(?=[.;]|$)/g) || [];
  for (const m of colonMatches) {
    const mm = m.match(/([A-Za-z0-9&/\-\s]+):\s*(.+)/);
    if (!mm) continue;
    const nameCandidate = mm[1].trim();
    const rest = mm[2].trim();
    const nameStop = norm(nameCandidate);
    if (['update','set','change','mark','make'].includes(nameStop)) continue; // don't treat verbs as names
    workstreams.push({
      name: nameCandidate,
      status: detectStatus(rest),
      percent_complete: detectPercent(rest),
      summary: rest,
      next_milestone: null,
      next_milestone_due: null,
    });
  }

  // B) Delete/Remove commands: "delete/remove <NAME> workstream"
  const deletePatterns = [
    // "delete the workstream named X" or "delete the workstream called X"
    /\b(delete|remove)\s+(?:the\s+)?workstream\s+(?:in\s+[^]*?\s+)?(?:named|called)\s+["']?([A-Za-z0-9&/\-\s]+)["']?/i,
    // "delete the workstream X" (name at end)
    /\b(delete|remove)\s+(?:the\s+)?workstream\s+["']?([A-Za-z0-9&/\-\s]+)["']?$/i,
    // "delete X workstream"
    /\b(delete|remove)\s+([A-Za-z0-9&/\-\s]+)\s+workstream/i,
    // "delete workstream X"
    /\b(delete|remove)\s+workstream\s+(?:named\s+|called\s+)?["']?([A-Za-z0-9&/\-\s]+)["']?/i,
  ];

  for (const pattern of deletePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Try match[2] first (name), then match[1] (verb), but skip if it's a verb
      const name = (match[2] || (match[1] && !['delete', 'remove'].includes(match[1].toLowerCase()) ? match[1] : '') || '').trim();
      // Filter out common stopwords
      const stopwords = ['delete', 'remove', 'the', 'workstream', 'named', 'called', 'in', 'top', 'left', 'hand', 'corner'];
      if (name && !stopwords.includes(name.toLowerCase()) && name.length > 1) {
        deletions.workstreams.push(name);
        break; // Only match once per sentence
      }
    }
  }

  // C) Verb-led commands: "update/set/change <NAME> workstream ... 47% ... (red|yellow|amber|green)"
  const sentences = text.split(/[.;]\s*/).filter(Boolean);
  for (const s of sentences) {
    const sent = s.trim();

    // 1) update|set|change|mark|make <NAME> workstream ... % ... (red|yellow|amber|green)
    let m = sent.match(/\b(update|set|change|mark|make)\s+(.+?)\s+workstream\b([^]*)/i);
    if (m) {
      const nameCandidate = m[2].trim();
      const rest = m[3] ?? '';
      workstreams.push({
        name: nameCandidate,
        status: detectStatus(rest),
        percent_complete: detectPercent(rest),
        summary: sent,
        next_milestone: null,
        next_milestone_due: null,
      });
      continue;
    }

    // 2) "<NAME> workstream is now 47% and red"
    m = sent.match(/^(.+?)\s+workstream\b([^]*)/i);
    if (m) {
      const nameCandidate = m[1].trim();
      const rest = m[2] ?? '';
      workstreams.push({
        name: nameCandidate,
        status: detectStatus(rest),
        percent_complete: detectPercent(rest),
        summary: sent,
        next_milestone: null,
        next_milestone_due: null,
      });
      continue;
    }

    // 3) "<NAME> is now 47% and red" (no "workstream" word)
    m = sent.match(/^(.+?)\s+(?:is\s+now\s+|is\s+|now\s+at\s+)?(\d{1,3})\s*%.*?\b(red|yellow|amber|green)\b/i);
    if (m) {
      const statusWord = m[3].toLowerCase();
      workstreams.push({
        name: m[1].trim(),
        status: STATUS_WORDS[statusWord] || detectStatus(m[3]),
        percent_complete: Math.max(0, Math.min(100, parseInt(m[2], 10))),
        summary: sent,
        next_milestone: null,
        next_milestone_due: null,
      });
      continue;
    }
  }

  // Deduplicate by name (last one wins)
  const seen = new Set<string>();
  for (let i = workstreams.length - 1; i >= 0; i--) {
    const key = norm(workstreams[i].name);
    if (seen.has(key)) workstreams.splice(i, 1);
    else seen.add(key);
  }

  // Deduplicate deletions
  const deletedSeen = new Set<string>();
  deletions.workstreams = deletions.workstreams.filter(name => {
    const key = norm(name);
    if (deletedSeen.has(key)) return false;
    deletedSeen.add(key);
    return true;
  });

  return { 
    workstreams, 
    risks: [], 
    actions: [],
    deletions: deletions.workstreams.length > 0 ? deletions : undefined,
  };
}

/**
 * Parse notes into actions (for two-stage flow)
 * Supports commands WITHOUT the word "workstream"
 * Exported for testing
 */
export function parseNaive(text: string): ParseResult {
  const actions: Action[] = [];
  const sents = text.replace(/\s+/g, ' ').trim().split(/[.;]\s*/).filter(Boolean);

  for (const sent of sents) {
    const n = sent.toLowerCase();

    // DELETE patterns
    if (/\b(delete|remove)\b/.test(n)) {
      // quoted or unquoted names
      const quoted = [...sent.matchAll(/"([^"]+)"|'([^']+)'/g)].map((m) => (m[1] || m[2]).trim());
      if (quoted.length) {
        quoted.forEach((name) => actions.push({ intent: 'delete', name }));
      } else {
        const m = sent.match(/\b(delete|remove)\s+(?:the\s+)?(.+?)(?:\s+workstream)?$/i);
        if (m) {
          const name = m[2].trim();
          // Filter out stopwords
          const stopwords = ['delete', 'remove', 'the', 'workstream', 'named', 'called'];
          if (!stopwords.includes(name.toLowerCase()) && name.length > 1) {
            actions.push({ intent: 'delete', name });
          }
        }
      }
      continue;
    }

    // UPDATE patterns (no need to say "workstream")
    // ex: "Update Data Pipeline Ingest to green at 70%"
    let m = sent.match(/\b(update|set|change|mark|make)\s+(?:the\s+)?(.+?)\s+(?:workstream\s+)?(?:to\s+)?(green|yellow|amber|red|orange)\b.*?(\d{1,3})\s*%?/i);
    if (m) {
      const name = m[2].trim();
      const statusWord = m[3].toLowerCase();
      const percent = Math.min(100, parseInt(m[4], 10));
      const stopwords = ['update', 'set', 'change', 'mark', 'make', 'the', 'workstream', 'to'];
      if (!stopwords.includes(name.toLowerCase()) && name.length > 1) {
        actions.push({
          intent: 'update',
          name,
          status: STATUS_MAP[statusWord] || 'GREEN',
          percent,
        });
      }
      continue;
    }

    // ex: "Update Data Pipeline Ingest to green"
    m = sent.match(/\b(update|set|change|mark|make)\s+(?:the\s+)?(.+?)\s+(?:workstream\s+)?(?:to\s+)?(green|yellow|amber|red|orange)\b/i);
    if (m) {
      const name = m[2].trim();
      const statusWord = m[3].toLowerCase();
      const stopwords = ['update', 'set', 'change', 'mark', 'make', 'the', 'workstream', 'to'];
      if (!stopwords.includes(name.toLowerCase()) && name.length > 1) {
        actions.push({
          intent: 'update',
          name,
          status: STATUS_MAP[statusWord] || 'GREEN',
        });
      }
      continue;
    }

    // ex: "Set Modeling & Analytics 47%"
    m = sent.match(/\b(update|set|change|mark|make)\s+(?:the\s+)?(.+?)\s+(?:workstream\s+)?(\d{1,3})\s*%/i);
    if (m) {
      const name = m[2].trim();
      const percent = Math.min(100, parseInt(m[3], 10));
      const stopwords = ['update', 'set', 'change', 'mark', 'make', 'the', 'workstream'];
      if (!stopwords.includes(name.toLowerCase()) && name.length > 1) {
        actions.push({
          intent: 'update',
          name,
          percent,
        });
      }
      continue;
    }

    // ex: "<name> to 47% and red"
    m = sent.match(/^(.+?)\s+(?:workstream\s+)?(?:is\s+now\s+|to\s+|now\s+at\s+)?(\d{1,3})\s*%.*?\b(green|yellow|amber|red|orange)\b/i);
    if (m) {
      const name = m[1].trim();
      const percent = Math.min(100, parseInt(m[2], 10));
      const statusWord = m[3].toLowerCase();
      const stopwords = ['workstream', 'is', 'now', 'to', 'at'];
      if (!stopwords.includes(name.toLowerCase()) && name.length > 1) {
        actions.push({
          intent: 'update',
          name,
          percent,
          status: STATUS_MAP[statusWord] || 'GREEN',
        });
      }
      continue;
    }

    // ex: "<name> to red"
    m = sent.match(/^(.+?)\s+(?:workstream\s+)?(?:to\s+|is\s+now\s+)?(green|yellow|amber|red|orange)\b/i);
    if (m) {
      const name = m[1].trim();
      const statusWord = m[2].toLowerCase();
      const stopwords = ['workstream', 'to', 'is', 'now'];
      if (!stopwords.includes(name.toLowerCase()) && name.length > 1) {
        actions.push({
          intent: 'update',
          name,
          status: STATUS_MAP[statusWord] || 'GREEN',
        });
      }
      continue;
    }
  }

  // Dedup last-write-wins per name
  const seen = new Set<string>();
  for (let i = actions.length - 1; i >= 0; i--) {
    const k = (actions[i].intent + ':' + (actions[i].name || actions[i].workstreamId || '')).toLowerCase();
    if (seen.has(k)) actions.splice(i, 1);
    else seen.add(k);
  }

  return { actions, raw_text: text };
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const parseTool = {
  type: 'function' as const,
  function: {
    name: 'emit_actions',
    description: "Return normalized actions parsed from the user's update text.",
    parameters: {
      type: 'object',
      properties: {
        actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              intent: { type: 'string', enum: ['update', 'delete', 'create', 'noop'] },
              name: { type: 'string', description: 'User-typed name (unresolved)' },
              status: { type: 'string', enum: ['GREEN', 'YELLOW', 'RED'], nullable: true },
              percent: { type: 'number', minimum: 0, maximum: 100, nullable: true },
              next_milestone: { type: 'string', nullable: true },
            },
            required: ['intent'],
            additionalProperties: false,
          },
        },
        raw_text: { type: 'string' },
      },
      required: ['actions', 'raw_text'],
    },
  },
} as const;

/**
 * Smart parser that uses LLM when available, falls back to naive parser
 * Returns actions suitable for two-stage flow
 */
export async function parseNotesSmart({
  notes,
  programId,
}: {
  notes: string;
  programId: string;
}): Promise<ParseResult> {
  // Log mode to verify in prod logs whether LLM path is active
  const mode = process.env.OPENAI_API_KEY ? 'openai' : 'naive';
  console.log('[parseNotesSmart] mode:', mode, 'program:', programId);

  if (!process.env.OPENAI_API_KEY) {
    // Fallback: use improved regex parser
    return parseNaive(notes);
  }

  try {
    const client = getOpenAI();

    const sys = [
      'You are a strict, deterministic parser for status updates.',
      'Emit ONLY the tool call; never free text.',
      'Split multi-entity instructions into multiple actions.',
      "Accept commands that omit the word 'workstream' (e.g., 'Update Data Pipeline Ingest to Green').",
      'Map synonyms: amber→YELLOW, on track→GREEN, at risk→YELLOW.',
      'If unsure, still emit best-effort actions (disambiguation happens server-side).',
    ].join('\n');

    const user = `Program: ${programId}\nText: ${notes}`;

    const chat = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      tools: [parseTool],
      tool_choice: { type: 'function', function: { name: 'emit_actions' } },
      temperature: 0,
    });

    const tool = chat.choices[0]?.message?.tool_calls?.[0];

    if (!tool || tool.type !== 'function' || !tool.function?.arguments) {
      console.warn('[parseNotesSmart] Missing tool args; falling back to naive.');
      return parseNaive(notes);
    }

    return JSON.parse(tool.function.arguments) as ParseResult;
  } catch (e) {
    console.error('[parseNotesSmart] OpenAI error; falling back to naive:', e);
    return parseNaive(notes);
  }
}

