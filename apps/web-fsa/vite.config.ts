import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: appRoot,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(appRoot, "src"),
      "@role-dashboard/authz": path.resolve(appRoot, "../../packages/authz/src"),
      "@role-dashboard/contracts": path.resolve(
        appRoot,
        "../../packages/contracts/src"
      ),
    },
  },
  build: {
    outDir: "../../dist/web-fsa",
    emptyOutDir: true,
  },
    server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
});
