import {
  ArrowUpRightIcon,
  CheckIcon,
  ClockIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

/**
 * "pending" is a deprecated alias of "running", kept for existing callers
 * that haven't been wired up to the queued-job lifecycle yet. New callers
 * that poll GET /api/v1/jobs/:id should distinguish "queued" (accepted,
 * waiting on the Cloud Tasks queue) from "running" (the internal handler
 * is actively generating).
 */
const stateCopy = {
  queued: "Queued",
  pending: "Generation in progress",
  running: "Generation in progress",
  success: "Saved to project",
  error: "Generation stopped",
} as const;

const stateIcon = {
  queued: ClockIcon,
  pending: ArrowUpRightIcon,
  running: ArrowUpRightIcon,
  success: CheckIcon,
  error: TriangleAlertIcon,
} as const;

const stateMarkClasses = {
  queued: "bg-secondary text-muted-foreground",
  pending: "bg-accent-soft text-accent-soft-foreground",
  running: "bg-accent-soft text-accent-soft-foreground",
  success: "bg-success/12 text-success",
  error: "bg-destructive/12 text-destructive",
} as const;

type GenerationToastState =
  "queued" | "pending" | "running" | "success" | "error";

const busyStates = new Set<GenerationToastState>([
  "queued",
  "pending",
  "running",
]);

export function GenerationToast({
  state,
  title,
  detail,
  creditLabel,
  onDismiss,
}: {
  state: GenerationToastState;
  title: string;
  detail: string;
  creditLabel?: string;
  onDismiss?: () => void;
}) {
  const Icon = stateIcon[state];
  const isBusy = busyStates.has(state);

  return (
    <section
      className="pointer-events-none flex w-full max-w-sm flex-col gap-2.5 rounded-card border border-border bg-card p-4 shadow-lg"
      data-state={state}
      role={state === "error" ? "alert" : "status"}
      aria-live={state === "error" ? "assertive" : "polite"}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full",
            stateMarkClasses[state],
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <strong className="truncate text-sm font-semibold text-foreground">
            {title}
          </strong>
          <span className="text-xs text-muted-foreground">
            {stateCopy[state]}
          </span>
        </div>
        {creditLabel ? (
          <em className="shrink-0 text-xs font-medium text-muted-foreground not-italic">
            {creditLabel}
          </em>
        ) : null}
        {onDismiss && !isBusy ? (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="pointer-events-auto shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
      {isBusy ? (
        <progress
          aria-label={`${title} progress`}
          className="h-1.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-accent"
        />
      ) : (
        <progress
          aria-label={`${title} progress`}
          max="100"
          value="100"
          className="h-1.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-success"
        />
      )}
      <p className="text-xs text-muted-foreground">{detail}</p>
      {isBusy ? (
        <small className="text-[11px] text-muted-foreground/80">
          You can keep working — this notification will update.
        </small>
      ) : null}
    </section>
  );
}
