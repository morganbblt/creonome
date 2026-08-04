import { timingSafeEqual } from "node:crypto";
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { extractBearerToken } from "./jwt-auth.guard.js";

type InternalJobRequest = {
  headers: { authorization?: string | string[] };
};

function isEqual(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * Gates service-to-service endpoints (no end-user session) behind a shared
 * bearer token, e.g. a Cloud Scheduler job invoking the account deletion
 * executor. Routes protected by this guard must also carry `@Public()` so
 * the global `JwtAuthGuard` does not additionally demand a user JWT.
 */
@Injectable()
export class InternalJobAuthGuard implements CanActivate {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const token = this.config.get<string>("INTERNAL_JOB_TOKEN");
    if (!token) {
      throw new ServiceUnavailableException(
        "INTERNAL_JOB_TOKEN is not configured",
      );
    }

    const request = context.switchToHttp().getRequest<InternalJobRequest>();
    const authorization = request.headers.authorization;
    const provided = extractBearerToken(
      typeof authorization === "string" ? authorization : undefined,
    );
    if (!provided || !isEqual(provided, token)) {
      throw new UnauthorizedException("Invalid internal job token");
    }

    return true;
  }
}
