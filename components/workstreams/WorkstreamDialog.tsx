'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Workstream } from '@/lib/types';
import { toast } from 'sonner';

interface WorkstreamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workstream: Workstream | null;
  programId: string;
  onSuccess: () => void;
}

export function WorkstreamDialog({
  open,
  onOpenChange,
  workstream,
  programId,
  onSuccess,
}: WorkstreamDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    lead: '',
    status: 'GREEN' as 'GREEN' | 'YELLOW' | 'RED',
    percent_complete: 0,
    summary: '',
    description: '',
    start_date: '',
    end_date: '',
    tags: [] as string[],
    next_milestone: '',
    next_milestone_due: '',
  });

  useEffect(() => {
    if (workstream) {
      setFormData({
        name: workstream.name || '',
        lead: workstream.lead || '',
        status: workstream.status || 'GREEN',
        percent_complete: workstream.percent_complete || 0,
        summary: workstream.summary || '',
        description: workstream.description || '',
        start_date: workstream.start_date || '',
        end_date: workstream.end_date || '',
        tags: workstream.tags || [],
        next_milestone: workstream.next_milestone || '',
        next_milestone_due: workstream.next_milestone_due || '',
      });
    } else {
      setFormData({
        name: '',
        lead: '',
        status: 'GREEN',
        percent_complete: 0,
        summary: '',
        description: '',
        start_date: '',
        end_date: '',
        tags: [],
        next_milestone: '',
        next_milestone_due: '',
      });
    }
  }, [workstream, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = workstream
        ? '/api/workstreams'
        : '/api/workstreams';
      const method = workstream ? 'PATCH' : 'POST';

      const payload = workstream
        ? {
            id: workstream.id,
            programId,
            ...formData,
            tags: formData.tags.length > 0 ? formData.tags : undefined,
          }
        : {
            programId,
            ...formData,
            tags: formData.tags.length > 0 ? formData.tags : undefined,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save workstream');
      }

      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save workstream');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{workstream ? 'Edit Workstream' : 'Create Workstream'}</DialogTitle>
          <DialogDescription>
            {workstream ? 'Update workstream details' : 'Add a new workstream to the program'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead">Lead</Label>
                <Input
                  id="lead"
                  value={formData.lead}
                  onChange={(e) => setFormData({ ...formData, lead: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'GREEN' | 'YELLOW' | 'RED') =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GREEN">🟢 Green</SelectItem>
                    <SelectItem value="YELLOW">🟡 Yellow</SelectItem>
                    <SelectItem value="RED">🔴 Red</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="percent_complete">Progress %</Label>
                <Input
                  id="percent_complete"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.percent_complete}
                  onChange={(e) =>
                    setFormData({ ...formData, percent_complete: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="next_milestone">Next Milestone</Label>
                <Input
                  id="next_milestone"
                  value={formData.next_milestone}
                  onChange={(e) => setFormData({ ...formData, next_milestone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="next_milestone_due">Next Milestone Due</Label>
                <Input
                  id="next_milestone_due"
                  type="date"
                  value={formData.next_milestone_due}
                  onChange={(e) => setFormData({ ...formData, next_milestone_due: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : workstream ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

