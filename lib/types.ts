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
  next_milestone: string | null;
  next_milestone_due: string | null;
  updated_at: string;
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
  overall_status_rule_hint?: string | null;
};

