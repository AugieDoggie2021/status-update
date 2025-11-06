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
5. Map status synonyms: "amber" → YELLOW; "on-track" → GREEN; "at risk" → YELLOW
6. Normalize relative dates to ISO format (YYYY-MM-DD) using today's date: ${todayISO}
7. Default statuses: workstream = GREEN if not specified, risk = OPEN, action = OPEN
8. Return null for optional fields if not mentioned

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

  // B) Verb-led commands: "update/set/change <NAME> workstream ... 47% ... (red|yellow|amber|green)"
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

  return { workstreams, risks: [], actions: [] };
}

