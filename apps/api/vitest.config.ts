import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.spec.ts", "test/**/*.e2e-spec.ts"],
    testTimeout: 10_000,
  },
});
