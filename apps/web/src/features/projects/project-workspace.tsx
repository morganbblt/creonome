"use client";

import type { ProjectDetail, ProjectLevel } from "@creonome/contracts";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./projects.module.css";
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

export function ProjectWorkspace({ project }: { project: ProjectDetail }) {
  const currentIndex = maturityLevels.indexOf(project.currentLevel);
  const [activeDeliverable, setActiveDeliverable] = useState<
    "script" | "storyboard" | "video"
  >(project.video ? "video" : project.storyboard ? "storyboard" : "script");

  useEffect(() => {
    setActiveDeliverable(
      project.hasVideo ? "video" : project.hasStoryboard ? "storyboard" : "script",
    );
  }, [project.hasStoryboard, project.hasVideo]);

  return (
    <main className={styles.workspace}>
      <Link href="/projects" className={styles.back}>
        ← All projects
      </Link>

      <header className={styles.projectHeader}>
        <div>
          <p>
            PROJECT · {project.platform?.replace("_", " ") ?? "NO PLATFORM"}
          </p>
          <h1>{project.title}</h1>
          <span>
            Updated {formatDate(project.updatedAt)} · version{" "}
            {project.currentVersion}
          </span>
        </div>
        <div className={styles.headerStats}>
          <span>{label(project.currentLevel)}</span>
          <strong>{project.score ?? "—"}</strong>
          <small>opportunity score</small>
        </div>
      </header>

      <section className={styles.path} aria-label="Project maturity">
        {maturityLevels.map((level, index) => (
          <div
            key={level}
            className={
              index === currentIndex
                ? styles.currentPath
                : index < currentIndex
                  ? styles.completePath
                  : styles.futurePath
            }
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{label(level)}</strong>
              <small>
                {index === currentIndex
                  ? "Current level"
                  : index < currentIndex
                    ? "Available"
                    : "Not generated"}
              </small>
            </div>
          </div>
        ))}
      </section>

      <div className={styles.workspaceGrid}>
        <div className={styles.deliverables}>
          {project.script ? (
            <div
              className={styles.deliverableTabs}
              role="tablist"
              aria-label="Project deliverables"
            >
              {project.video ? (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeDeliverable === "video"}
                  onClick={() => setActiveDeliverable("video")}
                >
                  Video
                </button>
              ) : null}
              {project.storyboard ? (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeDeliverable === "storyboard"}
                  onClick={() => setActiveDeliverable("storyboard")}
                >
                  Storyboard
                </button>
              ) : null}
              <button
                type="button"
                role="tab"
                aria-selected={activeDeliverable === "script"}
                onClick={() => setActiveDeliverable("script")}
              >
                Script
              </button>
            </div>
          ) : null}

          {project.script && activeDeliverable === "script" ? (
            <section
              className={styles.scriptSheet}
              aria-labelledby="script-title"
            >
              <header className={styles.sectionHeader}>
                <div>
                  <p>SCRIPT · LATEST</p>
                  <h2 id="script-title">{project.script.title}</h2>
                </div>
                <span>
                  {project.script.durationSeconds ?? "—"} sec ·{" "}
                  {project.script.platforms.join(" / ")}
                </span>
              </header>
              <div className={styles.scriptContent}>
                <div className={styles.hookBlock}>
                  <span>HOOK · 00:00</span>
                  <blockquote>{project.script.hook}</blockquote>
                </div>
                <div className={styles.bodyBlock}>
                  <span>BODY</span>
                  {splitScriptSegments(project.script.body).map(
                    (segment, index) => (
                      <p
                        data-testid="script-segment"
                        key={`${index}-${segment}`}
                      >
                        {segment}
                      </p>
                    ),
                  )}
                </div>
                {project.script.callToAction ? (
                  <div className={styles.copyBlock}>
                    <span>CTA</span>
                    <p>{project.script.callToAction}</p>
                  </div>
                ) : null}
                {project.script.caption ? (
                  <div className={styles.copyBlock}>
                    <span>CAPTION</span>
                    <p>{project.script.caption}</p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {!project.script ? (
            <section className={styles.ideaState}>
              <span>01</span>
              <div>
                <p>IDEA SAVED</p>
                <h2>The script has not been generated yet.</h2>
                <p>Return to its opportunity to continue the creative path.</p>
              </div>
              {project.opportunityId ? (
                <Link href={`/opportunities/${project.opportunityId}`}>
                  Open opportunity
                </Link>
              ) : null}
            </section>
          ) : null}

          {project.script &&
          !project.storyboard &&
          project.currentLevel === "script" ? (
            <StoryboardUpgrade projectId={project.id} />
          ) : null}

          {project.storyboard &&
          !project.video &&
          project.currentLevel === "storyboard" ? (
            <VideoUpgrade projectId={project.id} />
          ) : null}

          {project.storyboard && activeDeliverable === "storyboard" ? (
            <section
              className={styles.storyboard}
              aria-labelledby="storyboard-title"
            >
              <header className={styles.sectionHeader}>
                <div>
                  <p>STORYBOARD · {project.storyboard.aspectRatio}</p>
                  <h2 id="storyboard-title">Visual sequence</h2>
                </div>
                <span>
                  {project.storyboard.scenes.length} scenes ·{" "}
                  {project.storyboard.durationSeconds ?? "—"} sec
                </span>
              </header>
              <div className={styles.scenes}>
                {project.storyboard.scenes.map((scene) => (
                  <article className={styles.scene} key={scene.id}>
                    <div className={styles.sceneFrame}>
                      <span>{String(scene.position).padStart(2, "0")}</span>
                      <em>
                        {String(scene.startSeconds).padStart(2, "0")}s →{" "}
                        {String(
                          scene.startSeconds + (scene.durationSeconds ?? 0),
                        ).padStart(2, "0")}
                        s
                      </em>
                    </div>
                    <div className={styles.sceneCopy}>
                      <p>{scene.shotType ?? "SHOT"}</p>
                      <h3>
                        {String(scene.position).padStart(2, "0")} ·{" "}
                        {scene.heading}
                      </h3>
                      <p>{scene.description}</p>
                      {scene.onScreenText ? (
                        <blockquote>“{scene.onScreenText}”</blockquote>
                      ) : null}
                      {scene.voiceover ? (
                        <small>VO · {scene.voiceover}</small>
                      ) : null}
                      <dl className={styles.sceneDetails}>
                        {scene.bRoll ? (
                          <div>
                            <dt>B-ROLL</dt>
                            <dd>{scene.bRoll}</dd>
                          </div>
                        ) : null}
                        {scene.transition ? (
                          <div>
                            <dt>TRANSITION</dt>
                            <dd>{scene.transition}</dd>
                          </div>
                        ) : null}
                        {scene.requiredAsset ? (
                          <div>
                            <dt>ASSET</dt>
                            <dd>{scene.requiredAsset}</dd>
                          </div>
                        ) : null}
                        {scene.sound ? (
                          <div>
                            <dt>SOUND</dt>
                            <dd>{scene.sound}</dd>
                          </div>
                        ) : null}
                        {scene.editingNote ? (
                          <div>
                            <dt>EDIT</dt>
                            <dd>{scene.editingNote}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {project.video && activeDeliverable === "video" ? (
            <section
              className={styles.videoSheet}
              aria-labelledby="video-title"
            >
              <header className={styles.sectionHeader}>
                <div>
                  <p>
                    VIDEO · {project.video.simulated ? "MVP PREVIEW" : "LATEST"}
                  </p>
                  <h2 id="video-title">Vertical motion preview</h2>
                </div>
                <span>
                  {project.video.width} × {project.video.height} ·{" "}
                  {project.video.durationSeconds} sec
                </span>
              </header>
              <div className={styles.videoStage}>
                <video
                  controls
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  aria-label="Generated vertical video"
                >
                  <source
                    src={project.video.previewUrl}
                    type={project.video.mimeType}
                  />
                </video>
              </div>
              <footer className={styles.videoMeta}>
                <div>
                  <strong>9:16 delivery preview</strong>
                  <span>
                    {project.video.simulated
                      ? "MVP simulated render · replaceable by the production video provider"
                      : "Production render"}
                  </span>
                </div>
                <a href={project.video.previewUrl} download>
                  Download MVP video
                </a>
              </footer>
            </section>
          ) : null}
        </div>

        <aside className={styles.projectAside}>
          <section className={styles.exportPanel}>
            <p className={styles.asideLabel}>EXPORT</p>
            <strong>Latest project package</strong>
            <p>Script, storyboard and shoot notes in one portable file.</p>
            <ProjectExportButton projectId={project.id} />
          </section>

          <section>
            <p className={styles.asideLabel}>VERSION HISTORY</p>
            <div className={styles.versions}>
              {project.versions.map((version, index) => (
                <article key={version.version}>
                  <span className={index === 0 ? styles.liveDot : styles.dot} />
                  <div>
                    <strong>
                      v{version.version} ·{" "}
                      {label(version.level as ProjectLevel)}
                    </strong>
                    <p>
                      {version.changeSummary ?? label(version.changeSource)}
                    </p>
                    <small>{formatDate(version.createdAt)}</small>
                    {version.lockedFields.length ? (
                      <em>Locked: {version.lockedFields.join(", ")}</em>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {project.latestJob ? (
            <section className={styles.job}>
              <p className={styles.asideLabel}>LATEST GENERATION</p>
              <div>
                <span data-status={project.latestJob.status} />
                <strong>{label(project.latestJob.kind)}</strong>
                <em>{project.latestJob.status}</em>
              </div>
              <progress max="100" value={project.latestJob.progress}>
                {project.latestJob.progress}%
              </progress>
              <small>{project.latestJob.model}</small>
            </section>
          ) : null}

          {project.opportunityId ? (
            <Link
              className={styles.sourceLink}
              href={`/opportunities/${project.opportunityId}`}
            >
              View source opportunity ↗
            </Link>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
