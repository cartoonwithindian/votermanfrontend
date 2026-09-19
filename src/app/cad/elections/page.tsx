"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { Vote, AlertTriangle, Inbox, RefreshCw } from "lucide-react";

interface ElectionRow {
  id: number;
  name: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  constituencies: number;
  votes_cast: number;
  eligible_voters: number;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "neutral" | "info"> = {
  OPEN: "success",
  DRAFT: "warning",
  CLOSED: "neutral",
  PUBLISHED: "info",
};

export default function CadElectionsPage() {
  const [elections, setElections] = useState<ElectionRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ elections: ElectionRow[] }>("/cad/elections");
      setElections(res.elections || []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load data. Please try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // election monitoring: refresh every 30s
    return () => clearInterval(t);
  }, [load]);

  if (loading) return <div className="p-8 text-center text-text-secondary">Loading...</div>;
  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-error-500 mx-auto mb-3" />
        <p className="text-text-primary font-medium">Unable to load elections</p>
        <p className="text-sm text-text-secondary">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Elections</h1>
          <p className="text-sm text-text-secondary mt-1">All elections with real-time vote counts.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5" disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {!elections || elections.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16">
            <Inbox className="h-12 w-12 text-text-tertiary mb-3" />
            <p className="text-text-secondary font-medium">No elections have been created yet.</p>
            <p className="text-sm text-text-tertiary mt-1">
              Elections created by the administrator will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-text-primary py-3 px-4">Election</th>
                  <th className="text-left font-semibold text-text-primary py-3 px-4">Status</th>
                  <th className="text-left font-semibold text-text-primary py-3 px-4">Constituencies</th>
                  <th className="text-left font-semibold text-text-primary py-3 px-4">Votes</th>
                  <th className="text-left font-semibold text-text-primary py-3 px-4">Eligible</th>
                </tr>
              </thead>
              <tbody>
                {elections.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-b-0 hover:bg-primary-50/40">
                    <td className="py-3 px-4 font-medium text-text-primary">{e.name}</td>
                    <td className="py-3 px-4">
                      <Badge variant={STATUS_VARIANT[e.status] || "neutral"}>{e.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{e.constituencies}</td>
                    <td className="py-3 px-4 text-text-secondary">{e.votes_cast}</td>
                    <td className="py-3 px-4 text-text-secondary">{e.eligible_voters}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
