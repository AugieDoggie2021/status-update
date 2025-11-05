'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getStatusDotColor, getStatusColor } from '@/lib/status';
import { fmtRelativeDate, fmtRelativeTime } from '@/lib/date';
import { isOverdue } from '@/lib/date';
import type { Workstream } from '@/lib/types';
import { cn } from '@/lib/utils';

interface WorkstreamCardProps {
  workstream: Workstream;
  onClick?: () => void;
  isSelected?: boolean;
}

export function WorkstreamCard({
  workstream,
  onClick,
  isSelected,
}: WorkstreamCardProps) {
  const [relativeTime, setRelativeTime] = useState(fmtRelativeTime(workstream.updated_at));

  useEffect(() => {
    // Update relative time every 60 seconds
    const interval = setInterval(() => {
      setRelativeTime(fmtRelativeTime(workstream.updated_at));
    }, 60000);

    return () => clearInterval(interval);
  }, [workstream.updated_at]);

  const isRedStatus = workstream.status === 'RED';
  const isDueSoon = workstream.next_milestone_due && (
    isOverdue(workstream.next_milestone_due) ||
    (() => {
      const due = new Date(workstream.next_milestone_due);
      const now = new Date();
      const daysUntilDue = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue >= 0 && daysUntilDue < 2;
    })()
  );

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'cursor-pointer card-lift bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg h-full flex flex-col',
          isSelected && 'ring-2 ring-emerald-500/50'
        )}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        aria-label={`Workstream: ${workstream.name}`}
      >
        <CardHeader className="pb-3 bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-slate-800 dark:to-slate-800 rounded-t-2xl border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between">
            <h3 className="font-display font-semibold text-lg tracking-tight text-slate-900 dark:text-slate-100">{workstream.name}</h3>
            <div className="flex items-center gap-2">
              <motion.div
                className={cn(
                  'h-3 w-3 rounded-full',
                  getStatusDotColor(workstream.status),
                  (isRedStatus || isDueSoon) && 'status-pulse'
                )}
                aria-label={`Status: ${workstream.status}`}
                whileHover={{ scale: 1.2, rotate: 3 }}
              />
              <Badge className={getStatusColor(workstream.status)} variant="outline">
                {workstream.status}
              </Badge>
            </div>
          </div>
        {workstream.lead && (
          <p className="text-sm text-slate-600 dark:text-slate-400">Lead: {workstream.lead}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 flex-grow">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-slate-600 dark:text-slate-400">Progress</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{workstream.percent_complete}%</span>
          </div>
          <Progress value={workstream.percent_complete} className="h-2" />
        </div>

        {workstream.next_milestone && (
          <div className="text-sm">
            <p className="font-medium text-slate-900 dark:text-slate-100">{workstream.next_milestone}</p>
            <p className="text-slate-600 dark:text-slate-400">
              {fmtRelativeDate(workstream.next_milestone_due)}
            </p>
          </div>
        )}

        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
          {workstream.summary || 'No summary available'}
        </p>

        <p className="text-xs text-slate-500 dark:text-slate-500">
          Updated • {relativeTime}
        </p>
      </CardContent>
    </Card>
    </motion.div>
  );
}

