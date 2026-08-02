import type { z } from "zod";

export type GenerateStructuredInput<Output> = {
  prompt: string;
  schema: z.ZodType<Output>;
  jsonSchema: Record<string, unknown>;
};

export interface StructuredGenerator {
  generate<Output>(input: GenerateStructuredInput<Output>): Promise<Output>;
}

export const STRUCTURED_GENERATOR = Symbol("STRUCTURED_GENERATOR");
