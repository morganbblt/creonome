import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthPrincipal } from "./auth-token-verifier.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthPrincipal => {
    const request = context
      .switchToHttp()
      .getRequest<{ auth: AuthPrincipal }>();
    return request.auth;
  },
);
