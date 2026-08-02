import { Equals, IsIn } from "class-validator";
import type { UpgradeOpportunityInput } from "@creonome/contracts";

export class UpgradeOpportunityDto implements UpgradeOpportunityInput {
  @IsIn(["script"])
  targetLevel!: "script";

  @Equals(true)
  confirmedCreditCost!: true;
}
