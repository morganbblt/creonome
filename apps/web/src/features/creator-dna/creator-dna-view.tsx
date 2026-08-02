"use client";

import type {
  CreatorDna,
  CreatorDnaTrait,
  MemoryCandidatesResponse,
} from "@creonome/contracts";
import {
  CreatorDnaSchema,
  LibraryItemSchema,
  UploadSignResponseSchema,
} from "@creonome/contracts";
import { useRef, useState } from "react";
import styles from "./creator-dna.module.css";
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
    <main className={styles.page}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div>
            <p>ARTISTIC &amp; CREATIVE MODEL</p>
            <h1>Creator DNA</h1>
            <span>
              {currentDna.confirmed ? "Confirmed" : "Review required"} · version{" "}
              {currentDna.version}
            </span>
          </div>
          <button type="button" onClick={exportJson}>
            Export JSON
          </button>
        </header>

        <div className={styles.content}>
          <section className={styles.summary} aria-label="Creator DNA summary">
            <span>MODEL SUMMARY</span>
            <blockquote>{currentDna.summary}</blockquote>
            <div>
              <strong>{currentDna.traits.length}</strong>
              <small>evidence-backed traits</small>
            </div>
          </section>

          <section
            className={styles.referencePanel}
            aria-labelledby="reference-title"
          >
            <div className={styles.referenceCopy}>
              <span>VEO PEOPLE REFERENCE</span>
              <h2 id="reference-title">Keep the creator recognisable.</h2>
              <p>
                Add one clear portrait. Veo uses it as a private appearance
                reference when a generation includes the creator.
              </p>
            </div>
            {currentDna.peopleReferenceImage ? (
              <div className={styles.referencePreview}>
                <img
                  src={`/api/creonome/assets/${currentDna.peopleReferenceImage.id}/content`}
                  alt={`People reference: ${currentDna.peopleReferenceImage.fileName}`}
                />
                <div>
                  <strong>{currentDna.peopleReferenceImage.fileName}</strong>
                  <small>
                    {Math.max(
                      1,
                      Math.round(
                        currentDna.peopleReferenceImage.byteSize / 1024,
                      ),
                    )}{" "}
                    KB · private workspace asset
                  </small>
                </div>
              </div>
            ) : (
              <div className={styles.referenceEmpty}>
                No reference image yet.
              </div>
            )}
            <div className={styles.referenceActions}>
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
              <button
                disabled={referenceBusy}
                onClick={() => referenceInput.current?.click()}
                type="button"
              >
                {referenceBusy
                  ? "Saving…"
                  : currentDna.peopleReferenceImage
                    ? "Replace image"
                    : "Upload image"}
              </button>
              {currentDna.peopleReferenceImage ? (
                <button
                  className={styles.referenceRemove}
                  disabled={referenceBusy}
                  onClick={() => void clearReferenceImage()}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
            </div>
            {referenceError ? (
              <p className={styles.referenceError} role="alert">
                {referenceError}
              </p>
            ) : null}
          </section>

          <div className={styles.legend}>
            <span>LIVE TRAITS · NEON</span>
            <p>
              Confidence measures the strength of current evidence, not creative
              quality.
            </p>
          </div>

          <div className={styles.grid}>
            {currentDna.traits.map((trait, index) => {
              const confidence =
                trait.confidence === null
                  ? null
                  : Math.round(trait.confidence * 100);
              const evidence = evidenceLabels(trait.evidence);
              return (
                <article className={styles.card} key={trait.id}>
                  <header>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <em>{categoryLabel(trait.category)}</em>
                  </header>
                  <h2>{trait.label}</h2>
                  <p>{trait.value}</p>
                  <div className={styles.confidence}>
                    <span style={{ width: `${confidence ?? 0}%` }} />
                  </div>
                  <strong>
                    {confidence === null
                      ? "Unscored"
                      : `${confidence}% confidence`}
                  </strong>
                  {evidence.length ? (
                    <ul aria-label={`Evidence for ${trait.label}`}>
                      {evidence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <small>
                      Evidence is stored as structured workspace metadata.
                    </small>
                  )}
                </article>
              );
            })}
          </div>

          <MemoryControl initialMemories={memories} />
        </div>
      </section>
    </main>
  );
}
