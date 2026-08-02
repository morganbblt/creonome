import { IsIn } from "class-validator";
import type { CreditOperation } from "./credits.service.js";

const operations: CreditOperation[] = [
  "opportunity_batch",
  "script",
  "storyboard",
  "video",
  "music",
];

export class EstimateCreditsDto {
  @IsIn(operations)
  kind!: CreditOperation;
}
