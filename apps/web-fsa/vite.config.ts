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
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
              return "vendor-react";
            }

            if (
              id.includes("node_modules/@chakra-ui") ||
              id.includes("node_modules/@emotion") ||
              id.includes("node_modules/framer-motion")
            ) {
              return "vendor-ui";
            }

            if (
              id.includes("node_modules/@reduxjs") ||
              id.includes("node_modules/react-redux")
            ) {
              return "vendor-state";
            }

            if (id.includes("node_modules/react-router-dom")) {
              return "vendor-router";
            }

            if (id.includes("node_modules/zod")) {
              return "vendor-validation";
            }

            if (id.includes("node_modules/socket.io-client")) {
              return "vendor-realtime";
            }

            if (id.includes("packages/authz") || id.includes("packages/contracts")) {
              return "role-packages";
            }

            if (id.includes("node_modules")) {
              return "vendor-misc";
            }
          },
        },
      },
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

    preview: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
    },
  };
});
