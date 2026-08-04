import {
  ArrowUpRightIcon,
  CheckIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

const stateCopy = {
  pending: "Generation in progress",
  success: "Saved to project",
  error: "Generation stopped",
} as const;

const stateIcon = {
  pending: ArrowUpRightIcon,
  success: CheckIcon,
  error: TriangleAlertIcon,
} as const;

const stateMarkClasses = {
  pending: "bg-accent-soft text-accent-soft-foreground",
  success: "bg-success/12 text-success",
  error: "bg-destructive/12 text-destructive",
} as const;

export function GenerationToast({
  state,
  title,
  detail,
  creditLabel,
  onDismiss,
}: {
  state: "pending" | "success" | "error";
  title: string;
  detail: string;
  creditLabel?: string;
  onDismiss?: () => void;
}) {
  const Icon = stateIcon[state];

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
        {onDismiss && state !== "pending" ? (
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
      {state === "pending" ? (
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
      {state === "pending" ? (
        <small className="text-[11px] text-muted-foreground/80">
          You can keep working — this notification will update.
        </small>
      ) : null}
    </section>
  );
}
