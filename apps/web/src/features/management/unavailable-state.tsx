import Link from "next/link";
import type { ReactNode } from "react";
import { RefreshCwIcon } from "lucide-react";

export function UnavailableState({
  icon,
  title,
  description,
  actionHref,
  actionLabel = "Try again",
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actionHref: string;
  actionLabel?: string;
}) {
  return (
    <section
      className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-4.5 rounded-card border border-dashed border-border bg-card p-6 max-[560px]:grid-cols-1 max-[560px]:text-left"
      role="status"
    >
      <span
        aria-hidden="true"
        className="grid size-[42px] place-items-center rounded-full bg-secondary text-muted-foreground"
      >
        {icon ?? <RefreshCwIcon className="size-[18px]" />}
      </span>
      <div>
        <h2 className="m-0 mb-1 text-[15px] font-semibold text-foreground">
          {title}
        </h2>
        <p className="m-0 text-xs text-muted-foreground">{description}</p>
      </div>
      <Link
        href={actionHref}
        className="inline-grid h-10 place-items-center justify-self-end rounded-control border border-input px-4 text-xs font-semibold text-foreground whitespace-nowrap transition-colors hover:bg-secondary max-[560px]:justify-self-start"
      >
        {actionLabel}
      </Link>
    </section>
  );
}
