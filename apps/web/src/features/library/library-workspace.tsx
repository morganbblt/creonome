"use client";

import {
  AssetDeletionSchema,
  LibraryItemSchema,
  UploadSignResponseSchema,
  type Library,
  type LibraryItem,
} from "@creonome/contracts";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import styles from "./library.module.css";

type Filter = "all" | "uploads" | "music" | "scripts" | "exports" | "docs";

const filterLabels: Record<Filter, string> = {
  all: "All",
  uploads: "Uploads",
  music: "Music",
  scripts: "Scripts",
  exports: "Exports",
  docs: "Docs",
};

function belongs(item: LibraryItem, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "uploads") return item.source === "upload";
  if (filter === "music") return item.kind === "audio";
  if (filter === "scripts") return item.kind === "script";
  if (filter === "exports") return item.kind === "export";
  return item.kind === "document" || item.kind === "image";
}

function formatBytes(value: number | null): string {
  if (value === null) return "text record";
  if (value < 1_000_000) return `${Math.max(1, Math.round(value / 1_000))} KB`;
  return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)} MB`;
}

function formatDuration(value: number | null): string | null {
  if (value === null) return null;
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(value % 60).padStart(2, "0")}`;
}

export function LibraryWorkspace({ library }: { library: Library }) {
  const [items, setItems] = useState(library.items);
  const [totalByteSize, setTotalByteSize] = useState(library.totalByteSize);
  const [filter, setFilter] = useState<Filter>("all");
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<LibraryItem | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const filters = Object.keys(filterLabels) as Filter[];
  const visible = useMemo(
    () => items.filter((item) => belongs(item, filter)),
    [filter, items],
  );

  async function uploadFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      if (file.size > 500_000_000) {
        setError(`${file.name} is larger than the 500 MB upload limit.`);
        continue;
      }
      setError(null);
      try {
        setUploadStage(`Preparing ${file.name}`);
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
        const signed = UploadSignResponseSchema.parse(
          await signResponse.json(),
        );

        setUploadStage(`Uploading ${file.name}`);
        const uploadResponse = await fetch(signed.uploadUrl, {
          method: "PUT",
          headers: signed.headers,
          body: file,
        });
        if (!uploadResponse.ok) throw new Error("upload");

        setUploadStage(`Registering ${file.name}`);
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
        setItems((current) => [
          asset,
          ...current.filter(({ id }) => id !== asset.id),
        ]);
        setTotalByteSize((current) => current + (asset.byteSize ?? 0));
        setFilter("all");
      } catch {
        setError(
          `${file.name} could not be uploaded. No library record was created; try again.`,
        );
      } finally {
        setUploadStage(null);
      }
    }
    if (input.current) input.current.value = "";
  }

  async function deleteSource() {
    if (!deleteCandidate) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/creonome/assets/${deleteCandidate.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setError(
          response.status === 401 || response.status === 403
            ? "Your session expired. Sign in again before deleting this source."
            : "This source could not be deleted. Your private file is still intact.",
        );
        return;
      }
      const receipt = AssetDeletionSchema.safeParse(
        await response.json().catch(() => null),
      );
      if (!receipt.success || receipt.data.id !== deleteCandidate.id) {
        setError(
          "Deletion could not be confirmed. Reload the Library before trying again.",
        );
        return;
      }
      setItems((current) =>
        current.filter(({ id }) => id !== deleteCandidate.id),
      );
      setTotalByteSize((current) =>
        Math.max(0, current - (deleteCandidate.byteSize ?? 0)),
      );
      setDeleteCandidate(null);
    } catch {
      setError(
        "This source could not be deleted. Your private file is still intact.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>PRIVATE CREATIVE STORAGE</p>
          <h1>Library</h1>
          <span>Uploads, generated work and scripts from this workspace.</span>
        </div>
        <div className={styles.storage}>
          <strong>{formatBytes(totalByteSize)}</strong>
          <span>stored privately</span>
        </div>
      </header>

      <section className={styles.library}>
        <div className={styles.toolbar}>
          <div className={styles.filters} aria-label="Library filters">
            {filters.map((item) => {
              const count = items.filter((asset) =>
                belongs(asset, item),
              ).length;
              return (
                <button
                  type="button"
                  key={item}
                  className={
                    filter === item ? styles.activeFilter : styles.filter
                  }
                  aria-pressed={filter === item}
                  onClick={() => setFilter(item)}
                >
                  {filterLabels[item]} {count}
                </button>
              );
            })}
          </div>
          <button
            className={styles.uploadButton}
            type="button"
            onClick={() => input.current?.click()}
          >
            + Upload
          </button>
          <input
            ref={input}
            className={styles.fileInput}
            type="file"
            aria-label="Upload files"
            multiple
            accept="video/*,audio/*,image/*,.pdf,.txt,.md,application/json"
            onChange={(event) => {
              if (event.target.files) void uploadFiles(event.target.files);
            }}
          />
        </div>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {uploadStage ? (
          <div className={styles.uploadProgress} role="status">
            <span />
            <strong>{uploadStage}</strong>
            <small>Encrypted private upload in progress</small>
          </div>
        ) : null}

        <div className={styles.grid}>
          {visible.map((item, index) => (
            <article className={styles.item} key={item.id}>
              <div className={styles.visual} data-kind={item.kind}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.kind.toUpperCase()}</strong>
                {item.durationSeconds ? (
                  <em>{formatDuration(item.durationSeconds)}</em>
                ) : null}
              </div>
              <div className={styles.itemHeader}>
                <div>
                  <h2>{item.name}</h2>
                  <p>
                    {formatBytes(item.byteSize)} · {item.source}
                  </p>
                </div>
                <span data-status={item.status}>{item.status}</span>
              </div>
              <div className={styles.itemFooter}>
                {item.projectId ? (
                  <Link href={`/projects/${item.projectId}`}>
                    Open project ↗
                  </Link>
                ) : (
                  <span className={styles.private}>
                    private workspace asset
                  </span>
                )}
                {item.source === "upload" ? (
                  <button
                    type="button"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => {
                      setError(null);
                      setDeleteCandidate(item);
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </article>
          ))}

          <button
            type="button"
            className={styles.dropzone}
            onClick={() => input.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void uploadFiles(event.dataTransfer.files);
            }}
          >
            <span>＋</span>
            <strong>Drop files here</strong>
            <small>MP4 · MOV · WAV · JPG · PDF · TXT</small>
          </button>
        </div>
      </section>

      {deleteCandidate ? (
        <div className={styles.dialogBackdrop}>
          <section
            className={styles.deleteDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-source-title"
          >
            <p>PRIVATE SOURCE</p>
            <h2 id="delete-source-title">Delete private source?</h2>
            <p>
              <strong>{deleteCandidate.name}</strong> will be removed with its
              stored file and its private analysis. This cannot be undone.
            </p>
            <div>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteCandidate(null)}
              >
                Keep source
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void deleteSource()}
              >
                {deleting ? "Deleting…" : "Delete source permanently"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
