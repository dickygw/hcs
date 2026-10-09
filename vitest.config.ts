import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["apps-script/test/**/*.test.ts", "alat/**/*.test.ts"] },
});
