import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectExportButton } from "./project-export-button";

describe("ProjectExportButton", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("downloads the generated Markdown without navigating away", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        id: "0198f3a2-82dd-7000-8000-000000000080",
        projectId: "0198f3a2-82dd-7000-8000-000000000020",
        format: "markdown",
        status: "ready",
        fileName: "warehouse-tape-loop.md",
        mimeType: "text/markdown;charset=utf-8",
        content: "# Warehouse tape loop\n",
        createdAt: "2026-08-02T06:00:00.000Z",
      }),
    );
    vi.stubGlobal("fetch", request);
    const createObjectUrl = vi.fn().mockReturnValue("blob:project-export");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(
      <ProjectExportButton projectId="0198f3a2-82dd-7000-8000-000000000020" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download Markdown" }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request).toHaveBeenCalledWith(
      "/api/creonome/projects/0198f3a2-82dd-7000-8000-000000000020/exports",
      expect.objectContaining({ method: "POST" }),
    );
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:project-export");
    expect(screen.getByText("Markdown downloaded.")).toBeTruthy();
  });

  it("keeps the project intact when the export service is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ message: "Unavailable" }, { status: 503 }),
        ),
    );

    render(
      <ProjectExportButton projectId="0198f3a2-82dd-7000-8000-000000000020" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download Markdown" }));

    expect(
      await screen.findByText(
        "The export could not be prepared. Your project is unchanged.",
      ),
    ).toBeTruthy();
  });
});
