'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar } from 'lucide-react';
import { StatusUpdateForm } from './StatusUpdateForm';
import { StatusUpdateReview } from './StatusUpdateReview';
import type { Workstream, StatusUpdate } from '@/lib/types';
import { formatRelativeWeek, getWeekStart } from '@/lib/date-helpers';
import { apiJson } from '@/lib/fetcher';

interface UpdateWizardProps {
  workstreams: Workstream[];
  onComplete?: () => void;
}

type Step = 'select' | 'form' | 'review';

interface UpdateData {
  workstreamId: string;
  weekStart: string;
  rag: 'GREEN' | 'YELLOW' | 'RED';
  progressPercent: number;
  accomplishments: string;
  blockers: string;
  planNext: string;
}

export function UpdateWizard({ workstreams, onComplete }: UpdateWizardProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedWorkstream, setSelectedWorkstream] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<string>(getWeekStart(new Date()));
  const [updates, setUpdates] = useState<Record<string, UpdateData>>({});
  const [existingUpdates, setExistingUpdates] = useState<Record<string, StatusUpdate>>({});
  const [loading, setLoading] = useState(false);

  // Load existing updates for selected workstream
  const loadExistingUpdates = async () => {
    if (!selectedWorkstream) return;

    try {
      const programId = process.env.NEXT_PUBLIC_PROGRAM_ID;
      if (!programId) return;

      const response = await fetch(
        `/api/status-updates?programId=${programId}&weekStart=${weekStart}`
      );
      const data = await response.json();

      const existingMap: Record<string, StatusUpdate> = {};
      data.forEach((update: StatusUpdate) => {
        if (update.workstream_id === selectedWorkstream) {
          existingMap[update.workstream_id] = update;
        }
      });
      setExistingUpdates(existingMap);

      // Pre-populate updates with existing data or defaults
      const existing = existingMap[selectedWorkstream];
      const workstream = workstreams.find(ws => ws.id === selectedWorkstream);
      if (workstream) {
        setUpdates({
          [selectedWorkstream]: {
            workstreamId: selectedWorkstream,
            weekStart,
            rag: existing?.rag || workstream.status,
            progressPercent: existing?.progress_percent || workstream.percent_complete,
            accomplishments: existing?.accomplishments || '',
            blockers: existing?.blockers || '',
            planNext: existing?.plan_next || '',
          },
        });
      }
    } catch (error) {
      console.error('Error loading existing updates:', error);
    }
  };

  const handleWorkstreamSelect = (wsId: string) => {
    setSelectedWorkstream(wsId);
  };

  const handleNext = () => {
    if (step === 'select') {
      if (!selectedWorkstream) {
        alert('Please select a workstream');
        return;
      }
      loadExistingUpdates();
      setStep('form');
    } else if (step === 'form') {
      setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'review') {
      setStep('form');
    } else if (step === 'form') {
      setStep('select');
    }
  };

  const handleUpdateChange = (workstreamId: string, field: string, value: any) => {
    setUpdates(prev => ({
      ...prev,
      [workstreamId]: {
        ...prev[workstreamId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const programId = process.env.NEXT_PUBLIC_PROGRAM_ID;
      if (!programId) {
        throw new Error('Program ID not found');
      }

      const updatesArray = Object.values(updates).filter(
        update => update.workstreamId === selectedWorkstream
      );

      const response = await fetch('/api/status-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId,
          updates: updatesArray,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit updates');
      }

      // Redirect to dashboard after successful submission
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error submitting updates:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit updates');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'select') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Select Workstream</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose a workstream to update for {formatRelativeWeek(weekStart)}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Week of: {weekStart}</span>
          </div>
          <div className="space-y-2">
            {workstreams.map(workstream => (
              <div
                key={workstream.id}
                className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedWorkstream === workstream.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-accent/50'
                }`}
                onClick={() => handleWorkstreamSelect(workstream.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{workstream.name}</h3>
                    <Badge
                      variant={
                        workstream.status === 'GREEN'
                          ? 'default'
                          : workstream.status === 'YELLOW'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {workstream.status}
                    </Badge>
                    {workstream.lead && (
                      <Badge variant="outline">{workstream.lead}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {workstream.percent_complete}% complete
                  </p>
                </div>
                <input
                  type="radio"
                  checked={selectedWorkstream === workstream.id}
                  onChange={() => handleWorkstreamSelect(workstream.id)}
                  className="ml-4"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleNext} disabled={!selectedWorkstream}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'form') {
    const selectedWs = workstreams.find(ws => ws.id === selectedWorkstream);
    if (!selectedWs) return null;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Step 2: Fill Updates</h2>
            <p className="text-sm text-muted-foreground">
              Update status for {selectedWs.name}
            </p>
          </div>
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
        </div>
        <div className="space-y-4">
          <StatusUpdateForm
            key={selectedWs.id}
            workstream={selectedWs}
            update={updates[selectedWs.id]}
            existing={existingUpdates[selectedWs.id]}
            weekStart={weekStart}
            onChange={(field, value) => handleUpdateChange(selectedWs.id, field, value)}
          />
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleNext}>
            Review <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'review') {
    const updatesArray = Object.values(updates).filter(
      update => update.workstreamId === selectedWorkstream
    );
    const selectedWs = workstreams.find(ws => ws.id === selectedWorkstream);
    if (!selectedWs) return null;
    
    return (
      <StatusUpdateReview
        workstreams={[selectedWs]}
        updates={updatesArray}
        weekStart={weekStart}
        onBack={handleBack}
        onSubmit={handleSubmit}
        loading={loading}
      />
    );
  }

  return null;
}


