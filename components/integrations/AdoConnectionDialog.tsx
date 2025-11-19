'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AdoConnectionDialogProps {
  programId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdoConnectionDialog({ programId, onClose, onSuccess }: AdoConnectionDialogProps) {
  const [organizationUrl, setOrganizationUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!organizationUrl.trim() || !projectName.trim()) {
      toast.error('Please enter both organization URL and project name');
      return;
    }

    // Validate URL format
    try {
      new URL(organizationUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsConnecting(true);
    try {
      const res = await fetch('/api/integrations/ado/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId,
          organizationUrl: organizationUrl.trim(),
          projectName: projectName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate connection');
      }

      // Redirect to OAuth URL
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('No auth URL returned');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect');
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Azure DevOps</DialogTitle>
          <DialogDescription>
            Connect your Azure DevOps organization to sync work items, risks, and actions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-url">Organization URL</Label>
            <Input
              id="org-url"
              value={organizationUrl}
              onChange={(e) => setOrganizationUrl(e.target.value)}
              placeholder="https://dev.azure.com/myorg"
              disabled={isConnecting}
            />
            <p className="text-xs text-muted-foreground">
              Your Azure DevOps organization URL
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="MyProject"
              disabled={isConnecting}
            />
            <p className="text-xs text-muted-foreground">
              The project name in your Azure DevOps organization
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isConnecting}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

