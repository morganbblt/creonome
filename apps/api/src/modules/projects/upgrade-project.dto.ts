import type { UpgradeProjectInput } from "@creonome/contracts";
import { Equals, IsIn } from "class-validator";

export class UpgradeProjectDto implements UpgradeProjectInput {
  @IsIn(["storyboard"])
  targetLevel!: "storyboard";

  @Equals(true)
  confirmedCreditCost!: true;
}
