"use client";

import React, { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useRole } from "@/lib/client/role";
import { WORKSTREAMS_KEY } from "@/lib/client/keys";
import { toast } from "sonner";

type DeletedItem = {
  id: string;
  name: string;
  status?: "GREEN" | "YELLOW" | "RED";
  percent_complete?: number;
  deleted_at?: string;
};

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then(r => r.json());

export default function DeletedWorkstreams({ programId = "default" }: { programId?: string }) {
  const role = useRole();
  const canRestore = role === "owner" || role === "contributor";

  const { data } = useSWR<DeletedItem[]>(
    programId ? `/api/workstreams/deleted?programId=${encodeURIComponent(programId)}` : null,
    fetcher
  );

  const router = useRouter();
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const base = data ?? [];
    if (!q.trim()) return base;
    const n = q.toLowerCase();
    return base.filter(i => i.name.toLowerCase().includes(n));
  }, [data, q]);

  const onRestore = async (id: string) => {
    if (!canRestore) {
      toast.error("Permission denied", {
        description: "Only Owners and Contributors can restore workstreams.",
      });
      return;
    }

    try {
      const res = await fetch(`/api/workstreams/${id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const errorText = json.error || await res.text().catch(() => "Failed to restore");
        toast.error("Failed to restore", {
          description: errorText,
        });
        return;
      }

      toast.success("Workstream restored", {
        description: "The workstream has been restored and will appear on the dashboard.",
      });

      // Refresh admin list + dashboard
      await Promise.all([
        mutate(`/api/workstreams/deleted?programId=${encodeURIComponent(programId)}`),
        mutate(WORKSTREAMS_KEY(programId)),
        mutate(`/api/overall?programId=${encodeURIComponent(programId)}`),
        mutate(`/api/risks?programId=${encodeURIComponent(programId)}`),
        mutate(`/api/actions?programId=${encodeURIComponent(programId)}`),
        mutate(`/api/explain-weekly?programId=${encodeURIComponent(programId)}`),
      ]);

      router.refresh();
    } catch (error) {
      console.error("Restore error:", error);
      toast.error("Failed to restore", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Deleted Items</h1>
        <div className="w-64">
          <Input 
            placeholder="Search by name…" 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
          />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(list ?? []).map(item => (
          <Card key={item.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  Deleted {item.deleted_at ? new Date(item.deleted_at).toLocaleString() : ""}
                </div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">% complete: {item.percent_complete ?? 0}%</div>
                <div className="text-muted-foreground">Status: {item.status ?? "—"}</div>
              </div>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => onRestore(item.id)}
                disabled={!canRestore}
                title={canRestore ? "Restore this workstream" : "Viewer cannot restore"}
              >
                Restore
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {list?.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">
          No deleted items found.
        </Card>
      )}
    </div>
  );
}

