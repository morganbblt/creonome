import styles from "./shell.module.css";

export default function AppLoading() {
  return (
    <div
      className={styles.routeProgress}
      role="progressbar"
      aria-label="Loading page"
    >
      <span />
    </div>
  );
}
