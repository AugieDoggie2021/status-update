'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';

interface BulkRevokeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  selectedMembers: Array<{
    id: string;
    email?: string;
    full_name?: string;
  }>;
  onConfirm: (reason?: string) => Promise<void>;
}

export function BulkRevokeDialog({
  open,
  onOpenChange,
  selectedCount,
  selectedMembers,
  onConfirm,
}: BulkRevokeDialogProps) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(reason.trim() || undefined);
      setReason('');
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border border-white/20 rounded-2xl max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Revoke Access for {selectedCount} Member{selectedCount !== 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Remove {selectedCount} member{selectedCount !== 1 ? 's' : ''} from this program. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-sm text-destructive font-medium mb-2">
              Warning: This will immediately revoke all access for {selectedCount} member{selectedCount !== 1 ? 's' : ''}. They will no longer be able to view or interact with this program.
            </p>
            <div className="mt-2 max-h-40 overflow-y-auto">
              <p className="text-xs text-muted-foreground font-medium mb-1">Selected members:</p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                {selectedMembers.slice(0, 10).map((member) => (
                  <li key={member.id}>
                    {member.full_name || member.email || 'Unknown'}
                  </li>
                ))}
                {selectedMembers.length > 10 && (
                  <li className="text-muted-foreground italic">
                    ...and {selectedMembers.length - 10} more
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-reason">Reason (optional)</Label>
            <Textarea
              id="bulk-reason"
              placeholder="Enter a reason for revoking access..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Providing a reason helps maintain an audit trail.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Revoking...' : `Revoke ${selectedCount} Member${selectedCount !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

