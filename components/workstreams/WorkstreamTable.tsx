'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import type { Workstream } from '@/lib/types';

interface WorkstreamTableProps {
  workstreams: Workstream[];
  canWrite: boolean;
  onEdit: (workstream: Workstream) => void;
  onDelete: (workstreamId: string) => void;
}

export function WorkstreamTable({ workstreams, canWrite, onEdit, onDelete }: WorkstreamTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GREEN': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'YELLOW': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'RED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return '';
    }
  };

  if (workstreams.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">No workstreams found. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Summary</TableHead>
            {canWrite && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {workstreams.map((workstream) => (
            <TableRow key={workstream.id}>
              <TableCell className="font-medium">{workstream.name}</TableCell>
              <TableCell>{workstream.lead || '-'}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(workstream.status)}>
                  {workstream.status}
                </Badge>
              </TableCell>
              <TableCell>{workstream.percent_complete}%</TableCell>
              <TableCell className="max-w-md truncate">{workstream.summary || '-'}</TableCell>
              {canWrite && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(workstream)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(workstream.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

