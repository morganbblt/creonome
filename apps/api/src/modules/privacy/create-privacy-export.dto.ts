import type {
  PrivacyExportInput,
  PrivacyExportKind,
} from "@creonome/contracts";
import { IsIn } from "class-validator";

const exportKinds: PrivacyExportKind[] = [
  "creator_dna",
  "projects",
  "everything",
];

export class CreatePrivacyExportDto implements PrivacyExportInput {
  @IsIn(exportKinds)
  kind!: PrivacyExportKind;
}
