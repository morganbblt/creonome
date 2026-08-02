"use client";

import {
  LibraryItemSchema,
  OnboardingStateSchema,
  UploadSignResponseSchema,
  type OnboardingProfile,
  type OnboardingRepresentativeness,
  type OnboardingState,
} from "@creonome/contracts";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import styles from "./onboarding.module.css";

type View = "source" | "upload" | "profile";
type LocalFailure = { id: string; fileName: string; message: string };

const representationLabels: Record<OnboardingRepresentativeness, string> = {
  representative: "Very representative",
  not_my_style: "Not my style",
  reference_only: "Reference only",
};

const supportedMimeTypes = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "image/jpeg",
  "image/png",
  "application/pdf",
  "text/plain",
]);
const supportedExtensions = new Set([
  "mp4",
  "mov",
  "webm",
  "mp3",
  "wav",
  "png",
  "jpg",
  "jpeg",
  "pdf",
  "txt",
]);

const emptyProfile: OnboardingProfile = {
  stageName: "",
  disciplines: [],
  genres: [],
  creativeSignature: "",
  themes: [],
  targetAudience: "",
  boundaries: [],
};

function initialView(state: OnboardingState): View {
  if (state.step === "profile" && state.profile) return "profile";
  if (state.step === "upload") return "upload";
  return "source";
}

