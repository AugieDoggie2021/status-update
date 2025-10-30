'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fmtDate, isOverdue, isDueSoon } from '@/lib/date';
import type { ActionItem } from '@/lib/types';
import { toast } from 'sonner';
import { Save, X, Check } from 'lucide-react';

interface ActionsTableProps {
  actions: ActionItem[];
  workstreamNames: Map<string, string>;
  onUpdate?: () => void;
  canWrite?: boolean;
  programId?: string;
}

export function ActionsTable({ actions, workstreamNames, onUpdate, canWrite = true, programId }: ActionsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ActionItem>>({});

  const handleEdit = (action: ActionItem) => {
    setEditingId(action.id);
    setEditData({
      owner: action.owner,
      status: action.status,
      due_date: action.due_date || '',
    });
  };

  const handleSave = async (actionId: string) => {
    try {
      const res = await fetch('/api/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: actionId, programId, ...editData }),
      });

      if (!res.ok) {
        throw new Error('Failed to update');
      }

      toast.success('Action updated');
      setEditingId(null);
      setEditData({});
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to update action');
    }
  };

  const handleQuickToggle = async (actionId: string, currentStatus: ActionItem['status']) => {
    const newStatus = currentStatus === 'DONE' ? 'OPEN' : 'DONE';
    try {
      const res = await fetch('/api/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: actionId, programId, status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update');
      }

      toast.success('Action status updated');
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to update action');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Workstream</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead className="w-[150px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {actions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              <p className="font-medium">No actions found</p>
              <p className="text-xs mt-1">All done!</p>
            </TableCell>
          </TableRow>
        ) : (
          actions.map((action) => {
            const isEditing = editingId === action.id;
            const dueDateClass =
              isOverdue(action.due_date) ||
              (isDueSoon(action.due_date) && action.status !== 'DONE')
                ? 'text-red-600 font-medium'
                : '';

            return (
              <TableRow key={action.id}>
                <TableCell className="font-medium">{action.title}</TableCell>
                <TableCell>
                  {action.workstream_id
                    ? workstreamNames.get(action.workstream_id) || 'Unknown'
                    : '—'}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <select
                      value={editData.status || action.status}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          status: e.target.value as ActionItem['status'],
                        })
                      }
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="DONE">DONE</option>
                    </select>
                  ) : (
                    <Badge variant={action.status === 'DONE' ? 'default' : 'outline'}>
                      {action.status.replace('_', ' ')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editData.owner || ''}
                      onChange={(e) => setEditData({ ...editData, owner: e.target.value })}
                      placeholder="Owner"
                      className="w-32"
                    />
                  ) : (
                    action.owner || '—'
                  )}
                </TableCell>
                <TableCell className={dueDateClass}>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editData.due_date || ''}
                      onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                      className="w-40"
                    />
                  ) : (
                    fmtDate(action.due_date)
                  )}
                </TableCell>
                <TableCell className="max-w-xs truncate">{action.notes || '—'}</TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSave(action.id)}
                        aria-label="Save"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                        aria-label="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleQuickToggle(action.id, action.status)}
                        aria-label={action.status === 'DONE' ? 'Reopen' : 'Mark Done'}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      {canWrite ? (
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(action)}>
                          Edit
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">View only</span>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

