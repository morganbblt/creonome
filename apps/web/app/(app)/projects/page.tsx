import type { Metadata } from "next";
import Link from "next/link";
import { ProjectIndex } from "../../../src/features/projects/project-index";
import { loadProjects } from "../../../src/features/projects/projects-data";
import { createServerApiClient } from "../../../src/lib/api/server-client";
import styles from "../management.module.css";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const { projects, source } = await loadProjects(createServerApiClient());
  const activeCount = projects.filter(
    (project) => project.status === "active",
  ).length;

  return (
    <main className={styles.page}>
      <header className={styles.titleRow}>
        <div>
          <p className={styles.eyebrow}>CREATIVE PIPELINE</p>
          <h1>Projects</h1>
          <p>Saved ideas and their latest creative deliverables.</p>
        </div>
        <span className={styles.meta}>newest first · {activeCount} active</span>
      </header>

      {source === "unavailable" ? (
        <section className={styles.unavailableState} role="status">
          <span aria-hidden="true">↻</span>
          <div>
            <h2>Projects could not be loaded.</h2>
            <p>Your workspace data is intact. Reconnect and try again.</p>
          </div>
          <Link href="/projects">Try again</Link>
        </section>
      ) : projects.length ? (
        <ProjectIndex projects={projects} />
      ) : (
        <section className={styles.unavailableState}>
          <span aria-hidden="true">01</span>
          <div>
            <h2>Your first project starts with an opportunity.</h2>
            <p>Save an idea or generate its script to build this workspace.</p>
          </div>
          <Link href="/today">Explore Today</Link>
        </section>
      )}
    </main>
  );
}
