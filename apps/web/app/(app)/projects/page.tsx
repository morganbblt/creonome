import type { Metadata } from "next";
import { ProjectIndex } from "../../../src/features/projects/project-index";
import { loadProjects } from "../../../src/features/projects/projects-data";
import { UnavailableState } from "../../../src/features/management/unavailable-state";
import { createServerApiClient } from "../../../src/lib/api/server-client";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const { projects, source } = await loadProjects(createServerApiClient());
  const activeCount = projects.filter(
    (project) => project.status === "active",
  ).length;

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-8 pb-16 max-[680px]:px-3.5 max-[680px]:pt-6 max-[680px]:pb-12">
      <header className="mb-5 flex items-end justify-between gap-6 max-[680px]:flex-col max-[680px]:items-start">
        <div>
          <p className="mb-2 font-mono text-[10.5px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
            Creative pipeline
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Projects
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Saved ideas and their latest creative deliverables.
          </p>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground uppercase">
          newest first · {activeCount} active
        </span>
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
