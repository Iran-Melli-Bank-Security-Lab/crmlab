import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

function removeTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, "");

  const devBackendTarget = removeTrailingSlash(
    env.DEV_BACKEND_TARGET ||
      env.VITE_DEV_BACKEND_TARGET ||
      "http://127.0.0.1:4000"
  );

  return {
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
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,

      proxy: {
        "/api": {
          target: devBackendTarget,
          changeOrigin: true,
          secure: false,
        },

        "/uploads": {
          target: devBackendTarget,
          changeOrigin: true,
          secure: false,
        },

        "/socket.io": {
          target: devBackendTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  };
});