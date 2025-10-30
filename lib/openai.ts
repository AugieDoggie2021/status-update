import OpenAI from 'openai';
import type { ParsedUpdate } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const completion = await openai.chat.completions.create({
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
 * This is a very basic implementation - prefers OpenAI
 */
export function naiveParseNotes(notes: string, todayISO: string): ParsedUpdate {
  // Extract workstream mentions
  const workstreamMatches = notes.match(/(\w+):\s*([^;.]+)/g);
  const workstreams = workstreamMatches?.map((match) => {
    const [, name, rest] = match.match(/(\w+):\s*(.+)/) || [];
    const hasRed = /red|blocker|critical|stopped/i.test(rest);
    const hasYellow = /yellow|at risk|delayed|slipped/i.test(rest);
    const percentMatch = rest.match(/(\d+)%/);
    return {
      name: name || '',
      status: (hasRed ? 'RED' : hasYellow ? 'YELLOW' : 'GREEN') as 'GREEN' | 'YELLOW' | 'RED',
      percent_complete: percentMatch ? parseInt(percentMatch[1], 10) : 0,
      summary: rest.trim(),
      next_milestone: null,
      next_milestone_due: null,
    };
  }) || [];

  return {
    workstreams,
    risks: [],
    actions: [],
  };
}

