import { createDatabase, resolveDatabaseUrl } from "./client.js";
import {
  createDrizzleDemoSeedRepository,
  type DemoSeedDrizzleDatabase,
  seedDemoDatabase,
} from "./demo/index.js";

const database = createDatabase(resolveDatabaseUrl(process.env));
const repository = createDrizzleDemoSeedRepository(
  database as unknown as DemoSeedDrizzleDatabase,
);
const result = await seedDemoDatabase(repository);

console.info(
  `Creonome demo seed ready (${result.insertedRows} deterministic rows).`,
);
