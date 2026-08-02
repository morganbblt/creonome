import type { UpdatePrivacyPreferencesInput } from "@creonome/contracts";
import { IsBoolean } from "class-validator";

export class UpdatePrivacyPreferencesDto implements UpdatePrivacyPreferencesInput {
  @IsBoolean()
  modelTrainingOptIn!: boolean;

  @IsBoolean()
  keepRushesAfterExport!: boolean;
}
