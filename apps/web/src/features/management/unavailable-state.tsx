import Link from "next/link";
import type { ReactNode } from "react";
import { RefreshIcon } from "@/src/features/icons/icons";
import styles from "./unavailable-state.module.css";

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
    <section className={styles.unavailableState} role="status">
      <span aria-hidden="true">
        {icon ?? <RefreshIcon width={18} height={18} />}
      </span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <Link href={actionHref}>{actionLabel}</Link>
    </section>
  );
}
