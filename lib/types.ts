export type Status = 'GREEN' | 'YELLOW' | 'RED';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiskStatus = 'OPEN' | 'MITIGATED' | 'CLOSED';
export type ActionStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';

export type Program = {
  id: string;
  name: string;
  sponsor?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type Workstream = {
  id: string;
  program_id: string;
  name: string;
  lead: string | null;
  status: Status;
  percent_complete: number;
  summary: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  tags?: string[];
  next_milestone: string | null;
  next_milestone_due: string | null;
  updated_at: string;
  deleted_at?: string | null;
};

export type Risk = {
  id: string;
  program_id: string;
  workstream_id: string | null;
  title: string;
  severity: Severity;
  status: RiskStatus;
  owner: string | null;
  due_date: string | null;
  notes: string | null;
};

export type ActionItem = {
  id: string;
  program_id: string;
  workstream_id: string | null;
  title: string;
  owner: string | null;
  due_date: string | null;
  status: ActionStatus;
  notes: string | null;
};

export type Milestone = {
  id: string;
  workstream_id: string;
  title: string;
  due_date: string;
  completed_at: string | null;
  created_at: string;
};

export type StatusUpdate = {
  id: string;
  workstream_id: string;
  week_start: string; // ISO date (Monday)
  rag: Status;
  progress_percent: number;
  accomplishments: string;
  blockers: string;
  plan_next: string;
  created_by: string | null;
  created_at: string;
};

export type ParsedUpdate = {
  workstreams: Array<{
    name: string;
    status: Status;
    percent_complete: number;
    summary: string;
    next_milestone: string | null;
    next_milestone_due: string | null;
  }>;
  risks: Array<{
    workstream: string | null;
    title: string;
    severity: Severity;
    status: RiskStatus;
    owner: string | null;
    due_date: string | null;
    notes: string | null;
  }>;
  actions: Array<{
    workstream: string | null;
    title: string;
    owner: string | null;
    due_date: string | null;
    status: ActionStatus;
    notes: string | null;
  }>;
  deletions?: {
    workstreams?: string[]; // Workstream names to delete
  };
  overall_status_rule_hint?: string | null;
};

