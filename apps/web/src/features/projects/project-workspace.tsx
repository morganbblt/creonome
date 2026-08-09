"use client";

import type { ProjectDetail, ProjectLevel } from "@creonome/contracts";
import { ArrowLeft, Lightbulb } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/src/components/ui/card";
import { Progress } from "@/src/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components/ui/tabs";
import { buttonVariants } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { ProjectExportButton } from "./project-export-button";
import { splitScriptSegments } from "./script-segments";
import { StoryboardUpgrade } from "./storyboard-upgrade";
import { VideoUpgrade } from "./video-upgrade";

const maturityLevels = ["idea", "script", "storyboard", "video"] as const;

function label(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

function LevelProgress({ currentLevel }: { currentLevel: ProjectLevel }) {
  const index = maturityLevels.indexOf(currentLevel);
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex gap-1" aria-hidden="true">
        {maturityLevels.map((level, levelIndex) => (
          <span
            key={level}
            className={cn(
              "h-1 w-4 rounded-full",
              levelIndex <= index ? "bg-foreground" : "bg-input",
            )}
          />
        ))}
      </div>
      <div className="leading-tight">
        <span className="block text-xs font-semibold text-foreground">
          {label(currentLevel)}
        </span>
        <span className="block font-mono text-[10px] text-muted-foreground">
          Current level · {index + 1} of {maturityLevels.length}
        </span>
      </div>
    </div>
  );
}

