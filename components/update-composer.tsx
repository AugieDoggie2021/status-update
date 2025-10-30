'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { ParsedUpdate } from '@/lib/types';

interface UpdateComposerProps {
  programId: string;
  onUpdateApplied?: () => void;
}

export function UpdateComposer({ programId, onUpdateApplied }: UpdateComposerProps) {
  const [notes, setNotes] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedUpdate | null>(null);
  const [showParsedDialog, setShowParsedDialog] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<string | null>(null);
  const [showWeeklyDialog, setShowWeeklyDialog] = useState(false);

  const demoScript = `Controls & Ops: ahead of plan; 25% now 35%. Next milestone control walkthrough Fri.

Data Ingest: rate-limit risk persists—keep YELLOW; target still Fri.

Modeling: slipped 1 day; move "dimension conformance" to Thu; still 45%.

QA: unblock expected tomorrow; action stays with Jo due Mon.

Add HIGH risk: vendor API outage window announced for Tue 2–4am.`;

  const handleLoadDemo = () => {
    setNotes(demoScript);
    toast.info('Demo script loaded');
  };

  const handleDryRunParse = async () => {
    if (!notes.trim()) {
      toast.error('Please enter some notes');
      return;
    }

    setIsParsing(true);
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to parse');
      }

      const data = await res.json();
      setParsedData(data);
      setShowParsedDialog(true);
      toast.success('Parse successful');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse notes');
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyUpdate = async () => {
    if (!notes.trim()) {
      toast.error('Please enter some notes');
      return;
    }

    setIsApplying(true);
    try {
      const res = await fetch('/api/apply-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId, notes }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to apply update');
      }

      const data = await res.json();
      setNotes('');
      toast.success('Update applied successfully');
      onUpdateApplied?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply update';
      toast.error(errorMessage, {
        duration: 5000,
        action: {
          label: 'Troubleshooting',
          onClick: () => window.open('/docs/troubleshooting', '_blank'),
        },
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleExplainWeekly = async () => {
    setIsExplaining(true);
    try {
      const res = await fetch('/api/explain-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate summary');
      }

      const data = await res.json();
      setWeeklySummary(data.text);
      setShowWeeklyDialog(true);
      toast.success('Weekly summary generated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setIsExplaining(false);
    }
  };

  const handleCopyWeekly = () => {
    if (weeklySummary) {
      navigator.clipboard.writeText(weeklySummary);
      toast.success('Copied to clipboard');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Status Update</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="update-textarea" className="text-sm font-medium">
              Status Update
            </label>
            <button
              type="button"
              onClick={handleLoadDemo}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Load Demo Script
            </button>
          </div>
          <Textarea
            id="update-textarea"
            placeholder="Paste notes here... e.g., 'Data Ingest: slipped 2 days; now 70%. New target Fri. Modeling: on track at 45%...'"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Tip: try "Load Demo Script" for a realistic update.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleDryRunParse}
              disabled={isParsing || !notes.trim()}
              variant="outline"
            >
              {isParsing ? 'Parsing...' : 'Dry-Run Parse'}
            </Button>
            <Button
              onClick={handleApplyUpdate}
              disabled={isApplying || !notes.trim()}
            >
              {isApplying ? 'Applying...' : 'Apply Update'}
            </Button>
            <Button
              onClick={handleExplainWeekly}
              disabled={isExplaining}
              variant="secondary"
            >
              {isExplaining ? 'Generating...' : 'Explain Weekly'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showParsedDialog} onOpenChange={setShowParsedDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Parsed Update (Dry Run)</DialogTitle>
            <DialogDescription>
              Preview of how the notes will be parsed
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-[60vh]">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(parsedData, null, 2));
                toast.success('JSON copied to clipboard');
              }}
              variant="outline"
              className="w-full"
            >
              Copy JSON
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWeeklyDialog} onOpenChange={setShowWeeklyDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Weekly Summary</DialogTitle>
            <DialogDescription>
              Executive summary for weekly reporting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
              {weeklySummary}
            </div>
            <Button onClick={handleCopyWeekly} variant="outline" className="w-full">
              Copy Summary
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

