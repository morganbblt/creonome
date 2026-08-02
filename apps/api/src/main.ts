import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { parseApiEnv } from "@creonome/config";
import { AppModule } from "./app.module.js";
import { configureApp } from "./bootstrap/configure-app.js";

async function bootstrap(): Promise<void> {
  const env = parseApiEnv(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false, trustProxy: 1 }),
  );

  configureApp(app, {
    apiPrefix: env.API_PREFIX,
    corsOrigins: env.CORS_ALLOWED_ORIGINS,
  });
  app.enableShutdownHooks();

  await app.listen(env.PORT, "0.0.0.0");
  Logger.log(`Creonome API listening on port ${env.PORT}`, "Bootstrap");
}

void bootstrap();
