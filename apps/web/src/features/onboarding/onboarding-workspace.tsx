"use client";

import {
  CreatorDnaSchema,
  CreditsResponseSchema,
  LibraryItemSchema,
  OnboardingCalibrationSetSchema,
  OnboardingStateSchema,
  SubmitOnboardingCalibrationResponsesResultSchema,
  UploadSignResponseSchema,
  type CreatorDna,
  type CreditsResponse,
  type OnboardingAsset,
  type OnboardingCalibrationConcept,
  type OnboardingCalibrationResponseValue,
  type OnboardingProfile,
  type OnboardingRepresentativeness,
  type OnboardingState,
} from "@creonome/contracts";
import {
  BanIcon,
  CameraIcon,
  CircleCheckIcon,
  FileAudioIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  FileVideoIcon,
  Loader2Icon,
  Music2Icon,
  PencilLineIcon,
  RotateCcwIcon,
  SparklesIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/src/components/ui/accordion";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Progress } from "@/src/components/ui/progress";
import { Textarea } from "@/src/components/ui/textarea";
import { AnalyticsEvent, track } from "@/src/lib/analytics/analytics";
import { cn } from "@/src/lib/utils";
import { BrandWordmark } from "../brand/brand-wordmark";
import { OnboardingCalibrationView } from "./onboarding-calibration-view";
import { OnboardingDnaReviewView } from "./onboarding-dna-review-view";
import { OnboardingSummaryView } from "./onboarding-summary-view";

type View =
  "source" | "upload" | "profile" | "dna-review" | "calibration" | "summary";
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

const stepOrder: View[] = [
  "source",
  "upload",
  "profile",
  "dna-review",
  "calibration",
  "summary",
];
const stepTitles: Record<View, string> = {
  source: "Add your sources",
  upload: "Review your sources",
  profile: "Confirm your profile",
  "dna-review": "Review your Creator DNA",
  calibration: "Calibrate your taste",
  summary: "You’re ready",
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

function assetVisual(mimeType: string) {
  if (mimeType.startsWith("video/")) return FileVideoIcon;
  if (mimeType.startsWith("audio/")) return FileAudioIcon;
  if (mimeType.startsWith("image/")) return FileImageIcon;
  if (mimeType === "application/pdf" || mimeType.startsWith("text/"))
    return FileTextIcon;
  return FileIcon;
}

function ProgressHeader({ view }: { view: View }) {
  const stepIndex = stepOrder.indexOf(view);
  const progress = ((stepIndex + 1) / stepOrder.length) * 100;
  return (
    <header className="flex flex-col gap-3 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:gap-4 sm:px-8">
      <div className="flex items-center gap-3">
        <BrandWordmark />
        <span className="border-l border-border pl-3 text-sm font-semibold text-foreground">
          {stepTitles[view]}
        </span>
      </div>
      <div className="flex flex-1 items-center gap-3 sm:justify-end">
        <Progress value={progress} className="h-1.5 max-w-[200px]" />
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
          Step {stepIndex + 1} of {stepOrder.length}
        </span>
      </div>
    </header>
  );
}

function AssetStatusBadge({ status }: { status: OnboardingAsset["status"] }) {
  if (status === "analyzing") {
    return (
      <Badge className="border-transparent bg-accent-soft text-accent-soft-foreground">
        <Loader2Icon className="animate-spin" /> Analyzing
      </Badge>
    );
  }
  if (status === "ready") {
    return (
      <Badge variant="success">
        <CircleCheckIcon /> Analyzed
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive">
        <TriangleAlertIcon /> Failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <UploadCloudIcon /> Needs analysis
    </Badge>
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

  const [dna, setDna] = useState<CreatorDna | null>(null);
  const [dnaLoading, setDnaLoading] = useState(false);
  const [dnaError, setDnaError] = useState<string | null>(null);

  const [calibrationConcepts, setCalibrationConcepts] = useState<
    OnboardingCalibrationConcept[]
  >([]);
  const [calibrationResponses, setCalibrationResponses] = useState<
    Record<string, OnboardingCalibrationResponseValue>
  >({});
  const [calibrationLoading, setCalibrationLoading] = useState(false);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [calibrationSubmitting, setCalibrationSubmitting] = useState(false);

  const [credits, setCredits] = useState<CreditsResponse | null>(null);
  const [finishing, setFinishing] = useState(false);

  const assetsImportedTracked = useRef(initialState.assets.length >= 3);
  const dnaConfirmedTracked = useRef(false);

  // Activation event: onboarding started. Fires once, only when this
  // creator is genuinely arriving at the first step -- reloading mid-flow
  // (e.g. resuming at "upload" or "profile") is not a new onboarding start.
  useEffect(() => {
    if (initialView(initialState) === "source") {
      track(AnalyticsEvent.OnboardingStarted);
    }
    // Mount-only: initialState is the prop this component was created with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Activation event: at least 3 assets imported. Fires once, the first
  // time the imported-asset count crosses the threshold the product bible
  // uses for a "noticeably sharper profile" (see footerHint below).
  useEffect(() => {
    if (assetsImportedTracked.current) return;
    if (state.assets.length >= 3) {
      assetsImportedTracked.current = true;
      track(AnalyticsEvent.OnboardingAssetsImported, {
        assetCount: state.assets.length,
      });
    }
  }, [state.assets.length]);

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

  async function removeAsset(assetId: string) {
    setBusyAsset(assetId);
    setError(null);
    try {
      const response = await fetch(
        `/api/creonome/assets/${encodeURIComponent(assetId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("remove");
      await refreshState();
      setNotice("Source removed. Its derived evidence was removed too.");
    } catch {
      setError("The source could not be removed. Nothing was deleted.");
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
      setNotice("Profile saved. Building your Creator DNA…");
      setView("dna-review");
      void loadCreatorDna();
    } catch {
      setError(
        "Your profile wasn’t saved. Your draft is still here — try again.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function loadCreatorDna() {
    setDnaLoading(true);
    setDnaError(null);
    try {
      const response = await fetch("/api/creonome/creator-dna", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("dna");
      setDna(CreatorDnaSchema.parse(await response.json()));
    } catch {
      setDnaError(
        "We couldn’t load your Creator DNA. Your confirmed profile is intact — try again.",
      );
    } finally {
      setDnaLoading(false);
    }
  }

  async function startCalibration() {
    // Activation event: DNA confirmed. This is the "Continue" action off
    // the post-profile DNA review step -- fires once even if the creator
    // navigates back to that step and continues again.
    if (!dnaConfirmedTracked.current) {
      dnaConfirmedTracked.current = true;
      track(AnalyticsEvent.CreatorDnaConfirmed, {
        traitCount: dna?.traits.length ?? 0,
      });
    }
    setView("calibration");
    // Already generated once (e.g. the creator went back and forward
    // between dna-review and calibration) -- don't regenerate and lose
    // their in-progress responses.
    if (calibrationConcepts.length > 0) return;
    setCalibrationLoading(true);
    setCalibrationError(null);
    try {
      const response = await fetch("/api/creonome/onboarding/calibration", {
        method: "POST",
      });
      if (!response.ok) throw new Error("calibration");
      const parsed = OnboardingCalibrationSetSchema.parse(
        await response.json(),
      );
      setCalibrationConcepts(parsed.concepts);
    } catch {
      setCalibrationError(
        "We couldn’t generate calibration concepts. Your profile is intact — try again, or continue without answering.",
      );
    } finally {
      setCalibrationLoading(false);
    }
  }

  function respondToCalibration(
    conceptId: string,
    response: OnboardingCalibrationResponseValue,
  ) {
    setCalibrationResponses((current) => ({
      ...current,
      [conceptId]: response,
    }));
  }

  async function loadCredits() {
    try {
      const response = await fetch("/api/creonome/credits", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("credits");
      setCredits(CreditsResponseSchema.parse(await response.json()));
    } catch {
      setCredits(null);
    }
  }

  /**
   * Calibration responses are supplementary signal (fed into memory
   * candidates, see onboarding.service.ts's submitCalibrationResponses),
   * not a gate on completing onboarding -- onboarding itself already
   * completed when the profile was confirmed. A save failure here shows a
   * notice but still lets the creator continue to their workspace.
   */
  async function continueFromCalibration() {
    setCalibrationSubmitting(true);
    setCalibrationError(null);
    try {
      const responses = calibrationConcepts.flatMap((concept) => {
        const response = calibrationResponses[concept.id];
        return response
          ? [
              {
                conceptId: concept.id,
                title: concept.title,
                description: concept.description,
                response,
              },
            ]
          : [];
      });
      if (responses.length > 0) {
        const response = await fetch(
          "/api/creonome/onboarding/calibration/responses",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ responses }),
          },
        );
        if (!response.ok) throw new Error("calibration-responses");
        SubmitOnboardingCalibrationResponsesResultSchema.parse(
          await response.json(),
        );
      }
    } catch {
      setCalibrationError(
        "Your calibration responses weren’t saved, but you can continue.",
      );
    } finally {
      setCalibrationSubmitting(false);
    }
    setView("summary");
    void loadCredits();
  }

  function finishOnboarding() {
    setFinishing(true);
    setNotice("Opening your workspace…");
    router.push("/today");
  }

  const footerHint =
    state.readyCount === 0
      ? "Analyze at least one source to continue."
      : state.readyCount < 3
        ? "You can continue now — three sources gives a noticeably sharper profile."
        : "Great coverage. Ready when you are.";

  return (
    <main className="grid min-h-svh place-items-center bg-card p-0 sm:bg-background sm:p-6 lg:p-10">
      <input
        ref={input}
        className="sr-only"
        type="file"
        aria-label="Upload source files"
        multiple
        accept="video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,image/png,image/jpeg,application/pdf,text/plain,.mov,.mp3,.wav,.txt"
        onChange={(event) => {
          if (event.target.files) void uploadFiles(event.target.files);
        }}
      />
      <section
        className="min-h-svh w-full overflow-hidden bg-card sm:min-h-0 sm:max-w-[900px] sm:rounded-panel sm:border sm:border-border sm:shadow-lg"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void uploadFiles(event.dataTransfer.files);
        }}
      >
        <ProgressHeader view={view} />

        {view === "source" ? (
          <div className="space-y-8 px-6 py-8 sm:px-8 sm:py-10">
            <div className="max-w-xl space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Your creative operating system
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Let’s start with what already sounds like you.
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Pick any route. Every source stays private, and you can add more
                later.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-3 rounded-card border border-accent/50 bg-accent-soft p-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-control bg-card text-accent shadow-sm">
                    <UploadCloudIcon className="size-[18px]" />
                  </span>
                  <div className="flex flex-1 items-center justify-between gap-2">
                    <strong className="text-sm font-semibold text-foreground">
                      Import files
                    </strong>
                    <Badge variant="accent">Fastest</Badge>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Drop videos, voice notes, stems, lyrics or references. No
                  social account needed.
                </p>
                <p className="text-[11px] font-medium text-accent-soft-foreground">
                  MP4 · MOV · MP3 · WAV · PDF · TXT
                </p>
                <Button
                  type="button"
                  className="mt-auto"
                  onClick={() => input.current?.click()}
                >
                  Choose files
                </Button>
              </div>

              <div className="flex flex-col gap-3 rounded-card border border-dashed border-border p-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-control bg-secondary text-muted-foreground">
                    <PencilLineIcon className="size-[18px]" />
                  </span>
                  <strong className="text-sm font-semibold text-foreground">
                    Describe myself instead
                  </strong>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Fill the profile by hand. It sharpens as you accept or reject
                  work.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-auto"
                  onClick={() => {
                    setProfile(emptyProfile);
                    setView("profile");
                  }}
                >
                  Continue manually
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-card border border-dashed border-border bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Prefer to connect an account? Social import is on its way.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  aria-label="TikTok · Coming soon"
                  className="gap-1.5 text-muted-foreground"
                >
                  <Music2Icon /> TikTok
                  <Badge variant="outline">Soon</Badge>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  aria-label="Instagram · Coming soon"
                  className="gap-1.5 text-muted-foreground"
                >
                  <CameraIcon /> Instagram
                  <Badge variant="outline">Soon</Badge>
                </Button>
              </div>
            </div>

            <p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground/80">
              Imported media builds your profile and nothing else. Delete a
              source and its derived evidence goes with it.
            </p>
          </div>
        ) : null}

        {view === "upload" ? (
          <div className="space-y-5 px-6 py-8 sm:px-8 sm:py-10">
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex w-full items-center gap-4 rounded-panel border border-dashed border-border bg-secondary/40 p-5 text-left transition-colors hover:border-accent/60 hover:bg-accent-soft/40"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-control bg-card text-muted-foreground shadow-sm">
                <UploadCloudIcon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold text-foreground">
                  Drop more anywhere on this panel
                </strong>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  MP4 MOV WEBM MP3 WAV PNG JPG PDF TXT · up to 8
                </span>
              </div>
              <span className="hidden shrink-0 rounded-control border border-input bg-card px-3.5 py-2 text-xs font-semibold text-foreground sm:inline-flex">
                Browse
              </span>
            </button>

            {activeUploads > 0 ? (
              <p
                role="status"
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
              >
                <Loader2Icon className="size-3.5 animate-spin text-accent" />
                Uploading and analyzing {activeUploads} source
                {activeUploads === 1 ? "" : "s"}…
              </p>
            ) : null}

            <div className="space-y-2.5">
              {state.assets.map((asset) => {
                const Visual = assetVisual(asset.mimeType);
                return (
                  <article
                    key={asset.id}
                    data-status={asset.status}
                    className={cn(
                      "flex flex-col gap-3 rounded-card border border-border bg-card p-4 sm:flex-row sm:items-start",
                      asset.status === "failed" &&
                        "border-destructive/40 bg-destructive/5",
                    )}
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-control bg-secondary text-muted-foreground">
                      <Visual className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="truncate text-sm font-semibold text-foreground">
                          {asset.fileName}
                        </strong>
                        <AssetStatusBadge status={asset.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(asset.byteSize)} ·{" "}
                        {fileExtension(asset.fileName).toUpperCase()}
                      </p>
                      {asset.status === "analyzing" ? (
                        <div
                          aria-hidden="true"
                          className="h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-secondary"
                        >
                          <div className="h-full w-2/3 animate-pulse rounded-full bg-accent" />
                        </div>
                      ) : null}
                      {asset.errorMessage ? (
                        <p className="text-xs text-destructive">
                          {asset.errorMessage}
                        </p>
                      ) : null}
                      {asset.analysis ? (
                        <Accordion
                          type="single"
                          collapsible
                          defaultValue="evidence"
                          className="rounded-control border border-border bg-secondary/40 px-3"
                        >
                          <AccordionItem
                            value="evidence"
                            className="border-b-0"
                          >
                            <AccordionTrigger className="py-2.5 text-xs font-medium text-foreground">
                              {asset.analysis.summary}
                            </AccordionTrigger>
                            <AccordionContent className="pb-2.5">
                              <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                                {asset.analysis.evidence.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                      {asset.status === "ready" ? (
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {(
                            Object.keys(
                              representationLabels,
                            ) as OnboardingRepresentativeness[]
                          ).map((value) => (
                            <Button
                              type="button"
                              key={value}
                              variant="outline"
                              size="sm"
                              aria-pressed={asset.representativeness === value}
                              disabled={busyAsset === asset.id}
                              className={cn(
                                "h-7 rounded-full px-3 text-[11px] font-medium",
                                asset.representativeness === value &&
                                  "border-transparent bg-accent-soft text-accent-soft-foreground hover:bg-accent-soft",
                              )}
                              onClick={() =>
                                void updateRepresentation(asset.id, value)
                              }
                            >
                              {representationLabels[value]}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex justify-end gap-1.5">
                        {asset.status === "uploaded" ||
                        asset.status === "failed" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busyAsset === asset.id}
                            onClick={() => void retryAnalysis(asset.id)}
                          >
                            {busyAsset === asset.id ? (
                              <Loader2Icon className="animate-spin" />
                            ) : (
                              <RotateCcwIcon />
                            )}
                            Try analysis again
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={busyAsset === asset.id}
                          onClick={() => void removeAsset(asset.id)}
                        >
                          {busyAsset === asset.id ? (
                            <Loader2Icon className="animate-spin" />
                          ) : (
                            <Trash2Icon />
                          )}
                          Remove source
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {failures.map((failure) => (
                <div
                  key={failure.id}
                  className="flex items-start gap-3 rounded-card border border-destructive/30 bg-destructive/5 p-4"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-control bg-card text-destructive">
                    <TriangleAlertIcon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-semibold text-foreground">
                      {failure.fileName}
                    </strong>
                    <p className="mt-0.5 text-xs text-destructive">
                      {failure.message}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFailures((current) =>
                        current.filter(({ id }) => id !== failure.id),
                      )
                    }
                  >
                    <XIcon /> Remove
                  </Button>
                </div>
              ))}
            </div>

            <footer className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="block text-sm font-semibold text-foreground">
                  {Math.min(state.readyCount, 3)} of 3 sources analyzed
                </strong>
                <span className="text-xs text-muted-foreground">
                  {footerHint}
                </span>
              </div>
              <Button
                type="button"
                disabled={state.readyCount < 1 || buildingProfile}
                onClick={() => void buildProfile()}
              >
                {buildingProfile ? (
                  <>
                    <Loader2Icon className="animate-spin" /> Building profile…
                  </>
                ) : (
                  "Review my profile"
                )}
              </Button>
            </footer>
          </div>
        ) : null}

        {view === "profile" ? (
          <form
            className="space-y-6 px-6 py-8 sm:px-8 sm:py-10"
            onSubmit={(event) => {
              event.preventDefault();
              void completeProfile();
            }}
          >
            <Alert variant="accent">
              <SparklesIcon />
              <AlertDescription>
                {state.profile
                  ? `Prefilled from ${state.readyCount} analyzed source${state.readyCount === 1 ? "" : "s"}.`
                  : "Starting from your own description."}{" "}
                Every field is a draft — corrections become declared evidence.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="stageName">
                  Stage name{" "}
                  <span className="font-normal text-muted-foreground">
                    · declared
                  </span>
                </Label>
                <Input
                  id="stageName"
                  required
                  value={profile.stageName}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      stageName: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="disciplines">
                  Disciplines & media{" "}
                  <span className="font-normal text-muted-foreground">
                    · observed
                  </span>
                </Label>
                <Input
                  id="disciplines"
                  required
                  value={profile.disciplines.join(", ")}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      disciplines: parseList(event.target.value),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Separate items with commas.
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="genres">
                  Music genres{" "}
                  <span className="font-normal text-muted-foreground">
                    · observed
                  </span>
                </Label>
                <Input
                  id="genres"
                  required
                  value={profile.genres.join(", ")}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      genres: parseList(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="creativeSignature">
                  Creative signature{" "}
                  <span className="font-normal text-muted-foreground">
                    · observed
                  </span>
                </Label>
                <Textarea
                  id="creativeSignature"
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
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="themes">
                  Themes{" "}
                  <span className="font-normal text-muted-foreground">
                    · to confirm
                  </span>
                </Label>
                <Input
                  id="themes"
                  required
                  value={profile.themes.join(", ")}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      themes: parseList(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="targetAudience">Target audience</Label>
                <Textarea
                  id="targetAudience"
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
              </div>

              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="boundaries" className="gap-1.5">
                  <BanIcon className="size-3.5 text-muted-foreground" />
                  Limits & counter-references{" "}
                  <span className="font-normal text-muted-foreground">
                    · hard rules
                  </span>
                </Label>
                <Input
                  id="boundaries"
                  value={profile.boundaries.join(", ")}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      boundaries: parseList(event.target.value),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  The AI treats these as non-negotiable — separate with commas.
                </p>
              </div>
            </div>

            <footer className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
              <span className="text-xs text-muted-foreground sm:flex-1">
                You can refine every dimension later from Creator DNA.
              </span>
              <div className="flex gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setView(state.assets.length ? "upload" : "source")
                  }
                >
                  Back
                </Button>
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? (
                    <>
                      <Loader2Icon className="animate-spin" /> Saving…
                    </>
                  ) : (
                    "Confirm profile"
                  )}
                </Button>
              </div>
            </footer>
          </form>
        ) : null}

        {view === "dna-review" ? (
          <OnboardingDnaReviewView
            dna={dna}
            error={dnaError}
            loading={dnaLoading}
            onBack={() => setView("profile")}
            onContinue={() => void startCalibration()}
          />
        ) : null}

        {view === "calibration" ? (
          <OnboardingCalibrationView
            concepts={calibrationConcepts}
            error={calibrationError}
            loading={calibrationLoading}
            onBack={() => setView("dna-review")}
            onContinue={() => void continueFromCalibration()}
            onRespond={respondToCalibration}
            responses={calibrationResponses}
            submitting={calibrationSubmitting}
          />
        ) : null}

        {view === "summary" ? (
          <OnboardingSummaryView
            credits={credits}
            error={null}
            generating={finishing}
            onGenerate={finishOnboarding}
            profile={profile}
          />
        ) : null}

        {error ? (
          <div className="px-6 pb-6 sm:px-8 sm:pb-8">
            <Alert variant="destructive" role="alert">
              <TriangleAlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : null}
        {notice ? (
          <div className="px-6 pb-6 sm:px-8 sm:pb-8">
            <Alert
              role="status"
              className="border-success/25 bg-success/8 text-success [&>svg]:text-success"
            >
              <CircleCheckIcon />
              <AlertDescription className="text-success">
                {notice}
              </AlertDescription>
            </Alert>
          </div>
        ) : null}
      </section>
    </main>
  );
}
