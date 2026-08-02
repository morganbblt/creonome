import { describe, expect, it, vi } from "vitest";
import { NeonJwksTokenVerifier } from "./neon-jwks-token.verifier.js";

describe("NeonJwksTokenVerifier", () => {
  it("maps verified Neon JWT claims to a minimal principal", async () => {
    const verify = vi.fn().mockResolvedValue({
      payload: {
        sub: "0198f3a2-82dd-7000-8000-000000000001",
        email: "nova@example.com",
        name: "Nova Sainte",
        admin: true,
      },
    });
    const verifier = new NeonJwksTokenVerifier(
      "https://auth.example.com/.well-known/jwks.json",
      verify,
      {} as never,
    );

    await expect(verifier.verify("signed-token")).resolves.toEqual({
      subject: "0198f3a2-82dd-7000-8000-000000000001",
      email: "nova@example.com",
      name: "Nova Sainte",
    });
  });

  it("rejects a verified payload without a UUID subject", async () => {
    const verify = vi.fn().mockResolvedValue({ payload: { sub: "not-a-uuid" } });
    const verifier = new NeonJwksTokenVerifier(
      "https://auth.example.com/.well-known/jwks.json",
      verify,
      {} as never,
    );

    await expect(verifier.verify("signed-token")).rejects.toThrow();
  });
});
