import type { CreateProjectExportInput } from "@creonome/contracts";
import { IsIn } from "class-validator";

export class CreateProjectExportDto implements CreateProjectExportInput {
  @IsIn(["markdown"])
  format!: "markdown";
}
