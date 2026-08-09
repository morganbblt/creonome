"use client";

import {
  AttachStoryboardSceneAssetResultSchema,
  RegenerateStoryboardSceneResultSchema,
  ReorderStoryboardScenesResultSchema,
  type ProjectStoryboard,
} from "@creonome/contracts";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PaperclipIcon,
  SparklesIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Textarea } from "@/src/components/ui/textarea";
import { GenerationToast } from "../generation/generation-toast";
import { AssetPicker } from "./asset-picker";
import {
  STORYBOARD_SCENE_LOCKABLE_FIELDS,
  type StoryboardSceneLockableField,
} from "./storyboard-lock-fields";

function sceneErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "Your session expired. Sign in again before editing the storyboard.";
  }
  if (status === 404) {
    return "This scene is no longer on the storyboard. Reload the project.";
  }
  if (status === 422) {
    return "The AI could not honor a locked field, or the rewrite didn't pass the quality check. Nothing was changed.";
  }
  return "This scene could not be regenerated. Try again.";
}

export function StoryboardEditor({
  projectId,
  storyboard,
}: {
  projectId: string;
  storyboard: ProjectStoryboard;
}) {
  const router = useRouter();
  const persistedOrder = storyboard.scenes.map((scene) => scene.id);
  const [order, setOrder] = useState<string[]>(persistedOrder);
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  // Reset local order whenever a fresh storyboard arrives from the server
  // (a successful reorder or scene regeneration triggers router.refresh()).
  useEffect(() => {
    setOrder(storyboard.scenes.map((scene) => scene.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyboard.id, storyboard.scenes.map((scene) => scene.id).join(",")]);

  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [lockedFields, setLockedFields] = useState<
    Set<StoryboardSceneLockableField>
  >(() => new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pickerSceneId, setPickerSceneId] = useState<string | null>(null);

  const orderedScenes = order
    .map((id) => storyboard.scenes.find((scene) => scene.id === id))
    .filter((scene): scene is (typeof storyboard.scenes)[number] =>
      Boolean(scene),
    );

  async function move(sceneId: string, direction: -1 | 1) {
    const index = order.indexOf(sceneId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target]!, next[index]!];

    const previous = order;
    setOrder(next); // optimistic
    setReordering(true);
    setReorderError(null);
    try {
      const response = await fetch(
        `/api/creonome/projects/${projectId}/storyboard/scenes/reorder`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sceneIds: next }),
        },
      );
      if (!response.ok) {
        setOrder(previous);
        setReorderError("The new scene order could not be saved.");
        return;
      }
      ReorderStoryboardScenesResultSchema.parse(await response.json());
      router.refresh();
    } catch {
      setOrder(previous);
      setReorderError("The new scene order could not be saved.");
    } finally {
      setReordering(false);
    }
  }

  function openSceneEditor(sceneId: string) {
    setEditingSceneId(sceneId);
    setInstruction("");
    setLockedFields(new Set());
    setError(null);
  }

  function toggleLock(field: StoryboardSceneLockableField, checked: boolean) {
    setLockedFields((current) => {
      const next = new Set(current);
      if (checked) next.add(field);
      else next.delete(field);
      return next;
    });
  }

  async function submitSceneEdit() {
    if (!editingSceneId) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/creonome/projects/${projectId}/storyboard/scenes/${editingSceneId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(instruction.trim() ? { instruction: instruction.trim() } : {}),
            lockedFields: [...lockedFields],
          }),
        },
      );
      if (!response.ok) {
        setError(sceneErrorMessage(response.status));
        return;
      }
      RegenerateStoryboardSceneResultSchema.parse(await response.json());
      setEditingSceneId(null);
      setSuccess("Scene regenerated and saved to this project.");
      router.refresh();
    } catch {
      setError("This scene could not be regenerated. Try again.");
    } finally {
      setPending(false);
    }
  }

  const editingScene = orderedScenes.find(
    (scene) => scene.id === editingSceneId,
  );
  const pickerScene = orderedScenes.find((scene) => scene.id === pickerSceneId);

  /**
   * Attaches (or, with `assetId: null`, detaches) a Library asset on one
   * scene via `PATCH .../storyboard/scenes/:sceneId/asset` (P2.4) — a
   * separate, purely mechanical endpoint from the regenerate one above, so
   * picking an asset never triggers an AI rewrite of the scene's content.
   * Returns whether it succeeded; AssetPicker decides how to react.
   */
  async function attachSceneAsset(
    sceneId: string,
    assetId: string | null,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `/api/creonome/projects/${projectId}/storyboard/scenes/${sceneId}/asset`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId }),
        },
      );
      if (!response.ok) return false;
      AttachStoryboardSceneAssetResultSchema.parse(await response.json());
      setSuccess(
        assetId
          ? "Library asset attached to this scene."
          : "Library asset detached from this scene.",
      );
      router.refresh();
      return true;
    } catch {
      return false;
    }
  }

  return (
    <Card
      className="gap-0 overflow-hidden p-0"
      aria-labelledby="storyboard-title"
    >
      <div className="flex min-h-[76px] flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <p className="m-0 mb-1.5 font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase">
            Storyboard · {storyboard.aspectRatio}
          </p>
          <h2
            id="storyboard-title"
            className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-foreground"
          >
            Visual sequence
          </h2>
        </div>
        <span className="font-mono text-[9px] text-muted-foreground uppercase">
          {storyboard.scenes.length} scenes ·{" "}
          {storyboard.durationSeconds ?? "—"} sec
        </span>
      </div>

      {reorderError ? (
        <p
          role="alert"
          className="m-0 px-4.5 pt-3.5 text-[12px] text-destructive"
        >
          {reorderError}
        </p>
      ) : null}

      {/* Horizontal rail on desktop; falls back to a vertical stack below
          760px, matching the other responsive breakpoints already used in
          this codebase (see project-workspace.tsx's max-[620px]/[900px]). */}
      <div
        data-testid="storyboard-rail"
        className="flex gap-3 overflow-x-auto p-4.5 max-[760px]:flex-col max-[760px]:overflow-visible"
      >
        {orderedScenes.map((scene, index) => (
          <article
            className="flex w-72 shrink-0 flex-col gap-2.5 rounded-[8px] border border-border p-3 max-[760px]:w-auto"
            key={scene.id}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
                <span>{String(scene.position).padStart(2, "0")}</span>
                <em className="not-italic">
                  {String(scene.startSeconds).padStart(2, "0")}s →{" "}
                  {String(
                    scene.startSeconds + (scene.durationSeconds ?? 0),
                  ).padStart(2, "0")}
                  s
                </em>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-6"
                  aria-label={`Move scene ${scene.position} earlier`}
                  disabled={index === 0 || reordering}
                  onClick={() => move(scene.id, -1)}
                >
                  <ChevronLeftIcon className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-6"
                  aria-label={`Move scene ${scene.position} later`}
                  disabled={index === orderedScenes.length - 1 || reordering}
                  onClick={() => move(scene.id, 1)}
                >
                  <ChevronRightIcon className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
            <p className="m-0 font-mono text-[8.5px] text-muted-foreground uppercase">
              {scene.shotType ?? "Shot"}
            </p>
            <h3 className="m-0 text-[13px] font-semibold text-foreground">
              {String(scene.position).padStart(2, "0")} · {scene.heading}
            </h3>
            <p className="m-0 text-xs leading-[1.5] text-muted-foreground">
              {scene.description}
            </p>
            {scene.voiceover ? (
              <small className="block font-mono text-[9px] text-muted-foreground/80">
                VO · {scene.voiceover}
              </small>
            ) : null}
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => openSceneEditor(scene.id)}
              >
                <SparklesIcon className="size-3.5" aria-hidden="true" />
                Regenerate this scene
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setPickerSceneId(scene.id)}
              >
                <PaperclipIcon className="size-3.5" aria-hidden="true" />
                {scene.assetId ? "Change attached asset" : "Attach asset"}
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Dialog
        open={editingSceneId !== null}
        onOpenChange={(next) => {
          if (!next) setEditingSceneId(null);
        }}
      >
        <DialogContent aria-label="Regenerate scene">
          <DialogHeader>
            <DialogTitle>
              Regenerate scene{" "}
              {editingScene
                ? String(editingScene.position).padStart(2, "0")
                : ""}
            </DialogTitle>
            <DialogDescription>
              {editingScene
                ? `Currently: "${editingScene.heading}". Lock any field below to keep it unchanged.`
                : "Lock any field below to keep it unchanged."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="Requested change"
            placeholder="e.g. Open on a wider shot instead of a close-up."
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
          />
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="m-0 font-mono text-[9px] tracking-[0.1em] text-muted-foreground uppercase">
              Lock fields to keep them unchanged
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {STORYBOARD_SCENE_LOCKABLE_FIELDS.map((field) => (
                <label
                  key={field}
                  className="flex items-center gap-2 text-[12px] text-foreground"
                >
                  <Checkbox
                    checked={lockedFields.has(field)}
                    onCheckedChange={(checked) =>
                      toggleLock(field, checked === true)
                    }
                  />
                  {field}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingSceneId(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={submitSceneEdit} disabled={pending}>
              {pending ? "Regenerating…" : "Regenerate scene"}
            </Button>
          </DialogFooter>
          {error ? (
            <p role="alert" className="m-0 text-[12px] text-destructive">
              {error}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      <AssetPicker
        open={pickerSceneId !== null}
        currentAssetId={pickerScene?.assetId ?? null}
        onOpenChange={(open) => {
          if (!open) setPickerSceneId(null);
        }}
        onAttach={(assetId) =>
          pickerSceneId
            ? attachSceneAsset(pickerSceneId, assetId)
            : Promise.resolve(false)
        }
      />

      {success ? (
        <div className="px-4.5 pb-4.5">
          <GenerationToast
            state="success"
            title="Storyboard updated"
            detail={success}
            onDismiss={() => setSuccess(null)}
          />
        </div>
      ) : null}
    </Card>
  );
}
