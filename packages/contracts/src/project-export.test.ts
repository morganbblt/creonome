import { describe, expect, it } from "vitest";
import {
  CreateProjectExportInputSchema,
  ProjectExportSchema,
} from "./project-export.js";

describe("project export contracts", () => {
  it("accepts the synchronous Markdown export delivered by the API", () => {
    expect(
      ProjectExportSchema.parse({
        id: "0198f3a2-82dd-7000-8000-000000000080",
        projectId: "0198f3a2-82dd-7000-8000-000000000020",
        format: "markdown",
        status: "ready",
        fileName: "warehouse-tape-loop.md",
        mimeType: "text/markdown;charset=utf-8",
        content: "# Warehouse tape loop\n",
        createdAt: "2026-08-02T06:00:00.000Z",
      }),
    ).toMatchObject({ format: "markdown", status: "ready" });
  });

  it("rejects an unimplemented export format", () => {
    expect(() =>
      CreateProjectExportInputSchema.parse({ format: "pdf" }),
    ).toThrow();
  });
});
