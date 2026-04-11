import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "json"],
      include: ["app/lib/**", "app/api/**", "app/_components/**", "app/components/**"],
      exclude: [
        "app/lib/prisma.ts",   // DB client singleton — not unit testable
        "app/lib/staging.ts",  // admin utility dependent on external services
        "app/lib/utils.ts",    // Tailwind merge helper — no business logic
      ],
      thresholds: {
        lines: 40,
        functions: 30,
        branches: 35,
        statements: 40,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
