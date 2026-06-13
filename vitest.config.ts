import { defineConfig } from "vitest/config";

// Vitest runs unit tests only; Playwright owns the e2e/ specs (both use *.spec/test).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
});
