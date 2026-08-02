import { ServiceUnavailableException } from "@nestjs/common";
import type {
  AuthPrincipal,
  AuthTokenVerifier,
} from "./auth-token-verifier.js";

export class UnavailableTokenVerifier implements AuthTokenVerifier {
  async verify(): Promise<AuthPrincipal> {
    throw new ServiceUnavailableException("Neon Auth JWKS is not configured");
  }
}
