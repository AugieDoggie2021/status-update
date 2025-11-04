'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Workstream, StatusUpdate } from '@/lib/types';
import { formatRelativeWeek } from '@/lib/date-helpers';

interface StatusUpdateFormProps {
  workstream: Workstream;
  update?: {
    workstreamId: string;
    weekStart: string;
    rag: 'GREEN' | 'YELLOW' | 'RED';
    progressPercent: number;
    accomplishments: string;
    blockers: string;
    planNext: string;
  };
  existing?: StatusUpdate;
  weekStart: string;
  onChange: (field: string, value: any) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function StatusUpdateForm({
  workstream,
  update,
  existing,
  weekStart,
  onChange,
  onKeyDown,
}: StatusUpdateFormProps) {
  const currentUpdate = update || {
    workstreamId: workstream.id,
    weekStart,
    rag: workstream.status,
    progressPercent: workstream.percent_complete,
    accomplishments: '',
    blockers: '',
    planNext: '',
  };

  const hasChanges = existing && (
    existing.rag !== currentUpdate.rag ||
    existing.progress_percent !== currentUpdate.progressPercent ||
    existing.accomplishments !== currentUpdate.accomplishments ||
    existing.blockers !== currentUpdate.blockers ||
    existing.plan_next !== currentUpdate.planNext
  );

  return (
    <Card id={`workstream-${workstream.id}`} onKeyDown={onKeyDown}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{workstream.name}</CardTitle>
          <div className="flex items-center gap-2">
            {existing && <Badge variant="outline">Existing</Badge>}
            {hasChanges && <Badge variant="secondary">Changed</Badge>}
            {workstream.lead && <Badge variant="outline">{workstream.lead}</Badge>}
          </div>
        </div>
        {existing && (
          <p className="text-sm text-muted-foreground">
            Previous update: {formatRelativeWeek(existing.week_start)} ({existing.rag})
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`rag-${workstream.id}`}>RAG Status *</Label>
            <Select
              value={currentUpdate.rag}
              onValueChange={(value: 'GREEN' | 'YELLOW' | 'RED') => onChange('rag', value)}
            >
              <SelectTrigger id={`rag-${workstream.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GREEN">🟢 Green</SelectItem>
                <SelectItem value="YELLOW">🟡 Yellow</SelectItem>
                <SelectItem value="RED">🔴 Red</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor={`progress-${workstream.id}`}>Progress % *</Label>
            <Input
              id={`progress-${workstream.id}`}
              type="number"
              min="0"
              max="100"
              value={currentUpdate.progressPercent}
              onChange={(e) => onChange('progressPercent', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor={`accomplishments-${workstream.id}`}>
            Accomplishments {currentUpdate.rag !== 'GREEN' && '*'}
          </Label>
          <Textarea
            id={`accomplishments-${workstream.id}`}
            value={currentUpdate.accomplishments}
            onChange={(e) => onChange('accomplishments', e.target.value)}
            placeholder="What was accomplished this week?"
            rows={3}
            required={currentUpdate.rag !== 'GREEN'}
          />
          {existing && existing.accomplishments !== currentUpdate.accomplishments && (
            <p className="text-xs text-muted-foreground mt-1">
              Previous: {existing.accomplishments.substring(0, 100)}...
            </p>
          )}
        </div>

        <div>
          <Label htmlFor={`blockers-${workstream.id}`}>
            Blockers {currentUpdate.rag !== 'GREEN' && '*'}
          </Label>
          <Textarea
            id={`blockers-${workstream.id}`}
            value={currentUpdate.blockers}
            onChange={(e) => onChange('blockers', e.target.value)}
            placeholder="What is blocking progress?"
            rows={3}
            required={currentUpdate.rag !== 'GREEN'}
          />
          {existing && existing.blockers !== currentUpdate.blockers && (
            <p className="text-xs text-muted-foreground mt-1">
              Previous: {existing.blockers.substring(0, 100)}...
            </p>
          )}
        </div>

        <div>
          <Label htmlFor={`plan-${workstream.id}`}>
            Plan for Next Week {currentUpdate.rag !== 'GREEN' && '*'}
          </Label>
          <Textarea
            id={`plan-${workstream.id}`}
            value={currentUpdate.planNext}
            onChange={(e) => onChange('planNext', e.target.value)}
            placeholder="What is planned for next week?"
            rows={3}
            required={currentUpdate.rag !== 'GREEN'}
          />
          {existing && existing.plan_next !== currentUpdate.planNext && (
            <p className="text-xs text-muted-foreground mt-1">
              Previous: {existing.plan_next.substring(0, 100)}...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
