'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { MoreVertical, UserPlus, Trash2, Shield, User, Eye, TestTube } from 'lucide-react';
import type { Role } from '@/lib/role';
import { useImpersonation, startImpersonating, stopImpersonating } from '@/lib/client/impersonate';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Member = {
  id: string;
  user_id: string;
  role: Role;
  email?: string;
  full_name?: string;
};

export default function MembersPage() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('VIEWER');
  const [isInviting, setIsInviting] = useState(false);

  const { data: roleData } = useSWR<{ ok: boolean; role: Role | null }>(
    PROGRAM_ID ? `/api/role?programId=${PROGRAM_ID}` : null,
    fetcher
  );

  const { data: membersData, mutate } = useSWR<{ ok: boolean; members: Member[] }>(
    PROGRAM_ID ? `/api/members?programId=${PROGRAM_ID}` : null,
    fetcher
  );

  const { isImpersonating, impersonatedRole } = useImpersonation();
  // Check real role - if impersonating, we need to check if user is actually owner
  // For now, we'll show controls if they're owner OR if they're impersonating (so they can stop)
  const isOwner = roleData?.role === 'OWNER' || isImpersonating;

  const handleImpersonate = async (role: 'CONTRIBUTOR' | 'VIEWER') => {
    try {
      await startImpersonating(role);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start impersonation');
    }
  };

  const members = membersData?.members || [];

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email');
      return;
    }

    setIsInviting(true);
    try {
      const res = await fetch('/api/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: PROGRAM_ID,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to invite user');
      }

      toast.success('User invited successfully');
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('VIEWER');
      mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeRole = async (membershipId: string, newRole: Role) => {
    try {
      const res = await fetch(`/api/members/${membershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        throw new Error('Failed to update role');
      }

      toast.success('Role updated');
      mutate();
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleRemove = async (membershipId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      const res = await fetch(`/api/members/${membershipId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to remove member');
      }

      toast.success('Member removed');
      mutate();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  // Allow access if user is owner OR if they're impersonating (so they can stop impersonation)
  // Note: API routes will still enforce real OWNER role for member management operations
  if (!isOwner && !isImpersonating) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Access denied. Owner role required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ImpersonationBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Members</h2>
          <p className="text-muted-foreground mt-1">Manage program membership and roles</p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Impersonation Testing Section - Owner Only */}
      {isOwner && (
        <Card className="backdrop-blur-xl bg-white/50 dark:bg-slate-900/40 border border-purple-200 dark:border-purple-800 rounded-2xl shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test as Different Role
            </CardTitle>
            <CardDescription>
              Impersonate as CONTRIBUTOR or VIEWER to test the user experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {isImpersonating ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Currently impersonating as: <strong>{impersonatedRole}</strong>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => stopImpersonating()}
                  >
                    Stop Impersonating
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleImpersonate('CONTRIBUTOR')}
                  >
                    Test as Contributor
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleImpersonate('VIEWER')}
                  >
                    Test as Viewer
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="backdrop-blur-xl bg-white/50 dark:bg-slate-900/40 border border-white/20 rounded-2xl shadow-xl">
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          <CardDescription>Users with access to this program</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No members yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell>{member.email || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {member.role === 'OWNER' && <Shield className="h-4 w-4 text-purple-600" />}
                        {member.role === 'CONTRIBUTOR' && <User className="h-4 w-4 text-blue-600" />}
                        {member.role === 'VIEWER' && <Eye className="h-4 w-4 text-gray-600" />}
                        <span className="capitalize">{member.role.toLowerCase()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member.id, 'OWNER')}
                            disabled={member.role === 'OWNER'}
                          >
                            Set as Owner
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member.id, 'CONTRIBUTOR')}
                            disabled={member.role === 'CONTRIBUTOR'}
                          >
                            Set as Contributor
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member.id, 'VIEWER')}
                            disabled={member.role === 'VIEWER'}
                          >
                            Set as Viewer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRemove(member.id)}
                            className="text-destructive"
                            disabled={member.role === 'OWNER'}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border border-white/20 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Invite a user by email. They must sign up first if they don't have an account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="VIEWER">Viewer</option>
                <option value="CONTRIBUTOR">Contributor</option>
                <option value="OWNER">Owner</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isInviting}>
              {isInviting ? 'Inviting...' : 'Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

