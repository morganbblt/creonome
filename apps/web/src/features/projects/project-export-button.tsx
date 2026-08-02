"use client";

import { ProjectExportSchema } from "@creonome/contracts";
import { useState } from "react";
import styles from "./projects.module.css";

type ExportState = "idle" | "preparing" | "downloaded" | "error";

export function ProjectExportButton({ projectId }: { projectId: string }) {
  const [state, setState] = useState<ExportState>("idle");

  async function download() {
    setState("preparing");
    try {
      const response = await fetch(
        `/api/creonome/projects/${encodeURIComponent(projectId)}/exports`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: "markdown" }),
        },
      );
      if (!response.ok) throw new Error("Project export failed");
      const projectExport = ProjectExportSchema.parse(await response.json());
      const url = URL.createObjectURL(
        new Blob([projectExport.content], { type: projectExport.mimeType }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = projectExport.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setState("downloaded");
    } catch {
      setState("error");
    }
  }

  return (
    <div className={styles.exportAction}>
      <button type="button" onClick={download} disabled={state === "preparing"}>
        {state === "preparing" ? "Preparing…" : "Download Markdown"}
      </button>
      <p aria-live="polite">
        {state === "downloaded" ? "Markdown downloaded." : null}
        {state === "error"
          ? "The export could not be prepared. Your project is unchanged."
          : null}
      </p>
    </div>
  );
}
