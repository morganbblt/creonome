import type {
  OnboardingRepresentativeness,
  UpdateOnboardingAssetInput,
} from "@creonome/contracts";
import { IsIn } from "class-validator";

export class UpdateOnboardingAssetDto implements UpdateOnboardingAssetInput {
  @IsIn(["representative", "not_my_style", "reference_only"])
  representativeness!: OnboardingRepresentativeness;
}
