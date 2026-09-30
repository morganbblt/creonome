import type { UpdateCreditSpendCapInput } from "@creonome/contracts";
import { IsInt, Min, ValidateIf } from "class-validator";

/**
 * Body for `PUT /credits/spend-cap` (bible §12.3 "Permettre un plafond par
 * génération"). `spendCap` is a positive integer ceiling on the credits a
 * single generation reservation may claim, or explicit `null` to remove
 * the cap. `@ValidateIf` (rather than `@IsOptional`) is deliberate — the
 * field must always be present and either a positive integer or explicit
 * `null`, same pattern as `AttachStoryboardSceneAssetDto`.
 */
export class UpdateCreditSpendCapDto implements UpdateCreditSpendCapInput {
  @ValidateIf((dto: UpdateCreditSpendCapDto) => dto.spendCap !== null)
  @IsInt()
  @Min(1)
  spendCap!: number | null;
}
