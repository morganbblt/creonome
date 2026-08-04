"use client";

import type {
  CreatorDna,
  CreatorDnaTrait,
  MemoryCandidatesResponse,
} from "@creonome/contracts";
import {
  CreatorDnaSchema,
  LibraryItemSchema,
  UpdateCreatorDnaTraitInputSchema,
  UploadSignResponseSchema,
} from "@creonome/contracts";
import {
  DownloadIcon,
  ImageIcon,
  PencilIcon,
  TriangleAlertIcon,
  UploadIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Avatar, AvatarImage } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Progress } from "@/src/components/ui/progress";
import { Textarea } from "@/src/components/ui/textarea";
import { MemoryControl } from "./memory-control";

function categoryLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function evidenceLabels(evidence: CreatorDnaTrait["evidence"]): string[] {
  return Object.values(evidence)
    .flatMap((value) =>
      typeof value === "string"
        ? [value]
        : Array.isArray(value)
          ? value.filter((item): item is string => typeof item === "string")
          : [],
    )
    .slice(0, 3);
}

const referenceMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const referenceMaxBytes = 20 * 1024 * 1024;

export function CreatorDnaView({
  dna,
  memories,
}: {
  dna: CreatorDna;
  memories: MemoryCandidatesResponse | null;
}) {
  const [currentDna, setCurrentDna] = useState(dna);
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [editingTraitId, setEditingTraitId] = useState<string | null>(null);
  const [traitDraft, setTraitDraft] = useState("");
  const [traitBusy, setTraitBusy] = useState(false);
  const [traitError, setTraitError] = useState<string | null>(null);
  const referenceInput = useRef<HTMLInputElement>(null);

  async function uploadReferenceImage(file: File) {
    setReferenceError(null);
    if (!referenceMimeTypes.has(file.type)) {
      setReferenceError("Use a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > referenceMaxBytes) {
      setReferenceError("Reference images must be smaller than 20 MB.");
      return;
    }
    setReferenceBusy(true);
    try {
      const signResponse = await fetch("/api/creonome/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
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

      const registrationResponse = await fetch("/api/creonome/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          byteSize: file.size,
          gcsUri: signed.gcsUri,
        }),
      });
      if (!registrationResponse.ok) throw new Error("register");
      const asset = LibraryItemSchema.parse(await registrationResponse.json());

      const referenceResponse = await fetch(
        "/api/creonome/creator-dna/reference-image",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId: asset.id }),
        },
      );
      if (!referenceResponse.ok) throw new Error("reference");
      setCurrentDna(CreatorDnaSchema.parse(await referenceResponse.json()));
    } catch {
      setReferenceError(
        "The image could not be saved. Your existing Creator DNA is intact.",
      );
    } finally {
      setReferenceBusy(false);
    }
  }

  async function clearReferenceImage() {
    setReferenceBusy(true);
    setReferenceError(null);
    try {
      const response = await fetch(
        "/api/creonome/creator-dna/reference-image",
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("clear");
      setCurrentDna(CreatorDnaSchema.parse(await response.json()));
    } catch {
      setReferenceError("The reference image could not be removed. Try again.");
    } finally {
      setReferenceBusy(false);
    }
  }

  function startTraitEdit(trait: CreatorDnaTrait) {
    setTraitError(null);
    setEditingTraitId(trait.id);
    setTraitDraft(trait.value);
  }

  function cancelTraitEdit() {
    setEditingTraitId(null);
    setTraitDraft("");
    setTraitError(null);
  }

  async function saveTraitEdit(traitId: string) {
    const parsed = UpdateCreatorDnaTraitInputSchema.safeParse({
      value: traitDraft,
    });
    if (!parsed.success) {
      setTraitError("Add a short correction before saving.");
      return;
    }
    setTraitBusy(true);
    setTraitError(null);
    try {
      const response = await fetch(
        `/api/creonome/creator-dna/traits/${encodeURIComponent(traitId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      if (!response.ok) throw new Error("trait");
      setCurrentDna(CreatorDnaSchema.parse(await response.json()));
      cancelTraitEdit();
    } catch {
      setTraitError(
        "The correction could not be saved. Your previous DNA version is intact.",
      );
    } finally {
      setTraitBusy(false);
    }
  }

  function exportJson() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(currentDna, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `creonome-creator-dna-v${currentDna.version}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5.5 pt-8 pb-16 max-[620px]:px-3.5 max-[620px]:pt-6 max-[620px]:pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground max-[620px]:text-2xl">
            Creator DNA
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
            The evidence-backed traits, guardrails and memory that shape every
            generation Creonome makes for you.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge variant={currentDna.confirmed ? "success" : "outline"}>
              {currentDna.confirmed ? "Confirmed" : "Review required"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Version {currentDna.version}
            </span>
          </div>
          <Button
            onClick={exportJson}
            size="sm"
            type="button"
            variant="outline"
          >
            <DownloadIcon />
            Export JSON
          </Button>
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <p className="flex-1 text-xl leading-snug font-medium tracking-tight text-foreground">
            {currentDna.summary}
          </p>
          <div className="flex shrink-0 items-baseline gap-2 border-t border-border pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
            <span className="font-mono text-3xl font-semibold text-foreground">
              {currentDna.traits.length}
            </span>
            <span className="text-xs text-muted-foreground">
              evidence-backed traits
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Veo people reference</CardTitle>
          <CardDescription>
            Add one clear portrait. Veo uses it as a private appearance
            reference when a generation includes the creator.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {currentDna.peopleReferenceImage ? (
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-14 border border-border">
                  <AvatarImage
                    alt={`People reference: ${currentDna.peopleReferenceImage.fileName}`}
                    src={`/api/creonome/assets/${currentDna.peopleReferenceImage.id}/content`}
                  />
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {currentDna.peopleReferenceImage.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.max(
                      1,
                      Math.round(
                        currentDna.peopleReferenceImage.byteSize / 1024,
                      ),
                    )}{" "}
                    KB · private workspace asset
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="grid size-14 shrink-0 place-items-center rounded-full border border-dashed border-border bg-secondary/60"
                >
                  <ImageIcon className="size-5" />
                </span>
                No reference image yet.
              </div>
            )}
            <div className="flex shrink-0 items-center gap-2">
              <input
                ref={referenceInput}
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void uploadReferenceImage(file);
                }}
                type="file"
              />
              <Button
                disabled={referenceBusy}
                onClick={() => referenceInput.current?.click()}
                size="sm"
                type="button"
                variant="outline"
              >
                <UploadIcon />
                {referenceBusy
                  ? "Saving…"
                  : currentDna.peopleReferenceImage
                    ? "Replace image"
                    : "Upload image"}
              </Button>
              {currentDna.peopleReferenceImage ? (
                <Button
                  disabled={referenceBusy}
                  onClick={() => void clearReferenceImage()}
                  size="sm"
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
          {referenceError ? (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{referenceError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-8 mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Traits
        </h2>
        <p className="text-xs text-muted-foreground">
          Confidence measures the strength of current evidence, not creative
          quality.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {currentDna.traits.map((trait) => {
          const confidence =
            trait.confidence === null
              ? null
              : Math.round(trait.confidence * 100);
          const evidence = evidenceLabels(trait.evidence);
          const isEditing = editingTraitId === trait.id;
          return (
            <Card key={trait.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">
                    {categoryLabel(trait.category)}
                  </Badge>
                  <Button
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    disabled={traitBusy}
                    onClick={() => startTraitEdit(trait)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <PencilIcon className="size-3.5" />
                    Edit
                  </Button>
                </div>
                <h3 className="text-[15px] leading-tight font-semibold tracking-tight text-foreground">
                  {trait.label}
                </h3>
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      aria-label={`Edit ${trait.label}`}
                      autoFocus
                      maxLength={500}
                      onChange={(event) => setTraitDraft(event.target.value)}
                      value={traitDraft}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        disabled={traitBusy}
                        onClick={() => void saveTraitEdit(trait.id)}
                        size="sm"
                        type="button"
                      >
                        {traitBusy ? "Saving…" : "Save correction"}
                      </Button>
                      <Button
                        disabled={traitBusy}
                        onClick={cancelTraitEdit}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                    </div>
                    {traitError ? (
                      <p className="text-xs text-destructive" role="alert">
                        {traitError}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="min-h-[3.4em] text-sm leading-relaxed text-muted-foreground">
                    {trait.value}
                  </p>
                )}

                <div className="flex flex-col gap-1.5">
                  <Progress className="h-1" value={confidence ?? 0} />
                  <span className="text-xs font-medium text-muted-foreground">
                    {confidence === null
                      ? "Unscored"
                      : `${confidence}% confidence`}
                  </span>
                </div>

                {evidence.length ? (
                  <div
                    aria-label={`Evidence for ${trait.label}`}
                    className="flex flex-wrap gap-1.5"
                  >
                    {evidence.map((item) => (
                      <Badge className="font-normal" key={item}>
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Evidence is stored as structured workspace metadata.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <MemoryControl initialMemories={memories} />
    </main>
  );
}
