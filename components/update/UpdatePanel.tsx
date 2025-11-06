"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { submitUpdate } from "@/lib/client/api";
import { useRole } from "@/lib/client/role";

export default function UpdatePanel() {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const role = useRole(); // "owner" | "contributor" | "viewer"
  const canSubmit = role === "owner" || role === "contributor";

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

    try {
      setLoading(true);
      await submitUpdate(notes.trim());
      toast.success("Update applied", {
        description: "Your changes were saved.",
      });
      
      // Navigate to dashboard - SWR will automatically refetch data
      router.push("/dashboard");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to submit", {
        description: e?.message ?? "Please try again.",
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
          <div className="flex items-center gap-3">
            <Button onClick={onSubmit} disabled={!canSubmit || loading || !notes.trim()}>
              {loading ? "Submitting…" : "Submit"}
            </Button>
            {!canSubmit && (
              <span className="text-xs text-slate-700">
                Viewer role: ask an Owner/Contributor to submit.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
