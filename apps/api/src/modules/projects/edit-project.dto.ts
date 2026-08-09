import type {
  AttachStoryboardSceneAssetInput,
  RegenerateScriptBlockInput,
  RegenerateStoryboardSceneInput,
  ReorderStoryboardScenesInput,
  ScriptBlockField,
} from "@creonome/contracts";
import { SCRIPT_BLOCK_FIELDS } from "@creonome/contracts";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

/**
 * Body for `PATCH /projects/:id/script` (bible §15.3). See
 * ProjectWorkflowService.regenerateScriptBlock for the generation/lock/
 * quality-gate pipeline this feeds.
 */
export class RegenerateScriptBlockDto implements RegenerateScriptBlockInput {
  @IsIn(SCRIPT_BLOCK_FIELDS)
  field!: ScriptBlockField;

  @IsString()
  @MinLength(3)
  @MaxLength(600)
  instruction!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(SCRIPT_BLOCK_FIELDS, { each: true })
  lockedFields: RegenerateScriptBlockInput["lockedFields"] = [];
}

/**
 * Body for `PATCH /projects/:id/storyboard/scenes/:sceneId` (bible §15.4).
 * `lockedFields` are plain STORYBOARD_SCENE_LOCKABLE_FIELDS names
 * (unprefixed — the scene is already scoped by the URL param); the exact
 * allow-list is enforced in ProjectWorkflowService (see locked-fields.ts),
 * same pattern as UpgradeProjectDto.
 */
export class RegenerateStoryboardSceneDto implements RegenerateStoryboardSceneInput {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(600)
  instruction?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(11)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(60, { each: true })
  lockedFields: RegenerateStoryboardSceneInput["lockedFields"] = [];
}

/**
 * Body for `PATCH /projects/:id/storyboard/scenes/reorder`: the storyboard's
 * current scene ids, in their new order.
 */
export class ReorderStoryboardScenesDto implements ReorderStoryboardScenesInput {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsUUID(undefined, { each: true })
  sceneIds!: string[];
}

/**
 * Body for `PATCH /projects/:id/storyboard/scenes/:sceneId/asset` (P2.4):
 * `assetId` is a real workspace Library asset id to attach, or `null` to
 * detach whatever is currently attached. `@ValidateIf` (rather than
 * `@IsOptional`) is deliberate -- the field must always be present and
 * either a UUID or explicit `null`; a missing/`undefined` value is
 * rejected the same as a malformed one.
 */
export class AttachStoryboardSceneAssetDto implements AttachStoryboardSceneAssetInput {
  @ValidateIf((dto: AttachStoryboardSceneAssetDto) => dto.assetId !== null)
  @IsUUID()
  assetId!: string | null;
}
