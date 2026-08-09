"use client";

import {
  LibraryItemSchema,
  LibrarySchema,
  UploadSignResponseSchema,
  type LibraryItem,
} from "@creonome/contracts";
import {
  CheckCircle2Icon,
  FileTextIcon,
  FileVideoIcon,
  ImageIcon,
  Loader2Icon,
  Music2Icon,
  ScrollTextIcon,
  UploadIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { cn } from "@/src/lib/utils";

const kindIcons: Record<
  LibraryItem["kind"],
  ComponentType<{ className?: string }>
> = {
  video: VideoIcon,
  audio: Music2Icon,
  image: ImageIcon,
  document: FileTextIcon,
  script: ScrollTextIcon,
  export: FileVideoIcon,
};

/**
 * The one asset picker for the storyboard scene editor (P2.4). Lists the
 * workspace's Library (reusing `GET /api/v1/assets`, the same list the
 * Library page itself reads), lets the caller select an existing asset or
 * upload a new one, and reuses the exact sign-upload-register flow already
 * used by LibraryWorkspace and the onboarding upload queue (no second
 * upload mechanism) -- `POST /api/creonome/uploads/sign` for a signed GCS
 * URL, a direct `PUT` to that URL, then `POST /api/creonome/assets` to
 * register the source asset.
 *
 * `onAttach` is the only side effect this component performs on the
 * caller's behalf: it never knows which project/scene it's attaching to,
 * so the same picker can be reused anywhere a "pick or upload a Library
 * asset" affordance is needed later.
 */
export function AssetPicker({
  open,
  currentAssetId,
  onOpenChange,
  onAttach,
}: {
  open: boolean;
  currentAssetId: string | null;
  onOpenChange: (open: boolean) => void;
  /** Performs the actual attach/detach call; returns whether it succeeded. */
  onAttach: (assetId: string | null) => Promise<boolean>;
}) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // The id of the row currently being acted on ("upload" while a new file
  // is being signed/uploaded/registered, "detach" while clearing the
  // scene's asset, or a real asset id while attaching that asset). `null`
  // means no action is in flight.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setItems(null);
    setLoadError(null);
    setActionError(null);
    fetch("/api/creonome/assets")
      .then((response) => {
        if (!response.ok) throw new Error("list");
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        setItems(LibrarySchema.parse(payload).items);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("The Library could not be loaded. Try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function select(assetId: string | null) {
    setActionError(null);
    setPendingId(assetId ?? "detach");
    try {
      const ok = await onAttach(assetId);
      if (ok) {
        onOpenChange(false);
      } else {
        setActionError("This asset could not be attached to the scene.");
      }
    } catch {
      setActionError("This asset could not be attached to the scene.");
    } finally {
      setPendingId(null);
    }
  }

  async function uploadAndAttach(file: File) {
    setActionError(null);
    setPendingId("upload");
    try {
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
      setItems((current) => [
        asset,
        ...(current ?? []).filter(({ id }) => id !== asset.id),
      ]);
      await select(asset.id);
    } catch {
      setActionError(`${file.name} could not be uploaded to the Library.`);
      setPendingId(null);
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Attach a Library asset">
        <DialogHeader>
          <DialogTitle>Attach a Library asset</DialogTitle>
          <DialogDescription>
            Pick an existing asset from this workspace&apos;s Library, or upload
            a new one.
          </DialogDescription>
        </DialogHeader>

        {loadError ? (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}
        {actionError ? (
          <Alert variant="destructive">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => input.current?.click()}
            disabled={pendingId !== null}
          >
            {pendingId === "upload" ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <UploadIcon />
            )}
            Upload new asset
          </Button>
          <input
            ref={input}
            type="file"
            className="sr-only"
            aria-label="Upload a new asset"
            accept="video/*,audio/*,image/*,.pdf,.txt,.md"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadAndAttach(file);
            }}
          />
          {currentAssetId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void select(null)}
              disabled={pendingId !== null}
            >
              {pendingId === "detach" ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <XIcon />
              )}
              Detach current asset
            </Button>
          ) : null}
        </div>

        <div
          className="max-h-72 overflow-y-auto rounded-control border border-border"
          role="list"
          aria-label="Library assets"
        >
          {items === null ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              The Library is empty. Upload an asset to attach it here.
            </p>
          ) : (
            items.map((item) => {
              const Icon = kindIcons[item.kind];
              const selected = item.id === currentAssetId;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="listitem"
                  className={cn(
                    "flex w-full items-center gap-2.5 border-b border-border px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-secondary/60 disabled:opacity-60",
                    selected && "bg-accent-soft",
                  )}
                  onClick={() => void select(item.id)}
                  disabled={pendingId !== null}
                >
                  <Icon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  {pendingId === item.id ? (
                    <Loader2Icon
                      className="size-4 shrink-0 animate-spin text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : selected ? (
                    <CheckCircle2Icon
                      className="size-4 shrink-0 text-accent"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
