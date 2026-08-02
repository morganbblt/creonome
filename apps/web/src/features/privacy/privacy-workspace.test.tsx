import type { PrivacyState } from "@creonome/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivacyWorkspace } from "./privacy-workspace";

const initialState: PrivacyState = {
  preferences: {
    modelTrainingOptIn: false,
    keepRushesAfterExport: true,
    updatedAt: "2026-08-02T10:00:00.000Z",
  },
  accountDeletion: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PrivacyWorkspace", () => {
  it("persists both preference values and updates only after confirmation", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        modelTrainingOptIn: true,
        keepRushesAfterExport: true,
        updatedAt: "2026-08-02T10:01:00.000Z",
      }),
    );
    vi.stubGlobal("fetch", request);
    render(<PrivacyWorkspace initialState={initialState} />);

    fireEvent.click(
      screen.getByRole("switch", { name: "Help improve the models" }),
    );

    await waitFor(() =>
      expect(
        screen
          .getByRole("switch", { name: "Help improve the models" })
          .getAttribute("aria-checked"),
      ).toBe("true"),
    );
    expect(request).toHaveBeenCalledWith(
      "/api/creonome/privacy/preferences",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          modelTrainingOptIn: true,
          keepRushesAfterExport: true,
        }),
      }),
    );
    expect(screen.getByText("Privacy preferences saved.")).toBeTruthy();
  });

  it("keeps the previous preference when persistence fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ message: "fail" }, { status: 503 })),
    );
    render(<PrivacyWorkspace initialState={initialState} />);

    fireEvent.click(
      screen.getByRole("switch", { name: "Keep rushes after export" }),
    );

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Your privacy settings could not be saved. Nothing changed.",
    );
    expect(
      screen
        .getByRole("switch", { name: "Keep rushes after export" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("downloads an immediate portable JSON export", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        kind: "projects",
        fileName: "creonome-projects-2026-08-02.json",
        mimeType: "application/json;charset=utf-8",
        content: '{"projects":[]}',
        createdAt: "2026-08-02T10:00:00.000Z",
      }),
    );
    vi.stubGlobal("fetch", request);
    const createObjectUrl = vi.fn().mockReturnValue("blob:privacy-export");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    render(<PrivacyWorkspace initialState={initialState} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Projects & scripts · JSON" }),
    );

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(request).toHaveBeenCalledWith(
      "/api/creonome/privacy/exports",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ kind: "projects" }),
      }),
    );
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(screen.getByText("Projects & scripts downloaded.")).toBeTruthy();
  });

  it("requires typed confirmation, then allows a scheduled deletion to be cancelled", async () => {
    const deletion = {
      id: "0198f3a2-82dd-7000-8000-000000000090",
      status: "scheduled" as const,
      requestedAt: "2026-08-02T10:00:00.000Z",
      scheduledFor: "2026-08-03T10:00:00.000Z",
    };
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(deletion, { status: 201 }))
      .mockResolvedValueOnce(
        Response.json({ id: deletion.id, cancelled: true }),
      );
    vi.stubGlobal("fetch", request);
    render(<PrivacyWorkspace initialState={initialState} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    const confirm = screen.getByRole("button", {
      name: "Schedule account deletion",
    });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(
      screen.getByRole("textbox", { name: /type delete my account/i }),
      { target: { value: "DELETE MY ACCOUNT" } },
    );
    fireEvent.click(confirm);

    expect(
      await screen.findByText(/deletion request is scheduled/i),
    ).toBeTruthy();
    expect(request).toHaveBeenNthCalledWith(
      1,
      "/api/creonome/privacy/account-deletion",
      expect.objectContaining({ method: "POST" }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Cancel deletion request" }),
    );
    await waitFor(() =>
      expect(screen.queryByText(/deletion request is scheduled/i)).toBeNull(),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      `/api/creonome/privacy/account-deletion/${deletion.id}`,
      { method: "DELETE" },
    );
  });
});
