import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthCheck } from "@nestjs/terminus";
import type { HealthResponse } from "@creonome/contracts";
import { Public } from "../modules/auth/public.decorator.js";
import { HealthService } from "./health.service.js";

@ApiTags("health")
@Public()
@Controller({ path: "health", version: "1" })
export class HealthController {
  constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  @Get("live")
  @HealthCheck()
  @ApiOperation({ summary: "Cloud Run liveness probe" })
  @ApiOkResponse({
    schema: {
      example: {
        status: "ok",
        service: "creonome-api",
        version: "0.1.0",
        timestamp: "2026-08-02T12:00:00.000Z",
      },
    },
  })
  liveness(): HealthResponse {
    return this.healthService.getLiveness();
  }
}
