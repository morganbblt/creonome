import { Transform } from "class-transformer";
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import type {
  OpportunityFeedbackAction,
  OpportunityFeedbackInput,
} from "@creonome/contracts";

const feedbackActions: OpportunityFeedbackAction[] = [
  "this_is_me",
  "almost",
  "not_my_style",
  "good_idea_bad_wording",
  "never_use",
  "always_do",
];

export class CreateOpportunityFeedbackDto implements OpportunityFeedbackInput {
  @IsIn(feedbackActions)
  action!: OpportunityFeedbackAction;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  comment?: string;
}
