import { z } from 'zod';
import type { Status, Severity, RiskStatus, ActionStatus } from './types';

const statusSchema = z.enum(['GREEN', 'YELLOW', 'RED']);
const severitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
const riskStatusSchema = z.enum(['OPEN', 'MITIGATED', 'CLOSED']);
const actionStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'DONE']);

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

const workstreamUpdateSchema = z.object({
  name: z.string(),
  status: statusSchema,
  percent_complete: z.number().int().min(0).max(100),
  summary: z.string(),
  next_milestone: z.string().nullable(),
  next_milestone_due: dateStringSchema,
});

const riskUpdateSchema = z.object({
  workstream: z.string().nullable(),
  title: z.string(),
  severity: severitySchema,
  status: riskStatusSchema,
  owner: z.string().nullable(),
  due_date: dateStringSchema,
  notes: z.string().nullable(),
});

const actionUpdateSchema = z.object({
  workstream: z.string().nullable(),
  title: z.string(),
  owner: z.string().nullable(),
  due_date: dateStringSchema,
  status: actionStatusSchema,
  notes: z.string().nullable(),
});

export const parsedUpdateSchema = z.object({
  workstreams: z.array(workstreamUpdateSchema),
  risks: z.array(riskUpdateSchema),
  actions: z.array(actionUpdateSchema),
  overall_status_rule_hint: z.string().nullable().optional(),
});

export const parseRequestSchema = z.object({
  notes: z.string().min(1),
  programId: z.string().optional(),
});

export const applyUpdateRequestSchema = z.object({
  programId: z.string(), // Allow non-UUID for backward compatibility
  notes: z.string().min(1).optional(), // Optional for new flow
  appliedBy: z.string().optional(),
  actions: z.array(z.object({
    intent: z.enum(['update', 'delete']),
    name: z.string().optional(),
    workstreamId: z.string().optional(), // UUID validation happens in applyResolvedActions
    percent: z.number().int().min(0).max(100).optional(),
    status: statusSchema.optional(),
    next_milestone: z.string().nullable().optional(),
  })).optional(), // New: accept resolved actions
});

export const explainWeeklyRequestSchema = z.object({
  programId: z.string().uuid(),
});

export type ParsedUpdateInput = z.infer<typeof parsedUpdateSchema>;

