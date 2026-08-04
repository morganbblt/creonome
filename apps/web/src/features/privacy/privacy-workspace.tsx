"use client";

import {
  AccountDeletionCancellationSchema,
  AccountDeletionRequestSchema,
  PrivacyExportSchema,
  PrivacyPreferencesSchema,
  type PrivacyExportKind,
  type PrivacyState,
} from "@creonome/contracts";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Switch } from "@/src/components/ui/switch";

const exportLabels: Record<PrivacyExportKind, string> = {
  creator_dna: "Creator DNA",
  projects: "Projects & scripts",
  everything: "Everything",
};

const exportKinds: PrivacyExportKind[] = [
  "creator_dna",
  "projects",
  "everything",
];

function PreferenceToggle({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3.5 p-4">
      <Switch
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

export function PrivacyWorkspace({
  initialState,
}: {
  initialState: PrivacyState;
}) {
  const [state, setState] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<PrivacyExportKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deletionBusy, setDeletionBusy] = useState(false);

  function closeDialog() {
    setDialogOpen(false);
    setConfirmation("");
  }

  async function savePreferences(
    next: Pick<
      PrivacyState["preferences"],
      "modelTrainingOptIn" | "keepRushesAfterExport"
    >,
  ) {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/creonome/privacy/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("Privacy preference update failed");
      const preferences = PrivacyPreferencesSchema.parse(await response.json());
      setState((current) => ({ ...current, preferences }));
      setMessage("Privacy preferences saved.");
    } catch {
      setError("Your privacy settings could not be saved. Nothing changed.");
    } finally {
      setSaving(false);
    }
  }

  async function download(kind: PrivacyExportKind) {
    setExporting(kind);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/creonome/privacy/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!response.ok) throw new Error("Privacy export failed");
      const portableExport = PrivacyExportSchema.parse(await response.json());
      const url = URL.createObjectURL(
        new Blob([portableExport.content], { type: portableExport.mimeType }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = portableExport.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`${exportLabels[kind]} downloaded.`);
    } catch {
      setError("The data export could not be prepared. Your data is intact.");
    } finally {
      setExporting(null);
    }
  }

  async function scheduleDeletion() {
    if (confirmation !== "DELETE MY ACCOUNT") return;
    setDeletionBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/creonome/privacy/account-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      if (!response.ok) throw new Error("Deletion scheduling failed");
      const accountDeletion = AccountDeletionRequestSchema.parse(
        await response.json(),
      );
      setState((current) => ({ ...current, accountDeletion }));
      closeDialog();
    } catch {
      setError(
        "The deletion request could not be recorded. Your data is intact.",
      );
    } finally {
      setDeletionBusy(false);
    }
  }

  async function cancelDeletion() {
    if (!state.accountDeletion) return;
    setDeletionBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/creonome/privacy/account-deletion/${state.accountDeletion.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Deletion cancellation failed");
      const receipt = AccountDeletionCancellationSchema.parse(
        await response.json(),
      );
      if (receipt.id !== state.accountDeletion.id) {
        throw new Error("Deletion cancellation mismatch");
      }
      setState((current) => ({ ...current, accountDeletion: null }));
      setMessage("Deletion request cancelled.");
    } catch {
      setError("The deletion request could not be cancelled. Try again.");
    } finally {
      setDeletionBusy(false);
    }
  }

  const preferences = state.preferences;

  return (
    <main className="mx-auto w-full max-w-[720px] px-5.5 py-8.5 pb-14 max-[620px]:px-3.5 max-[620px]:py-6">
      <div className="overflow-hidden rounded-card border border-border bg-card shadow-sm">
        <header className="flex items-center justify-between gap-5 border-b border-border px-5.5 py-4.5">
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Control &amp; portability
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Your data</h1>
          </div>
          <Badge variant="success" className="max-[620px]:hidden">
            Private by default
          </Badge>
        </header>

        <div className="flex flex-col gap-3 p-5">
          <div className="divide-y divide-border overflow-hidden rounded-card border border-border">
            <PreferenceToggle
              label="Help improve the models"
              description={
                preferences.modelTrainingOptIn
                  ? "On. You allow selected workspace data to improve Creonome models."
                  : "Off. Your media and Creator DNA are not used for model training."
              }
              checked={preferences.modelTrainingOptIn}
              disabled={saving}
              onCheckedChange={(checked) =>
                void savePreferences({
                  modelTrainingOptIn: checked,
                  keepRushesAfterExport: preferences.keepRushesAfterExport,
                })
              }
            />
            <PreferenceToggle
              label="Keep rushes after export"
              description={
                preferences.keepRushesAfterExport
                  ? "On. Private source files stay in your library after export."
                  : "Off. Your 30-day retention preference is recorded; automatic deletion is not active in this MVP."
              }
              checked={preferences.keepRushesAfterExport}
              disabled={saving}
              onCheckedChange={(checked) =>
                void savePreferences({
                  modelTrainingOptIn: preferences.modelTrainingOptIn,
                  keepRushesAfterExport: checked,
                })
              }
            />
          </div>

          <div aria-live="polite">
            {message ? (
              <p className="text-sm font-medium text-success">{message}</p>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <section className="rounded-card border border-border p-4.5">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Portable exports
            </p>
            <h2 className="text-base font-semibold text-foreground">
              Download structured workspace data
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Exports are prepared immediately as JSON. Private media binaries
              remain in your Library.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {exportKinds.map((kind) => (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  key={kind}
                  disabled={exporting !== null}
                  onClick={() => void download(kind)}
                >
                  {exporting === kind ? (
                    <Loader2Icon className="animate-spin" />
                  ) : null}
                  {exporting === kind
                    ? "Preparing…"
                    : `${exportLabels[kind]} · JSON`}
                </Button>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-destructive/30 bg-destructive/5 p-4.5">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-destructive">
              Deletion
            </p>
            <h2 className="text-base font-semibold text-destructive">
              Delete a source, or request account deletion
            </h2>
            <p className="mt-1.5 text-sm text-destructive/90">
              Deleting a source also removes its private analysis. Account
              deletion requests stay cancellable during the 24-hour window.
            </p>

            {state.accountDeletion ? (
              <div
                role="status"
                className="mt-4 rounded-control border border-destructive/40 bg-card p-3.5"
              >
                <strong className="block text-sm font-semibold text-foreground">
                  Your deletion request is scheduled.
                </strong>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Recorded for{" "}
                  {new Date(
                    state.accountDeletion.scheduledFor,
                  ).toLocaleString()}
                  . Final deletion processing is not active in this MVP.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={deletionBusy}
                  onClick={() => void cancelDeletion()}
                >
                  {deletionBusy ? "Cancelling…" : "Cancel deletion request"}
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href="/library">Delete a source</Link>
                </Button>
                <Dialog
                  open={dialogOpen}
                  onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setConfirmation("");
                  }}
                >
                  <DialogTrigger asChild>
                    <Button type="button" variant="destructive" size="sm">
                      Delete my account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-destructive">
                        Confirm deletion request
                      </p>
                      <DialogTitle>Schedule account deletion</DialogTitle>
                      <DialogDescription>
                        This records a cancellable request. Type DELETE MY
                        ACCOUNT to continue.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                      <Label htmlFor="delete-confirmation">
                        Type DELETE MY ACCOUNT
                      </Label>
                      <Input
                        id="delete-confirmation"
                        autoFocus
                        autoComplete="off"
                        value={confirmation}
                        onChange={(event) =>
                          setConfirmation(event.target.value)
                        }
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeDialog}
                      >
                        Keep my account
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={
                          deletionBusy || confirmation !== "DELETE MY ACCOUNT"
                        }
                        onClick={() => void scheduleDeletion()}
                      >
                        {deletionBusy
                          ? "Scheduling…"
                          : "Schedule account deletion"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
