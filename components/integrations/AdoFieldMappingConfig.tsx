'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Settings } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface FieldMapping {
  id: string;
  entity_type: 'workstream' | 'risk' | 'action';
  ado_field_name: string;
  tracker_field_name: string;
  mapping_type: 'direct' | 'transform' | 'custom';
  transform_function: string | null;
}

interface AdoFieldMappingConfigProps {
  connectionId: string;
  programId: string;
}

export function AdoFieldMappingConfig({ connectionId, programId }: AdoFieldMappingConfigProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMapping, setNewMapping] = useState<Partial<FieldMapping>>({
    entity_type: 'workstream',
    mapping_type: 'direct',
  });

  const { data: mappingsData, mutate: mutateMappings } = useSWR<{ ok: boolean; mappings: FieldMapping[] }>(
    `/api/integrations/ado/mappings?connectionId=${connectionId}`,
    fetcher
  );

  const handleAddMapping = async () => {
    if (!newMapping.ado_field_name || !newMapping.tracker_field_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const res = await fetch('/api/integrations/ado/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          entityType: newMapping.entity_type,
          adoFieldName: newMapping.ado_field_name,
          trackerFieldName: newMapping.tracker_field_name,
          mappingType: newMapping.mapping_type,
          transformFunction: newMapping.transform_function || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create mapping');
      }

      toast.success('Mapping created successfully');
      setShowAddDialog(false);
      setNewMapping({ entity_type: 'workstream', mapping_type: 'direct' });
      mutateMappings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create mapping');
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) {
      return;
    }

    try {
      const res = await fetch(`/api/integrations/ado/mappings/${mappingId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete mapping');
      }

      toast.success('Mapping deleted successfully');
      mutateMappings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete mapping');
    }
  };

  const mappings = mappingsData?.mappings || [];
  const groupedMappings = {
    workstream: mappings.filter(m => m.entity_type === 'workstream'),
    risk: mappings.filter(m => m.entity_type === 'risk'),
    action: mappings.filter(m => m.entity_type === 'action'),
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Field Mappings
            </CardTitle>
            <CardDescription>
              Configure how Azure DevOps fields map to Status Tracker fields
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Mapping
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mappings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No field mappings configured</p>
            <Button variant="outline" onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Mapping
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMappings).map(([entityType, entityMappings]) => {
              if (entityMappings.length === 0) return null;
              return (
                <div key={entityType}>
                  <h3 className="font-semibold mb-2 capitalize">{entityType} Mappings</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ADO Field</TableHead>
                        <TableHead>Tracker Field</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entityMappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell className="font-mono text-sm">{mapping.ado_field_name}</TableCell>
                          <TableCell className="font-mono text-sm">{mapping.tracker_field_name}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                              {mapping.mapping_type}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMapping(mapping.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Mapping Dialog */}
      {showAddDialog && (
        <Dialog open onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Field Mapping</DialogTitle>
              <DialogDescription>
                Map an Azure DevOps field to a Status Tracker field
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity Type</label>
                <Select
                  value={newMapping.entity_type}
                  onValueChange={(v: any) => setNewMapping({ ...newMapping, entity_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workstream">Workstream</SelectItem>
                    <SelectItem value="risk">Risk</SelectItem>
                    <SelectItem value="action">Action</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ADO Field Name</label>
                <Input
                  value={newMapping.ado_field_name || ''}
                  onChange={(e) => setNewMapping({ ...newMapping, ado_field_name: e.target.value })}
                  placeholder="System.Title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tracker Field Name</label>
                <Input
                  value={newMapping.tracker_field_name || ''}
                  onChange={(e) => setNewMapping({ ...newMapping, tracker_field_name: e.target.value })}
                  placeholder="name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mapping Type</label>
                <Select
                  value={newMapping.mapping_type}
                  onValueChange={(v: any) => setNewMapping({ ...newMapping, mapping_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="transform">Transform</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMapping}>Add Mapping</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

