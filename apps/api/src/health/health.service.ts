import { Injectable } from "@nestjs/common";
import type { HealthResponse } from "@creonome/contracts";

@Injectable()
export class HealthService {
  getLiveness(): HealthResponse {
    return {
      status: "ok",
      service: "creonome-api",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    };
  }
}
