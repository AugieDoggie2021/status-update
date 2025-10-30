'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { fmtRelativeTime } from '@/lib/date';
import { ScrollArea } from '@/components/ui/scroll-area';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

type Report = {
  id: string;
  program_id: string;
  text: string;
  created_at: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ReportClient() {
  const [weeklySummary, setWeeklySummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: reportsData, mutate: mutateReports } = useSWR<{ ok: boolean; reports: Report[] }>(
    PROGRAM_ID ? `/api/reports?programId=${PROGRAM_ID}` : null,
    fetcher
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/explain-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId: PROGRAM_ID }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate summary');
      }

      const data = await res.json();
      setWeeklySummary(data.text);
      toast.success('Weekly summary generated');
      mutateReports();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const reports = reportsData?.reports || [];

  if (!PROGRAM_ID) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please set NEXT_PUBLIC_PROGRAM_ID in your environment variables.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Weekly Report</h2>
        <Card>
          <CardHeader>
            <CardTitle>Executive Weekly Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate Summary'}
              </Button>
              {weeklySummary && (
                <Button onClick={() => handleCopy(weeklySummary)} variant="outline">
                  Copy Summary
                </Button>
              )}
            </div>

            {weeklySummary ? (
              <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md border">{weeklySummary}</div>
            ) : (
              <p className="text-sm text-muted-foreground">Click &quot;Generate Summary&quot; to create an executive weekly report.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {reports.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Previous Reports</h3>
          <Card>
            <CardHeader>
              <CardTitle>Saved Weekly Summaries</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div key={report.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{fmtRelativeTime(report.created_at)}</p>
                        <Button size="sm" variant="outline" onClick={() => handleCopy(report.text)}>
                          Copy
                        </Button>
                      </div>
                      <div className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md">{report.text}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


