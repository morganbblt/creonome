import type {
  OnboardingCalibrationResponseInput,
  OnboardingCalibrationResponseValue,
  SubmitOnboardingCalibrationResponsesInput,
} from "@creonome/contracts";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

class OnboardingCalibrationResponseItemDto
  implements OnboardingCalibrationResponseInput
{
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  conceptId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(320)
  description!: string;

  @IsIn(["feels_like_me", "future_direction", "not_for_me"])
  response!: OnboardingCalibrationResponseValue;
}

export class SubmitOnboardingCalibrationResponsesDto
  implements SubmitOnboardingCalibrationResponsesInput
{
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => OnboardingCalibrationResponseItemDto)
  responses!: OnboardingCalibrationResponseItemDto[];
}
