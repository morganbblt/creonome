import type { UpdateCreatorDnaTraitInput } from "@creonome/contracts";
import { IsString, MaxLength, MinLength } from "class-validator";

export class UpdateCreatorDnaTraitDto implements UpdateCreatorDnaTraitInput {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  value!: string;
}
