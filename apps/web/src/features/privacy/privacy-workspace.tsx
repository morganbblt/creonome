"use client";

import {
  AccountDeletionCancellationSchema,
  AccountDeletionRequestSchema,
  PrivacyExportSchema,
  PrivacyPreferencesSchema,
  type PrivacyExportKind,
  type PrivacyState,
} from "@creonome/contracts";
import Link from "next/link";
import { useState } from "react";
import styles from "./privacy.module.css";

const exportLabels: Record<PrivacyExportKind, string> = {
  creator_dna: "Creator DNA",
  projects: "Projects & scripts",
  everything: "Everything",
};

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
      setDialogOpen(false);
      setConfirmation("");
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
    <main className={styles.page}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div>
            <p>CONTROL &amp; PORTABILITY</p>
            <h1>Your data</h1>
          </div>
          <span>Private by default</span>
        </header>

        <div className={styles.content}>
          <div className={styles.preference}>
            <button
              type="button"
              role="switch"
              aria-label="Help improve the models"
              aria-checked={preferences.modelTrainingOptIn}
              disabled={saving}
              onClick={() =>
                void savePreferences({
                  modelTrainingOptIn: !preferences.modelTrainingOptIn,
                  keepRushesAfterExport: preferences.keepRushesAfterExport,
                })
              }
            >
              <span />
            </button>
            <div>
              <strong>Help improve the models</strong>
              <p>
                {preferences.modelTrainingOptIn
                  ? "On. You allow selected workspace data to improve Creonome models."
                  : "Off. Your media and Creator DNA are not used for model training."}
              </p>
            </div>
          </div>

          <div className={styles.preference}>
            <button
              type="button"
              role="switch"
              aria-label="Keep rushes after export"
              aria-checked={preferences.keepRushesAfterExport}
              disabled={saving}
              onClick={() =>
                void savePreferences({
                  modelTrainingOptIn: preferences.modelTrainingOptIn,
                  keepRushesAfterExport: !preferences.keepRushesAfterExport,
                })
              }
            >
              <span />
            </button>
            <div>
              <strong>Keep rushes after export</strong>
              <p>
                {preferences.keepRushesAfterExport
                  ? "On. Private source files stay in your library after export."
                  : "Off. Your 30-day retention preference is recorded; automatic deletion is not active in this MVP."}
              </p>
            </div>
          </div>

          <div className={styles.notice} aria-live="polite">
            {message ? <p>{message}</p> : null}
            {error ? <p role="alert">{error}</p> : null}
          </div>

          <section className={styles.exportSection}>
            <p className={styles.sectionLabel}>PORTABLE EXPORTS</p>
            <h2>Download structured workspace data</h2>
            <p>
              Exports are prepared immediately as JSON. Private media binaries
              remain in your Library.
            </p>
            <div className={styles.actions}>
              {(
                ["creator_dna", "projects", "everything"] as PrivacyExportKind[]
              ).map((kind) => (
                <button
                  type="button"
                  key={kind}
                  disabled={exporting !== null}
                  onClick={() => void download(kind)}
                >
                  {exporting === kind
                    ? "Preparing…"
                    : `${exportLabels[kind]} · JSON`}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.danger}>
            <p className={styles.sectionLabel}>DELETION</p>
            <h2>Delete a source, or request account deletion</h2>
            <p>
              Deleting a source also removes its private analysis. Account
              deletion requests stay cancellable during the 24-hour window.
            </p>
            {state.accountDeletion ? (
              <div className={styles.scheduled} role="status">
                <strong>Your deletion request is scheduled.</strong>
                <p>
                  Recorded for{" "}
                  {new Date(
                    state.accountDeletion.scheduledFor,
                  ).toLocaleString()}
                  . Final deletion processing is not active in this MVP.
                </p>
                <button
                  type="button"
                  disabled={deletionBusy}
                  onClick={() => void cancelDeletion()}
                >
                  {deletionBusy ? "Cancelling…" : "Cancel deletion request"}
                </button>
              </div>
            ) : (
              <div className={styles.actions}>
                <Link href="/library">Delete a source</Link>
                <button type="button" onClick={() => setDialogOpen(true)}>
                  Delete my account
                </button>
              </div>
            )}
          </section>
        </div>
      </section>

      {dialogOpen ? (
        <div className={styles.backdrop}>
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-deletion-title"
          >
            <p className={styles.sectionLabel}>CONFIRM DELETION REQUEST</p>
            <h2 id="account-deletion-title">Schedule account deletion</h2>
            <p>
              This records a cancellable request. Type DELETE MY ACCOUNT to
              continue.
            </p>
            <label>
              Type DELETE MY ACCOUNT
              <input
                autoFocus
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
            <div className={styles.dialogActions}>
              <button
                type="button"
                onClick={() => {
                  setDialogOpen(false);
                  setConfirmation("");
                }}
              >
                Keep my account
              </button>
              <button
                type="button"
                disabled={deletionBusy || confirmation !== "DELETE MY ACCOUNT"}
                onClick={() => void scheduleDeletion()}
              >
                {deletionBusy ? "Scheduling…" : "Schedule account deletion"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
