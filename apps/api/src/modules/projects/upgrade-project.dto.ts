import type { UpgradeProjectInput } from "@creonome/contracts";
import { Equals, IsIn } from "class-validator";

export class UpgradeProjectDto implements UpgradeProjectInput {
  @IsIn(["storyboard", "video"])
  targetLevel!: "storyboard" | "video";

  @Equals(true)
  confirmedCreditCost!: true;
}
