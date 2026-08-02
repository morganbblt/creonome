import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import type {
  ModifyOpportunityInput,
  OpportunityMemoryScope,
} from "@creonome/contracts";

export class ModifyOpportunityDto implements ModifyOpportunityInput {
  @IsString()
  @MinLength(3)
  @MaxLength(1_000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  instruction!: string;

  @IsOptional()
  @IsIn(["idea", "project", "creator"])
  memoryScope: OpportunityMemoryScope = "idea";

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(["title", "pitch", "hook", "duration", "platform"], {
    each: true,
  })
  lockedFields: ModifyOpportunityInput["lockedFields"] = [];
}
