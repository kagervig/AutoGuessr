import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      include: ["app/lib/**"],
      exclude: [
        "app/lib/prisma.ts",   // DB client singleton — not unit testable
        "app/lib/staging.ts",  // admin utility dependent on external services
        "app/lib/utils.ts",    // Tailwind merge helper — no business logic
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
