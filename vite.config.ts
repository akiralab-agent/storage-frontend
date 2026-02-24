import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  define: {
    __APP_MODE__: JSON.stringify(mode)
  },
  test: {
    environment: "jsdom",
    setupFiles: "src/test/setupTests.ts",
    globals: true,
    css: true,
    restoreMocks: true,
    mockReset: true,
    clearMocks: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"]
  }
}));
