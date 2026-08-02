import { Type } from "class-transformer";
import { IsInt, IsString, Max, MaxLength, Min } from "class-validator";

export class SignUploadDto {
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
}
