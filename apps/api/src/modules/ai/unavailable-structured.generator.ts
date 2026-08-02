import { ServiceUnavailableException } from "@nestjs/common";
import type {
  GenerateStructuredInput,
  StructuredGenerator,
} from "./structured-generator.js";

export class UnavailableStructuredGenerator implements StructuredGenerator {
  generate<Output>(_input: GenerateStructuredInput<Output>): Promise<Output> {
    throw new ServiceUnavailableException("GEMINI_API_KEY is not configured");
  }
}
