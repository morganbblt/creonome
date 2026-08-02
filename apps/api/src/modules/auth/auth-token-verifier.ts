export type AuthPrincipal = {
  subject: string;
  email?: string;
  name?: string;
};

export interface AuthTokenVerifier {
  verify(token: string): Promise<AuthPrincipal>;
}

export const AUTH_TOKEN_VERIFIER = Symbol("AUTH_TOKEN_VERIFIER");
