'use client';

import useSWR from 'swr';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface AuditLogEntry {
  id: string;
  revoked_user: {
    id: string;
    email?: string;
    full_name?: string;
  };
  revoked_by: {
    id: string;
    email?: string;
    full_name?: string;
  };
  revocation_reason: string | null;
  membership_id: string | null;
  bulk_revocation_id: string | null;
  revoked_at: string;
}

interface AuditLogProps {
  programId: string;
}

export function AuditLog({ programId }: AuditLogProps) {
  const { data, error, isLoading } = useSWR<{
    ok: boolean;
    revocations: AuditLogEntry[];
  }>(programId ? `/api/members/audit?programId=${programId}` : null, fetcher);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading audit log...</p>
      </div>
    );
  }

  if (error || !data?.ok) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load audit log</p>
      </div>
    );
  }

  const revocations = data.revocations || [];

  if (revocations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No revocations recorded yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Revoked User</TableHead>
            <TableHead>Revoked By</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {revocations.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(entry.revoked_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                {entry.revoked_user.full_name || entry.revoked_user.email || 'Unknown'}
              </TableCell>
              <TableCell>
                {entry.revoked_by.full_name || entry.revoked_by.email || 'Unknown'}
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {entry.revocation_reason || (
                  <span className="text-muted-foreground italic">No reason provided</span>
                )}
              </TableCell>
              <TableCell>
                {entry.bulk_revocation_id ? (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                    Bulk
                  </span>
                ) : (
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                    Single
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

