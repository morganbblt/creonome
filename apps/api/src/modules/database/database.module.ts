import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createDatabase } from "@creonome/db";

export const CREONOME_DATABASE = Symbol("CREONOME_DATABASE");

@Global()
@Module({
  providers: [
    {
      provide: CREONOME_DATABASE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>("DATABASE_URL");
        return databaseUrl ? createDatabase(databaseUrl) : undefined;
      },
    },
  ],
  exports: [CREONOME_DATABASE],
})
export class DatabaseModule {}
