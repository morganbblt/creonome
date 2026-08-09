import type { UpgradeProjectInput } from "@creonome/contracts";
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpgradeProjectDto implements UpgradeProjectInput {
  @IsIn(["storyboard", "video"])
  targetLevel!: "storyboard" | "video";

  @Equals(true)
  confirmedCreditCost!: true;

  /**
   * Field-name strings the caller wants preserved verbatim across this
   * regeneration (bible §9.6), e.g. "title" or "scene:2:voiceover" for a
   * storyboard, "durationSeconds" for a video. Which names are actually
   * legal depends on `targetLevel` and is enforced in
   * ProjectWorkflowService (see locked-fields.ts) rather than here, since
   * class-validator decorators can't easily express a cross-field rule.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(120, { each: true })
  lockedFields: UpgradeProjectInput["lockedFields"] = [];
}
