'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Trash2, RefreshCw, Settings } from 'lucide-react';
import { AdoConnectionDialog } from '@/components/integrations/AdoConnectionDialog';
import { AdoSyncPanel } from '@/components/integrations/AdoSyncPanel';
import { AdoFieldMappingConfig } from '@/components/integrations/AdoFieldMappingConfig';
import type { Role } from '@/lib/role';
import { useImpersonation } from '@/lib/client/impersonate';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface AdoConnection {
  id: string;
  organization_url: string;
  project_name: string;
  created_at: string;
  updated_at: string;
  token_expires_at: string | null;
}

export default function IntegrationsPage() {
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  const { data: roleData } = useSWR<{ ok: boolean; role: Role | null }>(
    PROGRAM_ID ? `/api/role?programId=${PROGRAM_ID}` : null,
    fetcher
  );

  const { data: connectionsData, mutate: mutateConnections } = useSWR<{ ok: boolean; connections: AdoConnection[] }>(
    PROGRAM_ID ? `/api/integrations/ado/connections?programId=${PROGRAM_ID}` : null,
    fetcher
  );

  const { isImpersonating } = useImpersonation();
  const isOwner = roleData?.role === 'OWNER' || isImpersonating;

  // Check for success/error in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success('Azure DevOps connection established successfully');
      mutateConnections();
      // Clean up URL
      window.history.replaceState({}, '', '/admin/integrations');
    }
    if (params.get('error')) {
      toast.error(`Connection failed: ${params.get('error')}`);
      // Clean up URL
      window.history.replaceState({}, '', '/admin/integrations');
    }
  }, [mutateConnections]);

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this Azure DevOps connection?')) {
      return;
    }

    try {
      const res = await fetch(`/api/integrations/ado/connections/${connectionId}?programId=${PROGRAM_ID}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to disconnect');
      }

      toast.success('Connection disconnected successfully');
      mutateConnections();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect');
    }
  };

  // Check access
  if (!isOwner && !isImpersonating) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Access denied. Owner role required.</p>
      </div>
    );
  }

  const connections = connectionsData?.connections || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Integrations</h2>
          <p className="text-muted-foreground mt-1">Connect external tools and sync data</p>
        </div>
        <Button onClick={() => setShowConnectionDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Connect Azure DevOps
        </Button>
      </div>

      {/* Azure DevOps Connections */}
      <Card className="backdrop-blur-xl bg-white/50 dark:bg-slate-900/40 border border-white/20 rounded-2xl shadow-xl">
        <CardHeader>
          <CardTitle>Azure DevOps</CardTitle>
          <CardDescription>
            Sync work items, risks, and actions with Azure DevOps
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No Azure DevOps connections</p>
              <Button onClick={() => setShowConnectionDialog(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Connect Azure DevOps
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <Card key={connection.id} className="border">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{connection.project_name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{connection.organization_url}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Connected: {new Date(connection.created_at).toLocaleDateString()}</span>
                          {connection.token_expires_at && (
                            <span>
                              Expires: {new Date(connection.token_expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedConnectionId(connection.id)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(connection.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {selectedConnectionId === connection.id && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <AdoSyncPanel connectionId={connection.id} programId={PROGRAM_ID} />
                        <AdoFieldMappingConfig connectionId={connection.id} programId={PROGRAM_ID} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Dialog */}
      {showConnectionDialog && (
        <AdoConnectionDialog
          programId={PROGRAM_ID}
          onClose={() => setShowConnectionDialog(false)}
          onSuccess={() => {
            setShowConnectionDialog(false);
            mutateConnections();
          }}
        />
      )}
    </div>
  );
}

