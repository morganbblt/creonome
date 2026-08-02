import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HealthResponseSchema } from "@creonome/contracts";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/bootstrap/configure-app.js";

describe("health API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication(
      new FastifyAdapter({ logger: false }),
    );
    configureApp(app, {
      apiPrefix: "api",
      corsOrigins: ["http://localhost:3000"],
    });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("exposes a versioned liveness response matching the shared contract", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/health/live")
      .expect(200);

    expect(HealthResponseSchema.parse(response.body).status).toBe("ok");
  });

  it("does not allow arbitrary browser origins", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/health/live")
      .set("Origin", "https://attacker.example")
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("protects tenant routes with Neon bearer authentication", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/opportunities")
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe("Authentication is required");
      });
  });
});