export function ProjectWorkspace({ project }: { project: ProjectDetail }) {
  const [activeDeliverable, setActiveDeliverable] = useState<
    "script" | "storyboard" | "video"
  >(project.video ? "video" : project.storyboard ? "storyboard" : "script");

  useEffect(() => {
    setActiveDeliverable(
      project.hasVideo
        ? "video"
        : project.hasStoryboard
          ? "storyboard"
          : "script",
    );
  }, [project.hasStoryboard, project.hasVideo]);

  return (
    <Tabs
      value={activeDeliverable}
      onValueChange={(value) =>
        setActiveDeliverable(value as "script" | "storyboard" | "video")
      }
    >
      <main className="mx-auto w-full max-w-[1180px] px-5.5 pt-7 pb-16 max-[620px]:px-3.5 max-[620px]:pt-5.5 max-[620px]:pb-12">
        <Link
          href="/projects"
          className="mb-6 inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All projects
        </Link>

        <header className="mb-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-2 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
              Project · {project.platform?.replace("_", " ") ?? "no platform"}
            </p>
            <h1 className="m-0 mb-2.5 max-w-3xl text-[42px] leading-[0.98] font-semibold tracking-[-0.03em] text-foreground max-[620px]:text-3xl">
              {project.title}
            </h1>
            <span className="text-[11.5px] text-muted-foreground">
              Updated {formatDate(project.updatedAt)} · version{" "}
              {project.currentVersion}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5 rounded-[8px] border border-border bg-card px-4 py-3.5 shadow-sm">
            <span className="font-mono text-2xl leading-none font-semibold text-foreground">
              {project.score ?? "—"}
            </span>
            <span className="font-mono text-[8.5px] text-muted-foreground">
              opportunity score
            </span>
          </div>
        </header>

        <div
          className="sticky top-17 z-30 mb-4.5 flex flex-col gap-3 rounded-card border border-border bg-card/95 p-3.5 shadow-sm backdrop-blur-md max-[760px]:top-15"
          aria-label="Project actions"
        >
          <div className="flex flex-wrap items-center gap-3">
            <LevelProgress currentLevel={project.currentLevel} />

            {project.script ? (
              <TabsList>
                {project.video ? (
                  <TabsTrigger value="video">Video</TabsTrigger>
                ) : null}
                {project.storyboard ? (
                  <TabsTrigger value="storyboard">Storyboard</TabsTrigger>
                ) : null}
                <TabsTrigger value="script">Script</TabsTrigger>
              </TabsList>
            ) : null}

            <div className="ml-auto flex flex-wrap items-start justify-end gap-3">
              {project.script ? (
                <StoryboardUpgrade
                  projectId={project.id}
                  storyboard={project.storyboard}
                />
              ) : null}
              {project.storyboard ? (
                <VideoUpgrade projectId={project.id} video={project.video} />
              ) : null}
              <ProjectExportButton projectId={project.id} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_280px] items-start gap-4.5 max-[900px]:grid-cols-1">
          <div className="flex min-w-0 flex-col gap-4.5">
            {!project.script ? (
              <section className="grid grid-cols-[40px_1fr_auto] items-center gap-4 rounded-card border border-border bg-card p-5.5 shadow-sm max-[620px]:grid-cols-[40px_1fr]">
                <span className="grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground">
                  <Lightbulb className="size-4.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="m-0 mb-1 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                    Idea saved
                  </p>
                  <h2 className="m-0 mb-1 text-[15px] font-semibold text-foreground">
                    The script has not been generated yet.
                  </h2>
                  <p className="m-0 text-[11.5px] text-muted-foreground">
                    Return to its opportunity to continue the creative path.
                  </p>
                </div>
                {project.opportunityId ? (
                  <Link
                    href={`/opportunities/${project.opportunityId}`}
                    className="text-[11px] font-semibold text-foreground hover:underline max-[620px]:col-span-2"
                  >
                    Open opportunity
                  </Link>
                ) : null}
              </section>
            ) : null}

            {project.script ? (
              <TabsContent value="script">
                <Card
                  className="gap-0 overflow-hidden p-0"
                  aria-labelledby="script-title"
                >
                  <div className="flex min-h-[76px] flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
                    <div>
                      <p className="m-0 mb-1.5 font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase">
                        Script · latest
                      </p>
                      <h2
                        id="script-title"
                        className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-foreground"
                      >
                        {project.script.title}
                      </h2>
                    </div>
                    <span className="font-mono text-[9px] text-muted-foreground uppercase">
                      {project.script.durationSeconds ?? "—"} sec ·{" "}
                      {project.script.platforms.join(" / ")}
                    </span>
                  </div>
                  <div className="p-6 max-[620px]:p-3.5">
                    <div className="rounded-[6px] border-l-[3px] border-foreground bg-secondary/60 p-5 max-[620px]:p-4">
                      <span className="font-mono text-[9px] tracking-[0.08em] text-muted-foreground">
                        HOOK · 00:00
                      </span>
                      <blockquote className="m-0 mt-3 text-2xl leading-[1.2] font-semibold tracking-[-0.02em] text-foreground">
                        {project.script.hook}
                      </blockquote>
                    </div>
                    <div className="border-b border-border py-7 max-[620px]:py-5">
                      <span className="font-mono text-[9px] tracking-[0.08em] text-muted-foreground">
                        BODY
                      </span>
                      {splitScriptSegments(project.script.body).map(
                        (segment, index) => (
                          <p
                            data-testid="script-segment"
                            key={`${index}-${segment}`}
                            className="mt-3 max-w-[680px] text-[15px] leading-[1.75] whitespace-pre-wrap text-foreground"
                          >
                            {segment}
                          </p>
                        ),
                      )}
                    </div>
                    {project.script.callToAction ? (
                      <div className="grid grid-cols-[70px_1fr] gap-4 border-b border-border py-4.5">
                        <span className="font-mono text-[9px] tracking-[0.08em] text-muted-foreground">
                          CTA
                        </span>
                        <p className="m-0 text-[12.5px] leading-[1.55] text-muted-foreground">
                          {project.script.callToAction}
                        </p>
                      </div>
                    ) : null}
                    {project.script.caption ? (
                      <div className="grid grid-cols-[70px_1fr] gap-4 py-4.5">
                        <span className="font-mono text-[9px] tracking-[0.08em] text-muted-foreground">
                          CAPTION
                        </span>
                        <p className="m-0 text-[12.5px] leading-[1.55] text-muted-foreground">
                          {project.script.caption}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </Card>
              </TabsContent>
            ) : null}

            {project.storyboard ? (
              <TabsContent value="storyboard">
                <Card
                  className="gap-0 overflow-hidden p-0"
                  aria-labelledby="storyboard-title"
                >
                  <div className="flex min-h-[76px] flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
                    <div>
                      <p className="m-0 mb-1.5 font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase">
                        Storyboard · {project.storyboard.aspectRatio}
                      </p>
                      <h2
                        id="storyboard-title"
                        className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-foreground"
                      >
                        Visual sequence
                      </h2>
                    </div>
                    <span className="font-mono text-[9px] text-muted-foreground uppercase">
                      {project.storyboard.scenes.length} scenes ·{" "}
                      {project.storyboard.durationSeconds ?? "—"} sec
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5 p-4.5">
                    {project.storyboard.scenes.map((scene) => (
                      <article
                        className="grid grid-cols-[92px_1fr] gap-4.5 rounded-[8px] border border-border p-2.5 max-[620px]:grid-cols-[68px_1fr] max-[620px]:gap-3"
                        key={scene.id}
                      >
                        <div className="flex h-29 flex-col justify-between rounded-[6px] bg-secondary p-2.5 font-mono text-[9px] text-muted-foreground max-[620px]:h-24">
                          <span>{String(scene.position).padStart(2, "0")}</span>
                          <em className="self-end not-italic">
                            {String(scene.startSeconds).padStart(2, "0")}s →{" "}
                            {String(
                              scene.startSeconds + (scene.durationSeconds ?? 0),
                            ).padStart(2, "0")}
                            s
                          </em>
                        </div>
                        <div className="py-1.5 pr-2 pl-0">
                          <p className="m-0 mb-1.5 font-mono text-[8.5px] text-muted-foreground uppercase">
                            {scene.shotType ?? "Shot"}
                          </p>
                          <h3 className="m-0 mb-2 text-[13px] font-semibold text-foreground">
                            {String(scene.position).padStart(2, "0")} ·{" "}
                            {scene.heading}
                          </h3>
                          <p className="m-0 text-xs leading-[1.5] text-muted-foreground">
                            {scene.description}
                          </p>
                          {scene.onScreenText ? (
                            <blockquote className="m-0 mt-2.5 border-l-2 border-input pl-2.5 font-mono text-[10.5px] leading-[1.5] text-muted-foreground">
                              “{scene.onScreenText}”
                            </blockquote>
                          ) : null}
                          {scene.voiceover ? (
                            <small className="mt-2.5 block font-mono text-[9px] text-muted-foreground/80">
                              VO · {scene.voiceover}
                            </small>
                          ) : null}
                          <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3">
                            {scene.bRoll ? (
                              <div className="min-w-0">
                                <dt className="mb-1 font-mono text-[8px] text-muted-foreground">
                                  B-roll
                                </dt>
                                <dd className="m-0 text-[10px] leading-[1.4] text-muted-foreground">
                                  {scene.bRoll}
                                </dd>
                              </div>
                            ) : null}
                            {scene.transition ? (
                              <div className="min-w-0">
                                <dt className="mb-1 font-mono text-[8px] text-muted-foreground">
                                  Transition
                                </dt>
                                <dd className="m-0 text-[10px] leading-[1.4] text-muted-foreground">
                                  {scene.transition}
                                </dd>
                              </div>
                            ) : null}
                            {scene.requiredAsset ? (
                              <div className="min-w-0">
                                <dt className="mb-1 font-mono text-[8px] text-muted-foreground">
                                  Asset
                                </dt>
                                <dd className="m-0 text-[10px] leading-[1.4] text-muted-foreground">
                                  {scene.requiredAsset}
                                </dd>
                              </div>
                            ) : null}
                            {scene.sound ? (
                              <div className="min-w-0">
                                <dt className="mb-1 font-mono text-[8px] text-muted-foreground">
                                  Sound
                                </dt>
                                <dd className="m-0 text-[10px] leading-[1.4] text-muted-foreground">
                                  {scene.sound}
                                </dd>
                              </div>
                            ) : null}
                            {scene.editingNote ? (
                              <div className="min-w-0">
                                <dt className="mb-1 font-mono text-[8px] text-muted-foreground">
                                  Edit
                                </dt>
                                <dd className="m-0 text-[10px] leading-[1.4] text-muted-foreground">
                                  {scene.editingNote}
                                </dd>
                              </div>
                            ) : null}
                          </dl>
                        </div>
                      </article>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            ) : null}

            {project.video ? (
              <TabsContent value="video">
                <Card
                  className="gap-0 overflow-hidden p-0"
                  aria-labelledby="video-title"
                >
                  <div className="flex min-h-[76px] flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
                    <div>
                      <p className="m-0 mb-1.5 font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase">
                        Video ·{" "}
                        {project.video.simulated ? "MVP preview" : "latest"}
                      </p>
                      <h2
                        id="video-title"
                        className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-foreground"
                      >
                        Vertical motion preview
                      </h2>
                    </div>
                    <span className="font-mono text-[9px] text-muted-foreground uppercase">
                      {project.video.width} × {project.video.height} ·{" "}
                      {project.video.durationSeconds} sec
                    </span>
                  </div>
                  <div className="grid min-h-[420px] place-items-center bg-[#090b0d] p-6">
                    <video
                      controls
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      aria-label="Generated vertical video"
                      className="block aspect-9/16 w-full max-w-[330px] rounded-[10px] border border-white/15 bg-black object-cover shadow-lg max-h-[70vh]"
                    >
                      <source
                        src={project.video.previewUrl}
                        type={project.video.mimeType}
                      />
                    </video>
                  </div>
                  <div className="flex items-center justify-between gap-4.5 border-t border-border px-5 py-4">
                    <div>
                      <strong className="mb-1 block text-xs font-semibold text-foreground">
                        9:16 delivery preview
                      </strong>
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {project.video.simulated
                          ? `MVP fallback · ${project.video.model}`
                          : `Veo render · ${project.video.model}`}
                      </span>
                    </div>
                    <a
                      href={`${project.video.previewUrl}${project.video.previewUrl.includes("?") ? "&" : "?"}download=1`}
                      download
                      className={cn(buttonVariants({ variant: "outline" }))}
                    >
                      Download video
                    </a>
                  </div>
                </Card>
              </TabsContent>
            ) : null}
          </div>

          <aside className="sticky top-35 flex flex-col gap-3 max-[900px]:static max-[900px]:grid max-[900px]:grid-cols-2">
            <section className="rounded-card border border-border bg-card p-4.25 shadow-sm">
              <p className="m-0 mb-2 font-mono text-[9.5px] tracking-[0.1em] text-muted-foreground uppercase">
                Version history
              </p>
              <div className="flex flex-col divide-y divide-border">
                {project.versions.map((version, index) => (
                  <article
                    className="flex gap-2.5 py-2.5 first:pt-0 last:pb-0"
                    key={version.version}
                  >
                    <span
                      className={cn(
                        "mt-1 size-2.25 shrink-0 rounded-full border-2 border-card",
                        index === 0 ? "bg-accent" : "bg-input",
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <strong className="text-[10.5px] font-semibold text-foreground">
                        v{version.version} ·{" "}
                        {label(version.level as ProjectLevel)}
                      </strong>
                      <p className="my-1 text-[10.5px] leading-[1.45] text-muted-foreground">
                        {version.changeSummary ?? label(version.changeSource)}
                      </p>
                      <small className="block font-mono text-[8.5px] text-muted-foreground/80">
                        {formatDate(version.createdAt)}
                      </small>
                      {version.lockedFields.length ? (
                        <em className="mt-1 block font-mono text-[8.5px] text-muted-foreground/80 not-italic">
                          Locked: {version.lockedFields.join(", ")}
                        </em>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {project.latestJob ? (
              <section className="rounded-card border border-border bg-card p-4.25 shadow-sm">
                <p className="m-0 mb-2 font-mono text-[9.5px] tracking-[0.1em] text-muted-foreground uppercase">
                  Latest generation
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-1.75 rounded-full",
                      project.latestJob.status === "succeeded"
                        ? "bg-success"
                        : "bg-input",
                    )}
                    aria-hidden="true"
                  />
                  <strong className="text-[11px] font-semibold text-foreground">
                    {label(project.latestJob.kind)}
                  </strong>
                  <em className="ml-auto font-mono text-[8.5px] text-muted-foreground not-italic">
                    {project.latestJob.status}
                  </em>
                </div>
                <Progress
                  value={project.latestJob.progress}
                  className="my-3 h-[3px]"
                  aria-label={`${label(project.latestJob.kind)} progress`}
                />
                <small className="font-mono text-[8.5px] text-muted-foreground">
                  {project.latestJob.model}
                </small>
              </section>
            ) : null}

            {project.opportunityId ? (
              <Link
                className="block px-0.5 py-3 text-[11px] font-semibold text-foreground hover:underline max-[900px]:col-span-2"
                href={`/opportunities/${project.opportunityId}`}
              >
                View source opportunity ↗
              </Link>
            ) : null}
          </aside>
        </div>
      </main>
    </Tabs>
  );
}
