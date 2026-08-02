import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  AUTH_TOKEN_VERIFIER,
  type AuthPrincipal,
  type AuthTokenVerifier,
} from "./auth-token-verifier.js";
import { IS_PUBLIC_ROUTE } from "./public.decorator.js";

type AuthenticatedRequest = {
  headers: { authorization?: string | string[] };
  auth?: AuthPrincipal;
};

export function extractBearerToken(
  authorization: string | undefined,
): string | undefined {
  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 ? token : undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AUTH_TOKEN_VERIFIER)
    private readonly verifier: AuthTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = extractBearerToken(
      typeof authorization === "string" ? authorization : undefined,
    );
    if (!token) {
      throw new UnauthorizedException("Authentication is required");
    }

    try {
      request.auth = await this.verifier.verify(token);
    } catch {
      throw new UnauthorizedException(
        "Authentication token is invalid or expired",
      );
    }

    return true;
  }
}
