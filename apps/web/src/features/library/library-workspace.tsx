"use client";

import {
  AssetDeletionSchema,
  LibraryItemSchema,
  UploadSignResponseSchema,
  type Library,
  type LibraryItem,
  type LibraryItemKind,
} from "@creonome/contracts";
import {
  CheckCircle2Icon,
  FileTextIcon,
  FileVideoIcon,
  HardDriveIcon,
  ImageIcon,
  Loader2Icon,
  Music2Icon,
  ScrollTextIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UploadIcon,
  VideoIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type ComponentType } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { Badge, type badgeVariants } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import { cn } from "@/src/lib/utils";

type Filter = "all" | "uploads" | "music" | "scripts" | "exports" | "docs";
type BadgeVariant = NonNullable<Parameters<typeof badgeVariants>[0]>["variant"];

const filterLabels: Record<Filter, string> = {
  all: "All",
  uploads: "Uploads",
  music: "Music",
  scripts: "Scripts",
  exports: "Exports",
  docs: "Docs",
};

const FILTERS = Object.keys(filterLabels) as Filter[];

const kindIcons: Record<
  LibraryItemKind,
  ComponentType<{ className?: string }>
> = {
  video: VideoIcon,
  audio: Music2Icon,
  image: ImageIcon,
  document: FileTextIcon,
  script: ScrollTextIcon,
  export: FileVideoIcon,
};

const statusMeta: Record<
  LibraryItem["status"],
  {
    label: string;
    variant: BadgeVariant;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  ready: { label: "Ready", variant: "success", icon: CheckCircle2Icon },
  uploaded: { label: "Uploaded", variant: "success", icon: CheckCircle2Icon },
  analyzing: { label: "Analyzing", variant: "accent", icon: Loader2Icon },
  failed: { label: "Failed", variant: "destructive", icon: TriangleAlertIcon },
};

function belongs(item: LibraryItem, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "uploads") return item.source === "upload";
  if (filter === "music") return item.kind === "audio";
  if (filter === "scripts") return item.kind === "script";
  if (filter === "exports") return item.kind === "export";
  return item.kind === "document" || item.kind === "image";
}

function formatBytes(value: number | null): string {
  if (value === null) return "text record";
  if (value < 1_000_000) return `${Math.max(1, Math.round(value / 1_000))} KB`;
  return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)} MB`;
}

function formatDuration(value: number | null): string | null {
  if (value === null) return null;
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(value % 60).padStart(2, "0")}`;
}

