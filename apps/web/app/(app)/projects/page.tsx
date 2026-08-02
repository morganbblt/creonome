import type { Metadata } from "next";
import { demoProjects } from "../../../src/features/management/demo-management";
import styles from "../management.module.css";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.titleRow}>
        <div><p className={styles.eyebrow}>CREATIVE PIPELINE</p><h1>Projects</h1><p>Saved opportunities, scripts and exports — grouped by project.</p></div>
        <span className={styles.meta}>newest first · 12 active</span>
      </header>
      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <div className={styles.filters} aria-label="Project levels">
            <span className={styles.filterActive}>All 12</span><span className={styles.filter}>Idea 5</span><span className={styles.filter}>Script 4</span><span className={styles.filter}>Storyboard 2</span><span className={styles.filter}>Ready 1</span>
          </div>
        </div>
        <div className={styles.projectList}>
          {demoProjects.map((project, index) => (
            <article className={styles.projectRow} key={project.title}>
              <span className={styles.thumbnail}>{String(index + 1).padStart(2, "0")}</span>
              <div className={styles.projectCopy}><strong>{project.title}</strong><span className={styles.meta}>{project.detail}</span></div>
              <span className={styles.level}>{project.level}</span><span className={styles.score}>{project.score ?? "—"}</span>
              <button className={styles.button} type="button">{project.tone === "cooled" ? "Archive" : "Open"}</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
