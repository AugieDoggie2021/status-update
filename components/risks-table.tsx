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
import { getSeverityColor, getRiskStatusColor } from '@/lib/status';
import { fmtDate, isOverdue, isDueSoon } from '@/lib/date';
import type { Risk } from '@/lib/types';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';

interface RisksTableProps {
  risks: Risk[] | any;
  workstreamNames: Map<string, string>;
  onUpdate?: () => void;
  canWrite?: boolean;
  programId?: string;
}

export function RisksTable({ risks, workstreamNames, onUpdate, canWrite = true, programId }: RisksTableProps) {
  // Defensive normalization
  const risksArr = Array.isArray(risks)
    ? risks
    : Array.isArray((risks as any)?.data)
    ? (risks as any).data
    : Array.isArray((risks as any)?.risks)
    ? (risks as any).risks
    : [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Risk>>({});

  const handleEdit = (risk: Risk) => {
    setEditingId(risk.id);
    setEditData({
      owner: risk.owner,
      status: risk.status,
      due_date: risk.due_date || '',
    });
  };

  const handleSave = async (riskId: string) => {
    try {
      const res = await fetch('/api/risks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: riskId, programId, ...editData }),
      });

      if (!res.ok) {
        throw new Error('Failed to update');
      }

      toast.success('Risk updated');
      setEditingId(null);
      setEditData({});
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to update risk');
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
          <TableHead>Severity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {risksArr.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
              <p className="font-medium">No risks found</p>
              <p className="text-xs mt-1">All clear!</p>
            </TableCell>
          </TableRow>
        ) : (
          risksArr.map((risk: Risk) => {
            const isEditing = editingId === risk.id;
            const dueDateClass =
              isOverdue(risk.due_date) || (isDueSoon(risk.due_date) && risk.status === 'OPEN')
                ? 'text-red-600 font-medium'
                : '';

            return (
              <TableRow key={risk.id}>
                <TableCell className="font-medium">{risk.title}</TableCell>
                <TableCell>
                  {risk.workstream_id
                    ? workstreamNames.get(risk.workstream_id) || 'Unknown'
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge className={getSeverityColor(risk.severity)} variant="outline">
                    {risk.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <select
                      value={editData.status || risk.status}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value as Risk['status'] })
                      }
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="MITIGATED">MITIGATED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  ) : (
                    <Badge
                      variant={risk.status === 'OPEN' ? 'default' : 'outline'}
                      className={getRiskStatusColor(risk.status) !== 'default' ? getRiskStatusColor(risk.status) : ''}
                    >
                      {risk.status}
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
                    risk.owner || '—'
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
                    fmtDate(risk.due_date)
                  )}
                </TableCell>
                <TableCell className="max-w-xs truncate">{risk.notes || '—'}</TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSave(risk.id)}
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
                  ) : canWrite ? (
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(risk)}>
                      Edit
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">View only</span>
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

