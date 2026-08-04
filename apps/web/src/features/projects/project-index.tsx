"use client";

import type { ProjectLevel, ProjectSummary } from "@creonome/contracts";
import { ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { cn } from "@/src/lib/utils";

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
    <section
      className="overflow-hidden rounded-card border border-border bg-card shadow-sm"
      aria-label="Project index"
    >
      <div className="flex min-h-[74px] flex-wrap items-center justify-between gap-4.5 border-b border-border p-4.5">
        <div className="flex flex-wrap gap-1.5" aria-label="Project levels">
          <Button
            type="button"
            variant={level === "all" ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            aria-pressed={level === "all"}
            onClick={() => setLevel("all")}
          >
            All {projects.length}
          </Button>
          {levels.map((item) => (
            <Button
              type="button"
              variant={level === item ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              aria-pressed={level === item}
              onClick={() => setLevel(item)}
              key={item}
            >
              {labelByLevel[item]} {counts[item]}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-60">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Search projects"
            placeholder="Search projects"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9.5 pl-9 text-xs"
          />
        </div>
      </div>

      {visible.length ? (
        <div className="flex flex-col gap-2 p-4.5">
          {visible.map((project, index) => (
            <article
              className="grid min-h-[82px] grid-cols-[48px_minmax(180px,1fr)_78px_92px_42px_76px] items-center gap-4 rounded-[9px] border border-border px-3 py-2.5 transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-input max-[820px]:grid-cols-[48px_minmax(0,1fr)_42px_70px] max-[520px]:grid-cols-[42px_minmax(0,1fr)_64px]"
              key={project.id}
            >
              <div
                className={cn(
                  "relative flex h-15 w-12 flex-col justify-between rounded-[6px] p-2 font-mono text-[8px]/none font-medium max-[520px]:h-13.5 max-[520px]:w-10.5",
                  project.currentLevel === "idea"
                    ? "bg-secondary text-muted-foreground"
                    : "bg-accent-soft text-accent-soft-foreground",
                )}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong className="self-end font-mono text-[10px]/none font-semibold">
                  {project.currentLevel.slice(0, 2).toUpperCase()}
                </strong>
              </div>
              <div className="min-w-0">
                <p className="m-0 font-mono text-[9px]/none tracking-wide text-muted-foreground uppercase">
                  {project.platform?.replace("_", " ") ?? "unassigned"} · v
                  {project.currentVersion}
                </p>
                <h2 className="my-1 overflow-hidden text-[13.5px] leading-tight text-ellipsis whitespace-nowrap text-foreground">
                  {project.title}
                </h2>
                <span className="font-mono text-[9px]/none text-muted-foreground uppercase">
                  Updated {formatUpdatedAt(project.updatedAt)}
                </span>
              </div>
              <div
                className="flex gap-1 max-[820px]:hidden"
                aria-label="Project maturity"
              >
                {levels.map((item) => (
                  <span
                    key={item}
                    className={cn(
                      "h-0.75 w-3.5 rounded-full",
                      levels.indexOf(item) <=
                        levels.indexOf(project.currentLevel)
                        ? "bg-foreground"
                        : "bg-input",
                    )}
                    title={labelByLevel[item]}
                  />
                ))}
              </div>
              <Badge
                variant="accent"
                className="justify-self-start max-[820px]:hidden"
              >
                {labelByLevel[project.currentLevel]}
              </Badge>
              <span
                className="justify-self-end font-mono text-xs font-medium text-muted-foreground max-[520px]:hidden"
                aria-label="Opportunity score"
              >
                {project.score ?? "—"}
              </span>
              <Button asChild variant="outline" size="sm" className="justify-self-end">
                <Link
                  href={`/projects/${project.id}`}
                  aria-label={`Open ${project.title}`}
                >
                  Open <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <div
          className="grid min-h-70 place-items-center content-center gap-2 p-6 text-center text-muted-foreground"
          role="status"
        >
          <span className="font-mono text-[10px]/none font-medium">00</span>
          <h2 className="m-0 text-[15px] text-foreground">
            No projects match this view.
          </h2>
          <Button
            type="button"
            variant="link"
            onClick={() => {
              setLevel("all");
              setQuery("");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </section>
  );
}
