"use client";

import type {
  CreatorDnaVersionCompare,
  CreatorDnaVersionSummary,
  CreatorDnaVersionsResponse,
} from "@creonome/contracts";
import {
  CreatorDnaSchema,
  CreatorDnaVersionCompareSchema,
  CreatorDnaVersionsResponseSchema,
} from "@creonome/contracts";
import {
  ArrowLeftIcon,
  GitCompareIcon,
  HistoryIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";

function sourceLabel(source: string): string {
  switch (source) {
    case "onboarding":
      return "Onboarding";
    case "creator_edit":
      return "Manual correction";
    case "restore":
      return "Restored";
    default:
      return source.replaceAll("_", " ");
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function changeSummary(version: CreatorDnaVersionSummary): string {
  if (version.source === "restore" && version.restoredFromVersion) {
    return `Restored from version ${version.restoredFromVersion}`;
  }
  if (version.source === "creator_edit") {
    return "Manual trait correction";
  }
  if (version.source === "onboarding") {
    return "Generated during onboarding";
  }
  return sourceLabel(version.source);
}

export function CreatorDnaVersionsView({
  versions: initialVersions,
}: {
  versions: CreatorDnaVersionsResponse;
}) {
  const [versions, setVersions] = useState(initialVersions.versions);
  const [selected, setSelected] = useState<number[]>([]);
  const [compareResult, setCompareResult] =
    useState<CreatorDnaVersionCompare | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareBusy, setCompareBusy] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] =
    useState<CreatorDnaVersionSummary | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);

  function toggleSelected(version: number) {
    setCompareError(null);
    setSelected((current) => {
      if (current.includes(version)) {
        return current.filter((value) => value !== version);
      }
      if (current.length >= 2) {
        return [current[1]!, version];
      }
      return [...current, version];
    });
  }

  async function refreshVersions() {
    const response = await fetch("/api/creonome/creator-dna/versions", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const parsed = CreatorDnaVersionsResponseSchema.parse(
      await response.json(),
    );
    setVersions(parsed.versions);
  }

  async function runCompare() {
    if (selected.length !== 2) return;
    const [a, b] = [...selected].sort((left, right) => left - right) as [
      number,
      number,
    ];
    setCompareBusy(true);
    setCompareError(null);
    try {
      const response = await fetch(
        `/api/creonome/creator-dna/versions/${a}/compare/${b}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("compare");
      setCompareResult(
        CreatorDnaVersionCompareSchema.parse(await response.json()),
      );
      setCompareOpen(true);
    } catch {
      setCompareError("The comparison could not be loaded. Try again.");
    } finally {
      setCompareBusy(false);
    }
  }

  async function confirmRestore() {
    if (!restoreTarget) return;
    setRestoreBusy(true);
    setRestoreError(null);
    try {
      const response = await fetch(
        `/api/creonome/creator-dna/versions/${restoreTarget.version}/restore`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("restore");
      const restored = CreatorDnaSchema.parse(await response.json());
      await refreshVersions();
      setRestoredNotice(
        `Version ${restored.version} was created from version ${restoreTarget.version}. Earlier versions are untouched.`,
      );
      setRestoreTarget(null);
    } catch {
      setRestoreError(
        "The restore could not be completed. Your Creator DNA is unchanged.",
      );
    } finally {
      setRestoreBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[900px] px-5.5 pt-8 pb-16 max-[620px]:px-3.5 max-[620px]:pt-6 max-[620px]:pb-12">
      <Link
        className="mb-6 inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        href="/creator-dna"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
        Back to Creator DNA
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground max-[620px]:text-2xl">
            <HistoryIcon aria-hidden="true" className="size-7" />
            Version history
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
            Every Creator DNA version is kept. Restoring never deletes or
            edits an earlier version — it creates a new one from its traits.
          </p>
        </div>
        <Button
          disabled={selected.length !== 2 || compareBusy}
          onClick={() => void runCompare()}
          type="button"
        >
          <GitCompareIcon />
          {compareBusy
            ? "Comparing…"
            : selected.length === 2
              ? `Compare v${Math.min(...selected)} and v${Math.max(...selected)}`
              : "Select two versions to compare"}
        </Button>
      </div>

      {restoredNotice ? (
        <Alert className="mt-5" variant="accent">
          <AlertDescription>{restoredNotice}</AlertDescription>
        </Alert>
      ) : null}
      {compareError ? (
        <Alert className="mt-5" variant="destructive">
          <TriangleAlertIcon />
          <AlertDescription>{compareError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        {versions.map((version) => (
          <Card key={version.id}>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <Checkbox
                  aria-label={`Select version ${version.version} for comparison`}
                  checked={selected.includes(version.version)}
                  onCheckedChange={() => toggleSelected(version.version)}
                  className="mt-1"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      Version {version.version}
                    </span>
                    <Badge variant={version.confirmed ? "success" : "outline"}>
                      {version.confirmed ? "Confirmed" : "Review required"}
                    </Badge>
                    <Badge className="font-normal" variant="outline">
                      {sourceLabel(version.source)}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {changeSummary(version)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(version.createdAt)}
                  </p>
                </div>
              </div>
              <Button
                className="shrink-0"
                onClick={() => {
                  setRestoreError(null);
                  setRestoreTarget(version);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <RotateCcwIcon />
                Restore
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null);
        }}
        open={restoreTarget !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore version {restoreTarget?.version}?</DialogTitle>
            <DialogDescription>
              This creates a new Creator DNA version with the trait values
              from version {restoreTarget?.version}. Version{" "}
              {restoreTarget?.version} itself is kept exactly as is.
            </DialogDescription>
          </DialogHeader>
          {restoreError ? (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{restoreError}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              disabled={restoreBusy}
              onClick={() => setRestoreTarget(null)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={restoreBusy}
              onClick={() => void confirmRestore()}
              type="button"
            >
              {restoreBusy ? "Restoring…" : "Restore this version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setCompareOpen} open={compareOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {compareResult
                ? `Version ${compareResult.a.version} vs version ${compareResult.b.version}`
                : "Compare versions"}
            </DialogTitle>
            <DialogDescription>
              Traits that are unchanged between the two versions are omitted.
            </DialogDescription>
          </DialogHeader>
          {compareResult && compareResult.traits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No trait differences between these two versions.
            </p>
          ) : null}
          {compareResult && compareResult.traits.length > 0 ? (
            <ul className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
              {compareResult.traits.map((trait) => (
                <li
                  className="rounded-control border border-border p-3"
                  key={`${trait.category}:${trait.label}`}
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        trait.status === "added"
                          ? "success"
                          : trait.status === "removed"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {trait.status}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">
                      {trait.label}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Version {compareResult.a.version}
                      </p>
                      <p className="text-sm text-foreground">
                        {trait.fromValue ?? (
                          <span className="italic text-muted-foreground">
                            not present
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Version {compareResult.b.version}
                      </p>
                      <p className="text-sm text-foreground">
                        {trait.toValue ?? (
                          <span className="italic text-muted-foreground">
                            not present
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setCompareOpen(false)} type="button">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
