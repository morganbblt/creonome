import {
  ValidationPipe,
  VersioningType,
  type INestApplication,
} from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export type ConfigureAppOptions = {
  apiPrefix: string;
  corsOrigins: string[];
};

export function configureApp(
  app: INestApplication,
  options: ConfigureAppOptions,
): void {
  const allowedOrigins = new Set(options.corsOrigins);

  app.setGlobalPrefix(options.apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true,
    }),
  );
  app.enableCors({
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
  });

  const openApiConfig = new DocumentBuilder()
    .setTitle("Creonome API")
    .setDescription("Internal API for the Creonome creative operating system.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup(`${options.apiPrefix}/docs`, app, document, {
    jsonDocumentUrl: `${options.apiPrefix}/openapi.json`,
  });
}
