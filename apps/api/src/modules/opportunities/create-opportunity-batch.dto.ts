import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateOpportunityBatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  direction?: string;
}
