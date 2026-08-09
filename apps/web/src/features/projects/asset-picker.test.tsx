import type { Library } from "@creonome/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssetPicker } from "./asset-picker";

const library: Library = {
  totalByteSize: 8_400_000,
  items: [
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
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe("AssetPicker", () => {
  it("lists the workspace Library when opened", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(library));
    vi.stubGlobal("fetch", request);

    render(
      <AssetPicker
        open
        currentAssetId={null}
        onOpenChange={vi.fn()}
        onAttach={vi.fn().mockResolvedValue(true)}
      />,
    );

    expect(await screen.findByText("warehouse-tapes-v1.mp4")).toBeTruthy();
    expect(screen.getByText("private-rush.mov")).toBeTruthy();
    expect(request).toHaveBeenCalledWith("/api/creonome/assets");
  });

  it("selects an asset and calls onAttach with its id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(Response.json(library)),
    );
    const onAttach = vi.fn().mockResolvedValue(true);
    const onOpenChange = vi.fn();

    render(
      <AssetPicker
        open
        currentAssetId={null}
        onOpenChange={onOpenChange}
        onAttach={onAttach}
      />,
    );

    fireEvent.click(await screen.findByText("private-rush.mov"));

    await waitFor(() =>
      expect(onAttach).toHaveBeenCalledWith(
        "0198f3a2-82dd-7000-8000-000000000041",
      ),
    );
    // A successful attach closes the picker.
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("shows an error and keeps the dialog open when the attach fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(Response.json(library)),
    );
    const onOpenChange = vi.fn();

    render(
      <AssetPicker
        open
        currentAssetId={null}
        onOpenChange={onOpenChange}
        onAttach={vi.fn().mockResolvedValue(false)}
      />,
    );

    fireEvent.click(await screen.findByText("private-rush.mov"));

    expect(
      await screen.findByText(/could not be attached to the scene/i),
    ).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("uploads a new asset via the signed-upload flow and attaches it", async () => {
    const uploaded = {
      id: "0198f3a2-82dd-7000-8000-000000000099",
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
      .mockResolvedValueOnce(Response.json(library)) // initial list load
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
    const onAttach = vi.fn().mockResolvedValue(true);

    render(
      <AssetPicker
        open
        currentAssetId={null}
        onOpenChange={vi.fn()}
        onAttach={onAttach}
      />,
    );
    await screen.findByText("warehouse-tapes-v1.mp4");

    const file = new File(["video"], uploaded.name, {
      type: uploaded.mimeType,
    });
    fireEvent.change(screen.getByLabelText("Upload a new asset"), {
      target: { files: [file] },
    });

    await waitFor(() => expect(onAttach).toHaveBeenCalledWith(uploaded.id));
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/api/creonome/uploads/sign",
      expect.objectContaining({ method: "POST" }),
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      "https://storage.googleapis.com/signed-upload",
      expect.objectContaining({ method: "PUT", body: file }),
    );
    expect(request).toHaveBeenNthCalledWith(
      4,
      "/api/creonome/assets",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("detaches the current asset with assetId: null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(Response.json(library)),
    );
    const onAttach = vi.fn().mockResolvedValue(true);

    render(
      <AssetPicker
        open
        currentAssetId="0198f3a2-82dd-7000-8000-000000000041"
        onOpenChange={vi.fn()}
        onAttach={onAttach}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /detach current asset/i }),
    );

    await waitFor(() => expect(onAttach).toHaveBeenCalledWith(null));
  });
});