function formatBytes(value: number): string {
  if (value < 1_000_000) return `${Math.max(1, Math.round(value / 1_000))} KB`;
  return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)} MB`;
}

function fileExtension(fileName: string): string {
  return fileName.split(".").at(-1)?.toLowerCase() ?? "file";
}

function isSupported(file: File): boolean {
  return (
    supportedMimeTypes.has(file.type) ||
    supportedExtensions.has(fileExtension(file.name))
  );
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ProgressHeader({ view }: { view: View }) {
  const progress = view === "source" ? 33 : view === "upload" ? 50 : 67;
  const step = view === "source" ? 2 : view === "upload" ? 3 : 4;
  const title =
    view === "source"
      ? "Creonome"
      : view === "upload"
        ? "Import files"
        : "Your creative profile";
  return (
    <header className={styles.panelHeader}>
      <img src="/brand/creonome-wordmark-black.svg" alt="Creonome" />
      <strong>{title}</strong>
      <div className={styles.progressGroup}>
        <span className={styles.progressTrack} aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </span>
        <span>
          {progress}% · step {step} of 6
        </span>
      </div>
    </header>
  );
}

export function OnboardingWorkspace({
  initialState,
}: {
  initialState: OnboardingState;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState(initialState);
  const [view, setView] = useState<View>(() => initialView(initialState));
  const [profile, setProfile] = useState<OnboardingProfile>(
    initialState.profile ?? emptyProfile,
  );
  const [failures, setFailures] = useState<LocalFailure[]>([]);
  const [activeUploads, setActiveUploads] = useState(0);
  const [busyAsset, setBusyAsset] = useState<string | null>(null);
  const [buildingProfile, setBuildingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function useRemoteState(next: unknown) {
    const parsed = OnboardingStateSchema.parse(next);
    setState(parsed);
    if (parsed.profile) setProfile(parsed.profile);
    if (parsed.step === "profile" && parsed.profile) setView("profile");
    return parsed;
  }

  async function refreshState() {
    const response = await fetch("/api/creonome/onboarding", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("refresh");
    useRemoteState(await response.json());
  }

  async function uploadOne(file: File) {
    const signResponse = await fetch("/api/creonome/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        byteSize: file.size,
      }),
    });
    if (!signResponse.ok) throw new Error("sign");
    const signed = UploadSignResponseSchema.parse(await signResponse.json());

    const uploadResponse = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: signed.headers,
      body: file,
    });
    if (!uploadResponse.ok) throw new Error("upload");

    const registration = await fetch("/api/creonome/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        byteSize: file.size,
        gcsUri: signed.gcsUri,
      }),
    });
    if (!registration.ok) throw new Error("register");
    const asset = LibraryItemSchema.parse(await registration.json());
    setState((current) => ({
      ...current,
      status: "in_progress",
      step: "upload",
      assets: [
        ...current.assets.filter(({ id }) => id !== asset.id),
        {
          id: asset.id,
          fileName: asset.name,
          mimeType: asset.mimeType ?? file.type,
          byteSize: asset.byteSize ?? file.size,
          status: "analyzing",
          representativeness: "representative",
          analysis: null,
          errorMessage: null,
          createdAt: asset.createdAt,
        },
      ],
    }));

    const analysis = await fetch(
      `/api/creonome/onboarding/assets/${encodeURIComponent(asset.id)}/analyze`,
      { method: "POST" },
    );
    if (!analysis.ok) throw new Error("analyze");
    useRemoteState(await analysis.json());
  }

  async function uploadFiles(files: FileList | File[]) {
    setView("upload");
    setError(null);
    const availableSlots = Math.max(0, 8 - state.assets.length);
    const selected = Array.from(files).slice(0, availableSlots);
    const valid: File[] = [];
    const rejected: LocalFailure[] = [];
    for (const file of selected) {
      if (file.size > 500_000_000) {
        rejected.push({
          id: `${Date.now()}-${file.name}`,
          fileName: file.name,
          message: "This file is larger than the 500 MB limit.",
        });
      } else if (!isSupported(file)) {
        rejected.push({
          id: `${Date.now()}-${file.name}`,
          fileName: file.name,
          message:
            "Container not supported. Use MP4, MOV, WAV, JPG, PDF or TXT.",
        });
      } else {
        valid.push(file);
      }
    }
    setFailures((current) => [...current, ...rejected]);
    if (Array.from(files).length > availableSlots) {
      setError("Choose up to eight sources for the first profile.");
    }
    setActiveUploads((current) => current + valid.length);
    const results = await Promise.allSettled(
      valid.map(async (file) => {
        try {
          await uploadOne(file);
        } catch {
          setFailures((current) => [
            ...current,
            {
              id: `${Date.now()}-${file.name}`,
              fileName: file.name,
              message:
                "Upload or analysis failed. Your other sources are intact.",
            },
          ]);
        } finally {
          setActiveUploads((current) => Math.max(0, current - 1));
        }
      }),
    );
    if (results.length > 0) await refreshState().catch(() => undefined);
    if (input.current) input.current.value = "";
  }

  async function updateRepresentation(
    assetId: string,
    representativeness: OnboardingRepresentativeness,
  ) {
    setBusyAsset(assetId);
    setError(null);
    try {
      const response = await fetch(
        `/api/creonome/onboarding/assets/${encodeURIComponent(assetId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ representativeness }),
        },
      );
      if (!response.ok) throw new Error("label");
      useRemoteState(await response.json());
    } catch {
      setError(
        "That label wasn’t saved. The source and its analysis are intact.",
      );
    } finally {
      setBusyAsset(null);
    }
  }

  async function retryAnalysis(assetId: string) {
    setBusyAsset(assetId);
    setError(null);
    setState((current) => ({
      ...current,
      assets: current.assets.map((asset) =>
        asset.id === assetId
          ? { ...asset, status: "analyzing", errorMessage: null }
          : asset,
      ),
    }));
    try {
      const response = await fetch(
        `/api/creonome/onboarding/assets/${encodeURIComponent(assetId)}/analyze`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("analyze");
      useRemoteState(await response.json());
    } catch {
      await refreshState().catch(() => undefined);
      setError("Analysis didn’t finish. The source is intact — try again.");
    } finally {
      setBusyAsset(null);
    }
  }

  async function buildProfile() {
    setBuildingProfile(true);
    setError(null);
    try {
      const response = await fetch("/api/creonome/onboarding/profile/draft", {
        method: "POST",
      });
      if (!response.ok) throw new Error("profile");
      useRemoteState(await response.json());
      setView("profile");
    } catch {
      setError(
        "We couldn’t build the profile yet. Your sources are intact — try again.",
      );
    } finally {
      setBuildingProfile(false);
    }
  }

  async function completeProfile() {
    setSavingProfile(true);
    setError(null);
    try {
      const response = await fetch("/api/creonome/onboarding/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error("save");
      useRemoteState(await response.json());
      setNotice("Profile saved. Opening your workspace…");
      router.push("/today");
    } catch {
      setError(
        "Your profile wasn’t saved. Your draft is still here — try again.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <main className={styles.page}>
      <input
        ref={input}
        className={styles.fileInput}
        type="file"
        aria-label="Upload source files"
        multiple
        accept="video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,image/png,image/jpeg,application/pdf,text/plain,.mov,.mp3,.wav,.txt"
        onChange={(event) => {
          if (event.target.files) void uploadFiles(event.target.files);
        }}
      />
      <section
        className={styles.panel}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void uploadFiles(event.dataTransfer.files);
        }}
      >
        <ProgressHeader view={view} />

        {view === "source" ? (
          <div className={styles.sourceBody}>
            <div className={styles.intro}>
              <span>YOUR CREATIVE OPERATING SYSTEM</span>
              <h1>Let’s start with what already sounds like you.</h1>
              <p>
                Pick any route. Every source stays private, and you can add more
                later.
              </p>
            </div>
            <div className={styles.sourceGrid}>
              <button
                type="button"
                className={styles.comingSoonCard}
                disabled
                aria-label="TikTok · Coming soon"
              >
                <span className={styles.sourceIcon}>T</span>
                <strong>TikTok</strong>
                <em>Coming soon</em>
                <p>Your own recent videos, read once to learn your patterns.</p>
              </button>
              <button
                type="button"
                className={styles.comingSoonCard}
                disabled
                aria-label="Instagram · Coming soon"
              >
                <span className={styles.sourceIcon}>I</span>
                <strong>Instagram</strong>
                <em>Coming soon</em>
                <p>Your own Reels and available insights.</p>
              </button>
              <article className={styles.importCard}>
                <div className={styles.cardTitle}>
                  <span className={styles.sourceIcon}>＋</span>
                  <strong>Import files</strong>
                  <em>Fastest</em>
                </div>
                <p>
                  Drop videos, voice notes, stems, lyrics or references. No
                  social account needed.
                </p>
                <small>MP4 · MOV · MP3 · WAV · PDF · TXT</small>
                <button type="button" onClick={() => input.current?.click()}>
                  Choose files
                </button>
              </article>
              <article className={styles.manualCard}>
                <div className={styles.cardTitle}>
                  <span className={styles.sourceIcon}>✎</span>
                  <strong>Describe myself instead</strong>
                </div>
                <p>
                  Fill the profile by hand. It sharpens as you accept or reject
                  work.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setProfile(emptyProfile);
                    setView("profile");
                  }}
                >
                  Continue manually
                </button>
              </article>
            </div>
            <p className={styles.privacyNote}>
              Imported media builds your profile and nothing else. Delete a
              source and its derived evidence goes with it.
            </p>
          </div>
        ) : null}

        {view === "upload" ? (
          <div className={styles.uploadBody}>
            <button
              type="button"
              className={styles.dropzone}
              onClick={() => input.current?.click()}
            >
              <span>＋</span>
              <div>
                <strong>Drop more anywhere on this panel</strong>
                <small>MP4 MOV WEBM MP3 WAV PNG JPG PDF TXT · up to 8</small>
              </div>
              <em>Browse</em>
            </button>

            {activeUploads > 0 ? (
              <p className={styles.inlineStatus} role="status">
                <span /> Uploading and analyzing {activeUploads} source
                {activeUploads === 1 ? "" : "s"}…
              </p>
            ) : null}
            <div className={styles.queue}>
              {state.assets.map((asset) => (
                <article
                  key={asset.id}
                  className={styles.assetRow}
                  data-status={asset.status}
                >
                  <span className={styles.fileVisual}>
                    {fileExtension(asset.fileName).slice(0, 4).toUpperCase()}
                  </span>
                  <div className={styles.assetDetails}>
                    <strong>{asset.fileName}</strong>
                    <span>
                      {formatBytes(asset.byteSize)} · {asset.status}
                      {asset.status === "analyzing" ? "…" : ""}
                    </span>
                    {asset.status === "analyzing" ? (
                      <span className={styles.analysisBar} aria-hidden="true">
                        <span />
                      </span>
                    ) : null}
                    {asset.errorMessage ? <p>{asset.errorMessage}</p> : null}
                    {asset.analysis ? (
                      <details className={styles.evidence} open>
                        <summary>{asset.analysis.summary}</summary>
                        <ul>
                          {asset.analysis.evidence.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </div>
                  {asset.status === "ready" ? (
                    <div className={styles.representation}>
                      {(
                        Object.keys(
                          representationLabels,
                        ) as OnboardingRepresentativeness[]
                      ).map((value) => (
                        <button
                          type="button"
                          key={value}
                          aria-pressed={asset.representativeness === value}
                          disabled={busyAsset === asset.id}
                          onClick={() =>
                            void updateRepresentation(asset.id, value)
                          }
                        >
                          {representationLabels[value]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {asset.status === "uploaded" || asset.status === "failed" ? (
                    <button
                      type="button"
                      className={styles.retryButton}
                      disabled={busyAsset === asset.id}
                      onClick={() => void retryAnalysis(asset.id)}
                    >
                      Try analysis again
                    </button>
                  ) : null}
                </article>
              ))}
              {failures.map((failure) => (
                <article key={failure.id} className={styles.failedRow}>
                  <span className={styles.fileVisual}>
                    {fileExtension(failure.fileName).slice(0, 4).toUpperCase()}
                  </span>
                  <div>
                    <strong>{failure.fileName}</strong>
                    <p>{failure.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFailures((current) =>
                        current.filter(({ id }) => id !== failure.id),
                      )
                    }
                  >
                    Remove
                  </button>
                </article>
              ))}
            </div>

            <footer className={styles.queueFooter}>
              <div>
                <strong>
                  {Math.min(state.readyCount, 3)} of 3 sources analyzed
                </strong>
                <span>Three gives a noticeably sharper first profile.</span>
              </div>
              <button
                type="button"
                disabled={state.readyCount < 3 || buildingProfile}
                onClick={() => void buildProfile()}
              >
                {buildingProfile ? "Building profile…" : "Review my profile"}
              </button>
            </footer>
          </div>
        ) : null}

        {view === "profile" ? (
          <form
            className={styles.profileBody}
            onSubmit={(event) => {
              event.preventDefault();
              void completeProfile();
            }}
          >
            <div className={styles.draftNotice}>
              <span />
              <p>
                {state.profile
                  ? `Prefilled from ${state.readyCount} analyzed sources.`
                  : "Starting from your own description."}{" "}
                Every field is a draft — corrections become declared evidence.
              </p>
            </div>
            <div className={styles.profileGrid}>
              <label>
                <span>Stage name · declared</span>
                <input
                  required
                  value={profile.stageName}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      stageName: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Disciplines & media · observed</span>
                <input
                  required
                  value={profile.disciplines.join(", ")}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      disciplines: parseList(event.target.value),
                    }))
                  }
                />
                <small>Separate items with commas.</small>
              </label>
              <label>
                <span>Music genres · observed</span>
                <input
                  required
                  value={profile.genres.join(", ")}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      genres: parseList(event.target.value),
                    }))
                  }
                />
              </label>
              <label className={styles.wideField}>
                <span>Creative signature · observed</span>
                <textarea
                  aria-label="Creative signature"
                  required
                  minLength={8}
                  value={profile.creativeSignature}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      creativeSignature: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Themes · to confirm</span>
                <input
                  required
                  value={profile.themes.join(", ")}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      themes: parseList(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                <span>Target audience</span>
                <textarea
                  required
                  minLength={8}
                  value={profile.targetAudience}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      targetAudience: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={`${styles.wideField} ${styles.boundaryField}`}>
                <span>Limits & counter-references · hard rules</span>
                <input
                  value={profile.boundaries.join(", ")}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      boundaries: parseList(event.target.value),
                    }))
                  }
                />
              </label>
            </div>
            <footer className={styles.profileFooter}>
              <span>
                You can refine every dimension later from Creator DNA.
              </span>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() =>
                  setView(state.assets.length ? "upload" : "source")
                }
              >
                Back
              </button>
              <button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Confirm profile"}
              </button>
            </footer>
          </form>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        ) : null}
      </section>
    </main>
  );
}
