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
import { RevokeMemberDialog } from '@/components/RevokeMemberDialog';
import { BulkRevokeDialog } from '@/components/BulkRevokeDialog';
import { AuditLog } from '@/components/AuditLog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [memberToRevoke, setMemberToRevoke] = useState<Member | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [bulkRevokeDialogOpen, setBulkRevokeDialogOpen] = useState(false);

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

  // Bulk selection handlers
  const toggleMemberSelection = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const toggleSelectAll = () => {
    const selectableMembers = members.filter(m => m.role !== 'OWNER');
    if (selectedMembers.size === selectableMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(selectableMembers.map(m => m.id)));
    }
  };

  const handleBulkRevokeClick = () => {
    if (selectedMembers.size === 0) return;
    setBulkRevokeDialogOpen(true);
  };

  const handleBulkRevokeConfirm = async (reason?: string) => {
    if (selectedMembers.size === 0) return;

    try {
      const res = await fetch('/api/members/bulk-revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipIds: Array.from(selectedMembers),
          reason,
          programId: PROGRAM_ID,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke members');
      }

      toast.success(`Successfully revoked ${selectedMembers.size} member(s)`);
      setSelectedMembers(new Set());
      mutate();
      setBulkRevokeDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke members');
      throw error;
    }
  };

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

  const handleRemoveClick = (member: Member) => {
    setMemberToRevoke(member);
    setRevokeDialogOpen(true);
  };

  const handleRevokeConfirm = async (reason?: string) => {
    if (!memberToRevoke) return;

    try {
      const res = await fetch(`/api/members/${memberToRevoke.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      const memberName = memberToRevoke.full_name || memberToRevoke.email || 'Member';
      toast.success(`${memberName} removed successfully`);
      mutate();
      setMemberToRevoke(null);
    } catch (error) {
      const memberName = memberToRevoke.full_name || memberToRevoke.email || 'Member';
      toast.error(error instanceof Error ? error.message : `Failed to remove ${memberName}`);
      throw error; // Re-throw so dialog can handle it
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

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="audit">Revocation History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="members" className="space-y-6">

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Members ({members.length})</CardTitle>
              <CardDescription>Users with access to this program</CardDescription>
            </div>
            {selectedMembers.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedMembers.size} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkRevokeClick}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Revoke Selected
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No members yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      checked={
                        members.filter(m => m.role !== 'OWNER').length > 0 &&
                        selectedMembers.size === members.filter(m => m.role !== 'OWNER').length
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300"
                      aria-label="Select all members"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isSelectable = member.role !== 'OWNER';
                  const isSelected = selectedMembers.has(member.id);
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMemberSelection(member.id)}
                          disabled={!isSelectable}
                          className="h-4 w-4 rounded border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Select ${member.full_name || member.email || 'member'}`}
                        />
                      </TableCell>
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
                              onClick={() => handleRemoveClick(member)}
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="backdrop-blur-xl bg-white/50 dark:bg-slate-900/40 border border-white/20 rounded-2xl shadow-xl">
            <CardHeader>
              <CardTitle>Access Revocation History</CardTitle>
              <CardDescription>
                Audit trail of all member access revocations for this program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLog programId={PROGRAM_ID} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      <RevokeMemberDialog
        open={revokeDialogOpen}
        onOpenChange={setRevokeDialogOpen}
        member={memberToRevoke}
        onConfirm={handleRevokeConfirm}
      />

      <BulkRevokeDialog
        open={bulkRevokeDialogOpen}
        onOpenChange={setBulkRevokeDialogOpen}
        selectedCount={selectedMembers.size}
        selectedMembers={members.filter(m => selectedMembers.has(m.id))}
        onConfirm={handleBulkRevokeConfirm}
      />
    </div>
  );
}

