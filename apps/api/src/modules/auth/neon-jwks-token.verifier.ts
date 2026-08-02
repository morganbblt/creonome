import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";
import { z } from "zod";
import type {
  AuthPrincipal,
  AuthTokenVerifier,
} from "./auth-token-verifier.js";

type VerifyJwt = (
  token: string,
  key: JWTVerifyGetKey,
  options: { algorithms: string[] },
) => Promise<{ payload: JWTPayload }>;

const PrincipalClaimsSchema = z.object({
  sub: z.uuid(),
  email: z.email().optional(),
  name: z.string().min(1).optional(),
});

export class NeonJwksTokenVerifier implements AuthTokenVerifier {
  constructor(
    jwksUrl: string,
    private readonly verifyJwt: VerifyJwt = jwtVerify,
    private readonly key: JWTVerifyGetKey = createRemoteJWKSet(
      new URL(jwksUrl),
    ),
  ) {}

  async verify(token: string): Promise<AuthPrincipal> {
    const { payload } = await this.verifyJwt(token, this.key, {
      algorithms: ["EdDSA", "ES256", "RS256"],
    });
    const claims = PrincipalClaimsSchema.parse(payload);

    return {
      subject: claims.sub,
      ...(claims.email ? { email: claims.email } : {}),
      ...(claims.name ? { name: claims.name } : {}),
    };
  }
}
