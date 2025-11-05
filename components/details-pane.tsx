'use client';

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { getSeverityColor, getRiskStatusColor } from '@/lib/status';
import { fmtDate, fmtRelativeDate } from '@/lib/date';
import type { Workstream, Risk, ActionItem } from '@/lib/types';

interface DetailsPaneProps {
  workstream: Workstream | null;
  risks: Risk[];
  actions: ActionItem[];
  onActionToggle?: (actionId: string, newStatus: 'OPEN' | 'IN_PROGRESS' | 'DONE') => void;
  canWrite?: boolean;
}

export function DetailsPane({
  workstream,
  risks,
  actions,
  onActionToggle,
  canWrite = true,
}: DetailsPaneProps) {
  const [slipDays, setSlipDays] = useState(0);

  const workstreamRisks = workstream
    ? risks.filter((r) => r.workstream_id === workstream.id)
    : [];
  const workstreamActions = workstream
    ? actions.filter((a) => a.workstream_id === workstream.id)
    : [];

  // Scenario slider: what if milestone slips N days?
  const adjustedDueDate = useMemo(() => {
    if (!workstream?.next_milestone_due || slipDays === 0) return null;
    const baseDate = new Date(workstream.next_milestone_due);
    baseDate.setDate(baseDate.getDate() + slipDays);
    return baseDate.toISOString().split('T')[0]!;
  }, [workstream?.next_milestone_due, slipDays]);

  if (!workstream) {
    return (
      <Card className="sticky top-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Select a workstream to view details
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
        <CardTitle className="text-slate-900 dark:text-slate-100">{workstream.name}</CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Lead: {workstream.lead || 'Unassigned'}
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="risks">Risks ({workstreamRisks.length})</TabsTrigger>
            <TabsTrigger value="actions">Actions ({workstreamActions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4 mt-4">
            <div>
              <h4 className="text-sm font-semibold mb-2 text-slate-900 dark:text-slate-100">Status</h4>
              <Badge className={`${workstream.status === 'GREEN' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : workstream.status === 'YELLOW' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'}`}>
                {workstream.status}
              </Badge>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2 text-slate-900 dark:text-slate-100">Progress</h4>
              <p className="text-sm text-slate-900 dark:text-slate-100">{workstream.percent_complete}% complete</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2 text-slate-900 dark:text-slate-100">Summary</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {workstream.summary || 'No summary available'}
              </p>
            </div>
            {workstream.next_milestone && (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-slate-900 dark:text-slate-100">Next Milestone</h4>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{workstream.next_milestone}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {fmtRelativeDate(workstream.next_milestone_due)}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-medium mb-1 block text-slate-900 dark:text-slate-100">
                    Scenario: What if slip {slipDays > 0 ? `+${slipDays}` : slipDays} day{slipDays !== 1 ? 's' : ''}?
                  </label>
                  <Input
                    type="range"
                    min="0"
                    max="7"
                    value={slipDays}
                    onChange={(e) => setSlipDays(Number(e.target.value))}
                    className="w-full"
                  />
                  {adjustedDueDate && slipDays > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      → Would be due: {fmtRelativeDate(adjustedDueDate)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="risks" className="mt-4">
            <ScrollArea className="h-[400px]">
              {workstreamRisks.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-600 dark:text-slate-400">
                  <p className="font-medium">No open risks</p>
                  <p className="text-xs mt-1">Nice!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workstreamRisks.map((risk) => (
                    <div key={risk.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2 bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-start justify-between">
                        <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{risk.title}</h5>
                        <Badge className={getSeverityColor(risk.severity)} variant="outline">
                          {risk.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge
                          variant={risk.status === 'OPEN' ? 'default' : 'outline'}
                          className={getRiskStatusColor(risk.status) !== 'default' ? getRiskStatusColor(risk.status) : ''}
                        >
                          {risk.status}
                        </Badge>
                        {risk.owner && <span className="text-slate-600 dark:text-slate-400">Owner: {risk.owner}</span>}
                        {risk.due_date && (
                          <span className="text-slate-600 dark:text-slate-400">
                            Due: {fmtDate(risk.due_date)}
                          </span>
                        )}
                      </div>
                      {risk.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">{risk.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <ScrollArea className="h-[400px]">
              {workstreamActions.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-600 dark:text-slate-400">
                  <p className="font-medium">No open actions</p>
                  <p className="text-xs mt-1">All done!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workstreamActions.map((action) => (
                    <div key={action.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2 bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-start justify-between">
                        <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{action.title}</h5>
                        <Badge
                          variant={action.status === 'DONE' ? 'default' : 'outline'}
                          className={canWrite ? "cursor-pointer" : "cursor-default opacity-75"}
                          onClick={() => {
                            if (!canWrite || !onActionToggle) return;
                            if (action.status === 'DONE') {
                              onActionToggle(action.id, 'OPEN');
                            } else if (action.status === 'IN_PROGRESS') {
                              onActionToggle(action.id, 'DONE');
                            } else {
                              onActionToggle(action.id, 'IN_PROGRESS');
                            }
                          }}
                        >
                          {action.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {action.owner && (
                          <span className="text-slate-600 dark:text-slate-400">Owner: {action.owner}</span>
                        )}
                        {action.due_date && (
                          <span className="text-slate-600 dark:text-slate-400">
                            Due: {fmtDate(action.due_date)}
                          </span>
                        )}
                      </div>
                      {action.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">{action.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

