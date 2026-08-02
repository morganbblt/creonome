import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AUTH_TOKEN_VERIFIER } from "./auth-token-verifier.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { NeonJwksTokenVerifier } from "./neon-jwks-token.verifier.js";
import { UnavailableTokenVerifier } from "./unavailable-token.verifier.js";

@Global()
@Module({
  providers: [
    {
      provide: AUTH_TOKEN_VERIFIER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jwksUrl = config.get<string>("NEON_AUTH_JWKS_URL");
        return jwksUrl
          ? new NeonJwksTokenVerifier(jwksUrl)
          : new UnavailableTokenVerifier();
      },
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AUTH_TOKEN_VERIFIER],
})
export class AuthModule {}
