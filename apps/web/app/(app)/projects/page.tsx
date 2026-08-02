import type { Metadata } from "next";
import { ProjectIndex } from "../../../src/features/projects/project-index";
import { loadProjects } from "../../../src/features/projects/projects-data";
import { UnavailableState } from "../../../src/features/management/unavailable-state";
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
        <UnavailableState
          title="Projects could not be loaded."
          description="Your workspace data is intact. Reconnect and try again."
          actionHref="/projects"
        />
      ) : projects.length ? (
        <ProjectIndex projects={projects} />
      ) : (
        <UnavailableState
          icon="01"
          title="Your first project starts with an opportunity."
          description="Save an idea or generate its script to build this workspace."
          actionHref="/today"
          actionLabel="Explore Today"
        />
      )}
    </main>
  );
}
