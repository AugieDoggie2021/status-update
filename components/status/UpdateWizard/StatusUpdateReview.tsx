'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { Workstream } from '@/lib/types';
import { formatRelativeWeek } from '@/lib/date-helpers';

interface StatusUpdateReviewProps {
  workstreams: Workstream[];
  updates: Array<{
    workstreamId: string;
    weekStart: string;
    rag: 'GREEN' | 'YELLOW' | 'RED';
    progressPercent: number;
    accomplishments: string;
    blockers: string;
    planNext: string;
  }>;
  weekStart: string;
  onBack: () => void;
  onSubmit: () => void;
  loading: boolean;
}

export function StatusUpdateReview({
  workstreams,
  updates,
  weekStart,
  onBack,
  onSubmit,
  loading,
}: StatusUpdateReviewProps) {
  const getWorkstreamName = (id: string) => {
    return workstreams.find(ws => ws.id === id)?.name || 'Unknown';
  };

  const getRagColor = (rag: string) => {
    switch (rag) {
      case 'GREEN': return 'text-green-600';
      case 'YELLOW': return 'text-yellow-600';
      case 'RED': return 'text-red-600';
      default: return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Review & Submit</CardTitle>
        <p className="text-sm text-muted-foreground">
          Review your updates for {formatRelativeWeek(weekStart)} before submitting
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {updates.map(update => (
            <Card key={update.workstreamId} className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{getWorkstreamName(update.workstreamId)}</CardTitle>
                  <Badge className={getRagColor(update.rag)}>{update.rag}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Progress:</span> {update.progressPercent}%
                </div>
                <div>
                  <span className="font-medium">Accomplishments:</span>
                  <p className="text-muted-foreground mt-1">{update.accomplishments || '(none)'}</p>
                </div>
                <div>
                  <span className="font-medium">Blockers:</span>
                  <p className="text-muted-foreground mt-1">{update.blockers || '(none)'}</p>
                </div>
                <div>
                  <span className="font-medium">Plan Next:</span>
                  <p className="text-muted-foreground mt-1">{update.planNext || '(none)'}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack} disabled={loading}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? (
              'Submitting...'
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Submit All Updates
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
