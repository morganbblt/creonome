"use client";

import type { ProjectLevel, ProjectSummary } from "@creonome/contracts";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLinkIcon, SearchIcon } from "@/src/features/icons/icons";
import styles from "./projects.module.css";

const levels = ["idea", "script", "storyboard", "video"] as const;

const labelByLevel: Record<ProjectLevel, string> = {
  idea: "Idea",
  script: "Script",
  storyboard: "Storyboard",
  video: "Video",
};

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ProjectIndex({ projects }: { projects: ProjectSummary[] }) {
  const [level, setLevel] = useState<ProjectLevel | "all">("all");
  const [query, setQuery] = useState("");
  const counts = useMemo(
    () =>
      Object.fromEntries(
        levels.map((item) => [
          item,
          projects.filter((project) => project.currentLevel === item).length,
        ]),
      ) as Record<ProjectLevel, number>,
    [projects],
  );
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return projects.filter(
      (project) =>
        (level === "all" || project.currentLevel === level) &&
        (!normalized ||
          project.title.toLocaleLowerCase().includes(normalized) ||
          project.platform?.replace("_", " ").includes(normalized)),
    );
  }, [level, projects, query]);

  return (
    <section className={styles.index} aria-label="Project index">
      <div className={styles.toolbar}>
        <div className={styles.filters} aria-label="Project levels">
          <button
            type="button"
            className={level === "all" ? styles.activeFilter : styles.filter}
            aria-pressed={level === "all"}
            onClick={() => setLevel("all")}
          >
            All {projects.length}
          </button>
          {levels.map((item) => (
            <button
              type="button"
              className={level === item ? styles.activeFilter : styles.filter}
              aria-pressed={level === item}
              onClick={() => setLevel(item)}
              key={item}
            >
              {labelByLevel[item]} {counts[item]}
            </button>
          ))}
        </div>
        <label className={styles.search}>
          <SearchIcon width={14} height={14} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search projects"
            placeholder="Search projects"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {visible.length ? (
        <div className={styles.list}>
          {visible.map((project, index) => (
            <article className={styles.row} key={project.id}>
              <div className={styles.cover} data-level={project.currentLevel}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>
                  {project.currentLevel.slice(0, 2).toUpperCase()}
                </strong>
              </div>
              <div className={styles.copy}>
                <p>
                  {project.platform?.replace("_", " ") ?? "unassigned"} · v
                  {project.currentVersion}
                </p>
                <h2>{project.title}</h2>
                <span>Updated {formatUpdatedAt(project.updatedAt)}</span>
              </div>
              <div className={styles.maturity} aria-label="Project maturity">
                {levels.map((item) => (
                  <span
                    key={item}
                    className={
                      levels.indexOf(item) <=
                      levels.indexOf(project.currentLevel)
                        ? styles.reached
                        : undefined
                    }
                    title={labelByLevel[item]}
                  />
                ))}
              </div>
              <span className={styles.level}>
                {labelByLevel[project.currentLevel]}
              </span>
              <span className={styles.score} aria-label="Opportunity score">
                {project.score ?? "—"}
              </span>
              <Link
                href={`/projects/${project.id}`}
                className={styles.open}
                aria-label={`Open ${project.title}`}
              >
                Open <ExternalLinkIcon width={12} height={12} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty} role="status">
          <span>00</span>
          <h2>No projects match this view.</h2>
          <button
            type="button"
            onClick={() => {
              setLevel("all");
              setQuery("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
