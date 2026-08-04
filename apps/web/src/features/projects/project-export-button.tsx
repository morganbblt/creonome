"use client";

import { ProjectExportSchema } from "@creonome/contracts";
import { useState } from "react";
import { Button } from "@/src/components/ui/button";

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
    <div className="flex flex-col items-end gap-1.5">
      <Button
        type="button"
        variant="outline"
        onClick={download}
        disabled={state === "preparing"}
      >
        {state === "preparing" ? "Preparing…" : "Download Markdown"}
      </Button>
      <p
        className="min-h-4 text-right font-mono text-[11px] text-muted-foreground"
        aria-live="polite"
      >
        {state === "downloaded" ? "Markdown downloaded." : null}
        {state === "error"
          ? "The export could not be prepared. Your project is unchanged."
          : null}
      </p>
    </div>
  );
}
