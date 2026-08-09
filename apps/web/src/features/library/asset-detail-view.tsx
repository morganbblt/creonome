import type { AssetDetail, LibraryItemKind } from "@creonome/contracts";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  FileTextIcon,
  FileVideoIcon,
  ImageIcon,
  Loader2Icon,
  Music2Icon,
  ScrollTextIcon,
  TriangleAlertIcon,
  VideoIcon,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { Badge, type badgeVariants } from "@/src/components/ui/badge";
import { Card } from "@/src/components/ui/card";

type BadgeVariant = NonNullable<Parameters<typeof badgeVariants>[0]>["variant"];

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
  AssetDetail["status"],
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

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AssetDetailView({ asset }: { asset: AssetDetail }) {
  const KindIcon = kindIcons[asset.kind];
  const status = statusMeta[asset.status];
  const StatusIcon = status.icon;
  const duration = formatDuration(asset.durationSeconds);

  return (
    <main className="mx-auto w-full max-w-[880px] px-5 pt-8 pb-16 max-[680px]:px-3.5 max-[680px]:pt-6 max-[680px]:pb-12">
      <Link
        href="/library"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
        Back to Library
      </Link>

      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 font-mono text-[10.5px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
            {asset.kind} · {asset.source}
          </p>
          <h1
            className="truncate text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            title={asset.name}
          >
            {asset.name}
          </h1>
        </div>
        <Badge variant={status.variant} className="shrink-0 gap-1">
          <StatusIcon
            className={
              asset.status === "analyzing" ? "animate-spin" : undefined
            }
          />
          {status.label}
        </Badge>
      </header>

      <div className="grid grid-cols-[minmax(0,260px)_1fr] gap-4 max-[620px]:grid-cols-1">
        <Card className="flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden bg-secondary/60 p-0 text-muted-foreground">
          {asset.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- private,
            // per-workspace content streamed from our own proxy route, not
            // an optimizable public URL.
            <img
              src={`/api/creonome/assets/${asset.id}/content`}
              alt={asset.name}
              className="size-full object-cover"
            />
          ) : (
            <>
              <KindIcon className="size-9" aria-hidden="true" />
              <span className="font-mono text-[10px] font-medium tracking-wide uppercase">
                {asset.kind}
              </span>
            </>
          )}
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <h2 className="m-0 text-sm font-semibold text-foreground">
            Metadata
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Size</dt>
            <dd className="text-foreground">{formatBytes(asset.byteSize)}</dd>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="truncate text-foreground">
              {asset.mimeType ?? "—"}
            </dd>
            {duration ? (
              <>
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="text-foreground">{duration}</dd>
              </>
            ) : null}
            <dt className="text-muted-foreground">Uploaded</dt>
            <dd className="text-foreground">{formatDate(asset.createdAt)}</dd>
            {asset.projectId ? (
              <>
                <dt className="text-muted-foreground">Project</dt>
                <dd>
                  <Link
                    href={`/projects/${asset.projectId}`}
                    className="text-accent hover:underline"
                  >
                    Open project ↗
                  </Link>
                </dd>
              </>
            ) : null}
          </dl>
        </Card>
      </div>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Analysis evidence
        </h2>
        {asset.analysis ? (
          <Card className="flex flex-col gap-3 p-4">
            <p className="m-0 text-sm text-foreground">
              {asset.analysis.summary}
            </p>
            <p className="m-0 text-sm text-muted-foreground">
              {asset.analysis.creativeSignature}
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs max-[500px]:grid-cols-1">
              {asset.analysis.disciplines.length > 0 ? (
                <div>
                  <p className="m-0 mb-1 font-mono tracking-wide text-muted-foreground uppercase">
                    Disciplines
                  </p>
                  <p className="m-0 text-foreground">
                    {asset.analysis.disciplines.join(", ")}
                  </p>
                </div>
              ) : null}
              {asset.analysis.genres.length > 0 ? (
                <div>
                  <p className="m-0 mb-1 font-mono tracking-wide text-muted-foreground uppercase">
                    Genres
                  </p>
                  <p className="m-0 text-foreground">
                    {asset.analysis.genres.join(", ")}
                  </p>
                </div>
              ) : null}
              {asset.analysis.themes.length > 0 ? (
                <div>
                  <p className="m-0 mb-1 font-mono tracking-wide text-muted-foreground uppercase">
                    Themes
                  </p>
                  <p className="m-0 text-foreground">
                    {asset.analysis.themes.join(", ")}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="m-0 mb-1 font-mono tracking-wide text-muted-foreground uppercase">
                  Target audience
                </p>
                <p className="m-0 text-foreground">
                  {asset.analysis.targetAudience}
                </p>
              </div>
            </div>
            {asset.analysis.evidence.length > 0 ? (
              <div>
                <p className="m-0 mb-1 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                  Evidence
                </p>
                <ul className="m-0 list-disc pl-5 text-sm text-foreground">
                  {asset.analysis.evidence.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        ) : (
          <Card className="p-4 text-sm text-muted-foreground">
            {asset.status === "analyzing"
              ? "Analysis is still running for this asset."
              : "No analysis has run for this asset yet."}
          </Card>
        )}
      </section>
    </main>
  );
}
