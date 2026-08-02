import type { Library } from "@creonome/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LibraryWorkspace } from "./library-workspace";

const library: Library = {
  totalByteSize: 10_400_000,
  items: [
    {
      id: "0198f3a2-82dd-7000-8000-000000000042",
      projectId: null,
      name: "private-rush.mov",
      kind: "video",
      mimeType: "video/quicktime",
      byteSize: 2_000_000,
      durationSeconds: null,
      status: "ready",
      source: "upload",
      createdAt: "2026-08-02T10:30:00.000Z",
    },
    {
      id: "0198f3a2-82dd-7000-8000-000000000040",
      projectId: null,
      name: "warehouse-tapes-v1.mp4",
      kind: "export",
      mimeType: "video/mp4",
      byteSize: 8_400_000,
      durationSeconds: 35,
      status: "ready",
      source: "generated",
      createdAt: "2026-08-02T10:00:00.000Z",
    },
    {
      id: "0198f3a2-82dd-7000-8000-000000000041",
      projectId: "0198f3a2-82dd-7000-8000-000000000020",
      name: "Warehouse tape script",
      kind: "script",
      mimeType: "text/plain",
      byteSize: null,
      durationSeconds: 35,
      status: "ready",
      source: "script",
      createdAt: "2026-08-02T09:00:00.000Z",
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe("LibraryWorkspace", () => {
  it("filters the real mixed library", () => {
    render(<LibraryWorkspace library={library} />);

    fireEvent.click(screen.getByRole("button", { name: "Scripts 1" }));
    expect(screen.getByText("Warehouse tape script")).toBeTruthy();
    expect(screen.queryByText("warehouse-tapes-v1.mp4")).toBeNull();
  });

  it("uploads to the signed URL and registers the completed asset", async () => {
    const uploaded = {
      id: "0198f3a2-82dd-7000-8000-000000000042",
      projectId: null,
      name: "needle_macro.mov",
      kind: "video",
      mimeType: "video/quicktime",
      byteSize: 120,
      durationSeconds: null,
      status: "uploaded",
      source: "upload",
      createdAt: "2026-08-02T11:00:00.000Z",
    } as const;
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          objectName: "workspaces/workspace-1/sources/asset.mov",
          gcsUri:
            "gs://creonome-909754432431-media/workspaces/workspace-1/sources/asset.mov",
          uploadUrl: "https://storage.googleapis.com/signed-upload",
          expiresAt: "2026-08-02T11:15:00.000Z",
          headers: { "Content-Type": "video/quicktime" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(Response.json(uploaded));
    vi.stubGlobal("fetch", request);
    render(<LibraryWorkspace library={library} />);

    const file = new File(["video"], uploaded.name, {
      type: uploaded.mimeType,
    });
    fireEvent.change(screen.getByLabelText("Upload files"), {
      target: { files: [file] },
    });

    expect(await screen.findByText(uploaded.name)).toBeTruthy();
    expect(request).toHaveBeenNthCalledWith(
      2,
      "https://storage.googleapis.com/signed-upload",
      expect.objectContaining({ method: "PUT", body: file }),
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      "/api/creonome/assets",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("confirms and removes a private source from the live library", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        id: "0198f3a2-82dd-7000-8000-000000000042",
        deleted: true,
      }),
    );
    vi.stubGlobal("fetch", request);
    render(<LibraryWorkspace library={library} />);

    fireEvent.click(
      screen.getByRole("button", { name: /delete private-rush\.mov/i }),
    );
    const confirmation = screen.getByRole("dialog", {
      name: /delete private source/i,
    });
    expect(confirmation.textContent).toMatch(
      /stored file and its private analysis/i,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /delete source permanently/i }),
    );

    await waitFor(() =>
      expect(screen.queryByText("private-rush.mov")).toBeNull(),
    );
    expect(request).toHaveBeenCalledWith(
      "/api/creonome/assets/0198f3a2-82dd-7000-8000-000000000042",
      { method: "DELETE" },
    );
    expect(screen.getByText("8.4 MB")).toBeTruthy();
  });

  it("keeps a source visible when deletion cannot be confirmed", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ message: "storage unavailable" }, { status: 503 }),
        ),
    );
    render(<LibraryWorkspace library={library} />);

    fireEvent.click(
      screen.getByRole("button", { name: /delete private-rush\.mov/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /delete source permanently/i }),
    );

    expect((await screen.findByRole("alert")).textContent).toMatch(
      /could not be deleted.*still intact/i,
    );
    expect(
      screen.getByRole("heading", { name: "private-rush.mov" }),
    ).toBeTruthy();
  });
});
