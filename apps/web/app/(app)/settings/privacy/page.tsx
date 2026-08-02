import type { Metadata } from "next";
import styles from "../../management.module.css";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className={styles.compactPage}>
      <section className={styles.panel}>
        <div className={styles.toolbar}><h1>Your data</h1></div>
        <div className={styles.privacyList}>
          <div className={styles.privacyRow}><button type="button" className={styles.toggle} aria-label="Help improve the models: off" /><div><strong>Help improve the models</strong><span className={styles.meta}>Off. Your media and DNA are never used for model training.</span></div></div>
          <div className={styles.privacyRow}><button type="button" className={styles.toggleOn} aria-label="Keep rushes after export: on" /><div><strong>Keep rushes after export</strong><span className={styles.meta}>If off, source files are deleted 30 days after a finished export.</span></div></div>
          <p className={styles.sectionTitle}>EXPORT</p>
          <div className={styles.actions}><button className={styles.button} type="button">Creator DNA · JSON</button><button className={styles.button} type="button">Projects &amp; scripts · ZIP</button><button className={styles.button} type="button">Everything · 4.2 GB</button></div>
          <span className={styles.hint}>Full exports are emailed as a link within an hour.</span>
          <div className={styles.dangerZone}><h2>Delete a source, or everything</h2><p>Deleting a source removes every trait derived from it. Account media is removed within 24 h and backups within 30 days.</p><div className={styles.actions}><button className={styles.buttonDanger} type="button">Delete a source</button><button className={styles.buttonDanger} type="button">Delete my account</button></div></div>
        </div>
      </section>
    </main>
  );
}
