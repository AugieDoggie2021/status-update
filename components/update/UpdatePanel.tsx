'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { previewParse, applyUpdate } from '@/lib/client/updateApi';
import { getStatusColor } from '@/lib/status';
import type { ParsedUpdate } from '@/lib/types';
import { Info, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

const demoScript = `Data Ingest: slipped 2 days; now 70%. New target Fri.
Modeling: on track at 45%. Next milestone "dimension conformance" next Wed.
QA: blocker—test data incomplete; create action for mock data by Mon (Jo).
Add MEDIUM risk on vendor API throughput.`;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UpdatePanelProps {
  onUpdateApplied?: () => void;
}

export function UpdatePanel({ onUpdateApplied }: UpdatePanelProps) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedUpdate | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // Get user role for RBAC
  const { data: roleData } = useSWR<{ ok: boolean; role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER' | null }>(
    PROGRAM_ID ? `/api/role?programId=${PROGRAM_ID}` : null,
    fetcher
  );

  const role = roleData?.role || null;
  const canWrite = role === 'OWNER' || role === 'CONTRIBUTOR';
  const isViewer = role === 'VIEWER';

  const handlePreviewParse = async () => {
    if (!notes.trim()) {
      toast.error('Please enter some notes');
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setParsedData(null);

    try {
      const parsed = await previewParse(notes);
      setParsedData(parsed);
      toast.success('Parse successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse notes';
      setParseError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyUpdate = async () => {
    if (!notes.trim()) {
      toast.error('Please enter some notes');
      return;
    }

    if (!canWrite) {
      toast.error('You are signed in as Viewer. Ask an Owner or Contributor to apply updates.');
      return;
    }

    setIsApplying(true);
    setParseError(null);

    try {
      const result = await applyUpdate(PROGRAM_ID, notes);
      
      if (result.ok) {
        setNotes('');
        setParsedData(null);
        toast.success('Update applied successfully');
        
        // Refresh SWR keys
        if (onUpdateApplied) {
          onUpdateApplied();
        } else {
          // Navigate to dashboard to see changes
          router.push('/dashboard');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply update';
      setParseError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsApplying(false);
    }
  };

  const hasValidPreview = parsedData && !parseError && (
    parsedData.workstreams.length > 0 ||
    parsedData.risks.length > 0 ||
    parsedData.actions.length > 0
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-900 dark:text-slate-100">Update</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Info className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-2">
                    <p className="font-semibold">Example:</p>
                    <pre className="text-xs whitespace-pre-wrap bg-slate-100 dark:bg-slate-800 p-2 rounded">
                      {demoScript}
                    </pre>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="update-textarea" className="text-sm font-medium text-slate-900 dark:text-slate-100 block mb-2">
                What changed, blockers, delivered, next milestone, questions...
              </label>
              <Textarea
                id="update-textarea"
                placeholder="Paste your plain-English update notes here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={12}
                className="font-mono text-sm resize-none"
                disabled={isViewer}
              />
              {isViewer && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  Viewer access—ask an Owner/Contributor to apply updates.
                </p>
              )}
            </div>

            {parseError && (
              <Alert variant="destructive">
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={handlePreviewParse}
                      disabled={isParsing || !notes.trim() || (isViewer && !canWrite)}
                      variant="outline"
                    >
                      {isParsing ? 'Parsing...' : 'Preview Parse'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {isViewer && (
                  <TooltipContent>
                    Viewer access—ask an Owner/Contributor to apply updates.
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={handleApplyUpdate}
                      disabled={isApplying || !notes.trim() || !canWrite || !hasValidPreview}
                    >
                      {isApplying ? 'Applying...' : 'Apply Update'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {isViewer && (
                  <TooltipContent>
                    Viewer access—ask an Owner/Contributor to apply updates.
                  </TooltipContent>
                )}
                {!hasValidPreview && parsedData === null && (
                  <TooltipContent>
                    Preview the parse first to see what will change.
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        <AnimatePresence>
          {hasValidPreview && parsedData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-slate-100 text-lg">
                    Preview of Changes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {parsedData.workstreams.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Workstreams
                      </h4>
                      <div className="space-y-3">
                        {parsedData.workstreams.map((ws, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {ws.name}
                              </span>
                              <Badge className={getStatusColor(ws.status)}>
                                {ws.status}
                              </Badge>
                            </div>
                            <div className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
                              <p>Progress: {ws.percent_complete}%</p>
                              {ws.next_milestone && (
                                <p>Next: {ws.next_milestone}</p>
                              )}
                              {ws.next_milestone_due && (
                                <p>Due: {new Date(ws.next_milestone_due).toLocaleDateString()}</p>
                              )}
                              {ws.summary && (
                                <p className="italic">"{ws.summary}"</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedData.risks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Risks
                      </h4>
                      <div className="space-y-2">
                        {parsedData.risks.map((risk, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {risk.title}
                              </span>
                              <Badge variant="destructive">{risk.severity}</Badge>
                              {risk.workstream && (
                                <Badge variant="outline">{risk.workstream}</Badge>
                              )}
                            </div>
                            {risk.owner && (
                              <p className="text-slate-600 dark:text-slate-400 mt-1">
                                Owner: {risk.owner}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedData.actions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Actions
                      </h4>
                      <div className="space-y-2">
                        {parsedData.actions.map((action, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {action.title}
                              </span>
                              <Badge>{action.status}</Badge>
                              {action.workstream && (
                                <Badge variant="outline">{action.workstream}</Badge>
                              )}
                            </div>
                            {action.owner && (
                              <p className="text-slate-600 dark:text-slate-400 mt-1">
                                Owner: {action.owner}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <details
                    className="mt-4"
                    open={showJsonPreview}
                    onToggle={(e) => setShowJsonPreview((e.target as HTMLDetailsElement).open)}
                  >
                    <summary className="cursor-pointer text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1 list-none">
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${showJsonPreview ? 'rotate-90' : ''}`}
                      />
                      <span>Show JSON preview (for power users)</span>
                    </summary>
                    <pre className="mt-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-4 rounded-md overflow-auto border border-slate-200 dark:border-slate-700">
                      {JSON.stringify(parsedData, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

