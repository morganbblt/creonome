import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateAssetDto {
  @IsString()
  @MaxLength(240)
  fileName!: string;

  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500_000_000)
  byteSize!: number;

  @IsString()
  @MaxLength(1_024)
  @Matches(/^gs:\/\//)
  gcsUri!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i)
  checksumSha256?: string;
}