export function LibraryWorkspace({ library }: { library: Library }) {
  const [items, setItems] = useState(library.items);
  const [totalByteSize, setTotalByteSize] = useState(library.totalByteSize);
  const [filter, setFilter] = useState<Filter>("all");
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<LibraryItem | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const counts = useMemo(() => {
    const result = {} as Record<Filter, number>;
    for (const key of FILTERS) {
      result[key] = items.filter((asset) => belongs(asset, key)).length;
    }
    return result;
  }, [items]);
  const visible = useMemo(
    () => items.filter((item) => belongs(item, filter)),
    [filter, items],
  );

  async function uploadFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      if (file.size > 500_000_000) {
        setError(`${file.name} is larger than the 500 MB upload limit.`);
        continue;
      }
      setError(null);
      try {
        setUploadStage(`Preparing ${file.name}`);
        const signResponse = await fetch("/api/creonome/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            byteSize: file.size,
          }),
        });
        if (!signResponse.ok) throw new Error("sign");
        const signed = UploadSignResponseSchema.parse(
          await signResponse.json(),
        );

        setUploadStage(`Uploading ${file.name}`);
        const uploadResponse = await fetch(signed.uploadUrl, {
          method: "PUT",
          headers: signed.headers,
          body: file,
        });
        if (!uploadResponse.ok) throw new Error("upload");

        setUploadStage(`Registering ${file.name}`);
        const registration = await fetch("/api/creonome/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            byteSize: file.size,
            gcsUri: signed.gcsUri,
          }),
        });
        if (!registration.ok) throw new Error("register");
        const asset = LibraryItemSchema.parse(await registration.json());
        setItems((current) => [
          asset,
          ...current.filter(({ id }) => id !== asset.id),
        ]);
        setTotalByteSize((current) => current + (asset.byteSize ?? 0));
        setFilter("all");
      } catch {
        setError(
          `${file.name} could not be uploaded. No library record was created; try again.`,
        );
      } finally {
        setUploadStage(null);
      }
    }
    if (input.current) input.current.value = "";
  }

  async function deleteSource() {
    if (!deleteCandidate) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/creonome/assets/${deleteCandidate.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setError(
          response.status === 401 || response.status === 403
            ? "Your session expired. Sign in again before deleting this source."
            : "This source could not be deleted. Your private file is still intact.",
        );
        return;
      }
      const receipt = AssetDeletionSchema.safeParse(
        await response.json().catch(() => null),
      );
      if (!receipt.success || receipt.data.id !== deleteCandidate.id) {
        setError(
          "Deletion could not be confirmed. Reload the Library before trying again.",
        );
        return;
      }
      setItems((current) =>
        current.filter(({ id }) => id !== deleteCandidate.id),
      );
      setTotalByteSize((current) =>
        Math.max(0, current - (deleteCandidate.byteSize ?? 0)),
      );
      setDeleteCandidate(null);
    } catch {
      setError(
        "This source could not be deleted. Your private file is still intact.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function handleDragEnter(event: React.DragEvent<HTMLElement>) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    if (event.dataTransfer.files.length)
      void uploadFiles(event.dataTransfer.files);
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-8 pb-16 max-[680px]:px-3.5 max-[680px]:pt-6 max-[680px]:pb-12">
      <header className="mb-5 flex items-end justify-between gap-6 max-[680px]:flex-col max-[680px]:items-start">
        <div>
          <p className="mb-2 font-mono text-[10.5px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
            Private creative storage
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Library
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Uploads, generated work and scripts from this workspace.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 rounded-control border border-border bg-card px-4 py-2.5">
          <HardDriveIcon
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
          <div className="leading-tight">
            <p className="font-mono text-sm font-semibold text-foreground">
              {formatBytes(totalByteSize)}
            </p>
            <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
              stored privately
            </p>
          </div>
        </div>
      </header>

      <section
        className={cn(
          "relative overflow-hidden rounded-card border border-border bg-card shadow-sm transition-colors",
          isDragging && "border-accent",
        )}
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3.5 max-[680px]:flex-col max-[680px]:items-stretch">
          <div
            className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto"
            role="group"
            aria-label="Library filters"
          >
            {FILTERS.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={filter === item ? "default" : "outline"}
                aria-pressed={filter === item}
                className="shrink-0 rounded-full"
                onClick={() => setFilter(item)}
              >
                {filterLabels[item]}{" "}
                <span className="opacity-70">{counts[item]}</span>
              </Button>
            ))}
          </div>
          <Button
            type="button"
            className="shrink-0 max-[680px]:w-full"
            onClick={() => input.current?.click()}
          >
            <UploadIcon /> Upload
          </Button>
          <input
            ref={input}
            className="sr-only"
            type="file"
            aria-label="Upload files"
            multiple
            accept="video/*,audio/*,image/*,.pdf,.txt,.md,application/json"
            onChange={(event) => {
              if (event.target.files) void uploadFiles(event.target.files);
            }}
          />
        </div>

        {error ? (
          <Alert variant="destructive" className="mx-3.5 mt-3.5 w-auto">
            <TriangleAlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {uploadStage ? (
          <Alert
            variant="accent"
            role="status"
            className="mx-3.5 mt-3.5 w-auto"
          >
            <Loader2Icon className="animate-spin" />
            <AlertTitle>{uploadStage}</AlertTitle>
            <AlertDescription>
              Encrypted private upload in progress
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="p-3.5">
          {visible.length > 0 ? (
            <div className="grid grid-cols-4 gap-3.5 max-[900px]:grid-cols-3 max-[680px]:grid-cols-2 max-[420px]:grid-cols-1">
              {visible.map((item) => {
                const KindIcon = kindIcons[item.kind];
                const status = statusMeta[item.status];
                const StatusIcon = status.icon;
                return (
                  <article
                    key={item.id}
                    className="flex flex-col overflow-hidden rounded-card border border-border bg-card"
                  >
                    <div className="flex aspect-4/3 flex-col items-center justify-center gap-2 border-b border-border bg-secondary/60 text-muted-foreground">
                      <KindIcon className="size-7" />
                      <span className="font-mono text-[10px] font-medium tracking-wide uppercase">
                        {item.kind}
                      </span>
                      {item.durationSeconds ? (
                        <span className="font-mono text-[10px] opacity-70">
                          {formatDuration(item.durationSeconds)}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2
                            className="truncate text-sm font-semibold text-foreground"
                            title={item.name}
                          >
                            {item.name}
                          </h2>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatBytes(item.byteSize)} · {item.source}
                          </p>
                        </div>
                        <Badge
                          variant={status.variant}
                          className="shrink-0 gap-1"
                        >
                          <StatusIcon
                            className={cn(
                              item.status === "analyzing" && "animate-spin",
                            )}
                          />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                        {item.projectId ? (
                          <Link
                            href={`/projects/${item.projectId}`}
                            className="text-xs font-medium text-accent hover:underline"
                          >
                            Open project ↗
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Private workspace asset
                          </span>
                        )}
                        {item.source === "upload" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Delete ${item.name}`}
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  setError(null);
                                  setDeleteCandidate(item);
                                }}
                              >
                                <Trash2Icon />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-control border border-dashed border-border px-6 py-14 text-center">
              <span className="grid size-11 place-items-center rounded-full bg-secondary text-muted-foreground">
                <UploadIcon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Your library is empty
                </p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Drop files anywhere here, or upload footage, music, scripts
                  and exports to keep them private to this workspace.
                </p>
              </div>
              <Button type="button" onClick={() => input.current?.click()}>
                <UploadIcon /> Upload files
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-control border border-dashed border-border px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No items in {filterLabels[filter]} yet.
              </p>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={() => setFilter("all")}
              >
                Show all files
              </Button>
            </div>
          )}
        </div>

        {isDragging ? (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center border-2 border-dashed border-accent bg-accent-soft/85 backdrop-blur-[2px]">
            <p className="flex items-center gap-2 text-sm font-semibold text-accent-soft-foreground">
              <UploadIcon className="size-4" /> Drop files to upload
            </p>
          </div>
        ) : null}
      </section>

      <Dialog
        open={deleteCandidate !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteCandidate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete private source?</DialogTitle>
            <DialogDescription>
              <strong className="font-semibold text-foreground">
                {deleteCandidate?.name}
              </strong>{" "}
              will be removed with its stored file and its private analysis.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteCandidate(null)}
            >
              Keep source
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void deleteSource()}
            >
              {deleting ? "Deleting…" : "Delete source permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
