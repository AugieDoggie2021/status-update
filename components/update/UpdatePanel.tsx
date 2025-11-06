"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { mutate } from "swr";
import { useRole } from "@/lib/client/role";
import { WORKSTREAMS_KEY } from "@/lib/client/keys";
import type { Action } from "@/lib/openai";
import type { Candidate } from "@/lib/server/resolve";

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

interface UpdatePanelProps {
  programId?: string;
}

type PendingState = {
  actions: Action[];
  candidates: Record<number, Candidate[]>;
};

export default function UpdatePanel({ programId = PROGRAM_ID || "default" }: UpdatePanelProps) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingState | null>(null);
  const router = useRouter();
  const role = useRole(); // "owner" | "contributor" | "viewer"
  const canSubmit = role === "owner" || role === "contributor";

  const apply = async (actions: Action[]) => {
    const res = await fetch("/api/apply-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions, programId }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.error || "Apply failed");
    }

    // Mutate SWR keys
    await Promise.all([
      mutate(WORKSTREAMS_KEY(programId)),
      mutate(`/api/overall?programId=${encodeURIComponent(programId)}`),
      mutate(`/api/risks?programId=${encodeURIComponent(programId)}`),
      mutate(`/api/actions?programId=${encodeURIComponent(programId)}`),
      mutate(`/api/explain-weekly?programId=${encodeURIComponent(programId)}`),
    ]);

    // Navigate and refresh
    router.push("/dashboard");
    router.refresh();

    return data;
  };

  const onSubmit = async () => {
    if (!canSubmit) {
      toast.error("Insufficient permissions", {
        description: "Viewer access cannot submit updates.",
      });
      return;
    }

    if (!notes.trim()) {
      toast.error("Nothing to submit", {
        description: "Please enter your update first.",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim(), programId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Parse failed");
      }

      if (data.confidence === "confident") {
        // All actions resolved, apply immediately
        await apply(data.actions);
        toast.success("Update applied", {
          description: `Updated ${data.actions.length} item(s).`,
        });
        setNotes("");
      } else {
        // Ambiguous - show confirmation UI
        setPending({ actions: data.actions, candidates: data.candidates });
        toast.info("Please confirm", {
          description: "Pick the correct workstream(s) and submit.",
        });
      }
    } catch (e: any) {
      console.error(e);
      const message = e?.message ?? "Please try again.";
      toast.error("Parse error", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const onConfirm = async () => {
    if (!pending) return;

    // Ensure every action has a workstreamId selected (including delete)
    const unresolved = pending.actions.filter((a) => !a.workstreamId);

    if (unresolved.length > 0) {
      toast.error("Missing selection", {
        description: "Please select a workstream for each item.",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await apply(pending.actions);
      toast.success("Update applied", {
        description: `Updated ${result.updatedCount || pending.actions.length} item(s).`,
      });
      setPending(null);
      setNotes("");
    } catch (e: any) {
      console.error(e);
      toast.error("Apply error", {
        description: e?.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <Card className="p-4 space-y-4 bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-900">Update</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-800">
              Write in plain English. For example: "This week we met with A, B, C to solve X, Y, Z. We hit a blocker on
              auth tokens; plan is to rotate keys Monday. Delivered the dashboard v2. Next milestone is Nov 15. We're still Green."
            </p>
          </div>
          <Textarea
            className="min-h-[200px] font-mono text-sm resize-none bg-white text-slate-900 border-slate-300"
            placeholder="What changed, blockers, delivered, next milestone, questions…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!canSubmit}
          />
          {!pending ? (
            <div className="flex items-center gap-3">
              <Button onClick={onSubmit} disabled={!canSubmit || loading || !notes.trim()}>
                {loading ? "Parsing…" : "Submit"}
              </Button>
              {!canSubmit && (
                <span className="text-xs text-slate-700">
                  Viewer role: ask an Owner/Contributor to submit.
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Confirm targets for each item:
              </div>
              {pending.actions.map((a, idx) => (
                <div key={idx} className="border rounded-md p-3 bg-white">
                  <div className="text-sm font-medium mb-2">
                    {a.intent.toUpperCase()} — "{a.name || a.workstreamId || 'Unknown'}"
                    {a.percent != null ? ` · ${a.percent}%` : ""}
                    {a.status ? ` · ${a.status}` : ""}
                  </div>
                  {!a.workstreamId && (
                    <select
                      className="mt-2 w-full border p-2 rounded text-sm"
                      onChange={(e) => {
                        const clone = structuredClone(pending);
                        clone.actions[idx].workstreamId = e.target.value || undefined;
                        setPending(clone);
                      }}
                      value={a.workstreamId || ""}
                    >
                      <option value="">Select workstream…</option>
                      {(pending.candidates[idx] ?? []).slice(0, 10).map((c: Candidate) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.slug ? `(${c.slug})` : ""} {c.score > 0 ? `[${Math.round(c.score * 100)}%]` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                  {a.workstreamId && (
                    <div className="text-xs text-muted-foreground mt-1">
                      ✓ Resolved
                    </div>
                  )}
                </div>
              ))}
              <div className="flex gap-3">
                <Button onClick={onConfirm} disabled={loading}>
                  {loading ? "Applying…" : "Apply"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPending(null)}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
