"use client";

import React, { useEffect, useState } from "react";
import { Megaphone, Save, Loader2, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { studentApi, type MyCandidacy } from "@/lib/api/students";

interface MyCandidacyEditorProps {
  onUpdated?: () => void;
}

export function MyCandidacyEditor({ onUpdated }: MyCandidacyEditorProps) {
  const [candidacy, setCandidacy] = useState<MyCandidacy | null>(null);
  const [checked, setChecked] = useState(false);
  const [manifesto, setManifesto] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    studentApi
      .getMyCandidacy()
      .then((c) => {
        if (!alive) return;
        setCandidacy(c);
        setManifesto(c.manifesto || "");
        setChecked(true);
      })
      .catch(() => {
        if (!alive) return;
        setCandidacy(null);
        setChecked(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!checked || !candidacy) return null;

  const save = async () => {
    const text = manifesto.trim();
    if (!text) {
      setError("Manifesto cannot be empty.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await studentApi.updateMyManifesto(text);
      setCandidacy((prev) => (prev ? { ...prev, manifesto: updated.manifesto } : prev));
      setManifesto(updated.manifesto);
      setIsEditing(false);
      setSaved(true);
      onUpdated?.();
      window.setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save your manifesto. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
          <Megaphone className="w-6 h-6 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-text-primary">You are standing as a candidate</h2>
            <Badge variant="info">{candidacy.position_name || "Candidate"}</Badge>
            {candidacy.department && (
              <span className="text-xs text-text-secondary">
                {candidacy.department} • {candidacy.year} • Section {candidacy.section}
              </span>
            )}
          </div>

          {!isEditing ? (
            <div className="mt-2">
              <p className="text-sm text-text-secondary whitespace-pre-wrap">
                {candidacy.manifesto || "No manifesto yet."}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={() => {
                  setIsEditing(true);
                  setError(null);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit My Manifesto
              </Button>
            </div>
          ) : (
            <div className="mt-3">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Your manifesto — shown to voters on your candidate card
              </label>
              <textarea
                value={manifesto}
                onChange={(e) => setManifesto(e.target.value)}
                rows={5}
                maxLength={2000}
                className="w-full rounded-xl border border-border bg-white dark:bg-[#1e1e38] px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                placeholder="Tell your classmates why you want to represent them..."
              />
              {error && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-error-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </p>
              )}
              {saved && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-success-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Manifesto saved.
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Button variant="primary" size="sm" className="gap-1.5" onClick={save} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {isSaving ? "Saving..." : "Save Manifesto"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setManifesto(candidacy.manifesto || "");
                    setError(null);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}