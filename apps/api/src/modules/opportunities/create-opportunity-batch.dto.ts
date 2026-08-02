import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateOpportunityBatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  direction?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  directions?: string[];
}

export function resolveOpportunityDirections(
  input: CreateOpportunityBatchDto,
): string | undefined {
  const directions = input.directions
    ?.map((direction) => direction.trim())
    .filter(Boolean);
  if (directions?.length) return directions.join(" · ");
  return input.direction?.trim() || undefined;
}
