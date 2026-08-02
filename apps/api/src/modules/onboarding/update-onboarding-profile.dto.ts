import type { UpdateOnboardingProfileInput } from "@creonome/contracts";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateOnboardingProfileDto implements UpdateOnboardingProfileInput {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  stageName!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsString({ each: true })
  disciplines!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @IsString({ each: true })
  genres!: string[];

  @IsString()
  @MinLength(8)
  @MaxLength(600)
  creativeSignature!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @IsString({ each: true })
  themes!: string[];

  @IsString()
  @MinLength(8)
  @MaxLength(500)
  targetAudience!: string;

  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  boundaries!: string[];
}
