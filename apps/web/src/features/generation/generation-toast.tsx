import styles from "./generation-toast.module.css";

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
  return (
    <section
      className={styles.toast}
      data-state={state}
      role={state === "error" ? "alert" : "status"}
      aria-live={state === "error" ? "assertive" : "polite"}
    >
      <div className={styles.heading}>
        <span className={styles.stateMark} aria-hidden="true">
          {state === "pending" ? "↗" : state === "success" ? "✓" : "!"}
        </span>
        <div>
          <strong>{title}</strong>
          <span>
            {state === "pending"
              ? "Generation in progress"
              : state === "success"
                ? "Saved to project"
                : "Generation stopped"}
          </span>
        </div>
        {creditLabel ? <em>{creditLabel}</em> : null}
        {onDismiss && state !== "pending" ? (
          <button type="button" aria-label="Dismiss" onClick={onDismiss}>
            ×
          </button>
        ) : null}
      </div>
      {state === "pending" ? (
        <progress aria-label={`${title} progress`} />
      ) : (
        <progress aria-label={`${title} progress`} max="100" value="100" />
      )}
      <p>{detail}</p>
      {state === "pending" ? (
        <small>You can keep working — this notification will update.</small>
      ) : null}
    </section>
  );
}
