import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { UploadSigner } from "./upload-signer.js";
import { UploadsService } from "./uploads.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};
const context = {
  userId: "0198f3a2-82dd-7000-8000-000000000002",
  workspaceId: "0198f3a2-82dd-7000-8000-000000000003",
  creatorProfileId: "0198f3a2-82dd-7000-8000-000000000004",
};

function setup() {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue(context),
  } as unknown as WorkspaceContextService;
  const signer: UploadSigner = {
    signWrite: vi.fn().mockResolvedValue({
      url: "https://storage.googleapis.com/signed-upload",
      expiresAt: new Date("2026-08-02T10:15:00.000Z"),
    }),
  };
  return { service: new UploadsService(workspaces, signer), signer };
}

describe("UploadsService", () => {
  it("creates a short-lived workspace-scoped upload URL", async () => {
    const { service, signer } = setup();
    const result = await service.sign(principal, {
      fileName: "Warehouse Take 01.MOV",
      mimeType: "video/quicktime",
      byteSize: 42_000_000,
    });

    expect(result.objectName).toMatch(
      new RegExp(
        `^workspaces/${context.workspaceId}/sources/[0-9a-f-]+-warehouse-take-01\\.mov$`,
      ),
    );
    expect(result.gcsUri).toContain(result.objectName);
    expect(signer.signWrite).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "video/quicktime" }),
    );
  });

  it("rejects oversized or unsupported files before signing", async () => {
    const { service } = setup();
    await expect(
      service.sign(principal, {
        fileName: "archive.exe",
        mimeType: "application/octet-stream",
        byteSize: 600_000_000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
