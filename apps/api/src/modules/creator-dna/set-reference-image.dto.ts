import { IsUUID } from "class-validator";

export class SetCreatorDnaReferenceImageDto {
  @IsUUID()
  assetId!: string;
}
