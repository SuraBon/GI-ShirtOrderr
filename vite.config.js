import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import dashboardAuthHandler from "./api/auth/dashboard.js";
import blobBranchesHandler from "./api/blob/branches.js";
import blobConfigHandler from "./api/blob/config.js";
import blobUploadHandler from "./api/blob/upload.js";
import dashboardActionHandler from "./api/dashboard/action.js";
import dashboardOrdersHandler from "./api/dashboard/orders.js";
import orderSubmitHandler from "./api/order/submit.js";

const SERVER_ENV_KEYS = [
  "VITE_GAS_URL",
  "GAS_URL",
  "GAS_ADMIN_TOKEN",
  "VITE_GAS_ADMIN_TOKEN",
  "ADMIN_SHARED_SECRET",
  "DASHBOARD_PASSCODE",
  "VITE_DASHBOARD_PASSCODE",
  "DASHBOARD_SESSION_SECRET",
  "VITE_DASHBOARD_SESSION_SECRET",
  "BLOB_READ_WRITE_TOKEN",
];

const LOCAL_API_HANDLERS = new Map([
  ["/api/auth/dashboard", dashboardAuthHandler],
  ["/api/blob/branches", blobBranchesHandler],
  ["/api/blob/config", blobConfigHandler],
  ["/api/blob/upload", blobUploadHandler],
  ["/api/dashboard/action", dashboardActionHandler],
  ["/api/dashboard/orders", dashboardOrdersHandler],
  ["/api/order/submit", orderSubmitHandler],
]);

function applyServerEnv(env) {
  SERVER_ENV_KEYS.forEach((key) => {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  });
}

function createApiResponse(response) {
  return {
    status(code) {
      response.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      response.setHeader(name, value);
      return this;
    },
    json(data) {
      if (!response.headersSent) response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(data));
    },
    send(data) {
      response.end(data);
    },
  };
}

function localApiRoutes() {
  return {
    name: "local-api-routes",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url || "/", "http://localhost").pathname;
        const handler = LOCAL_API_HANDLERS.get(pathname);
        if (!handler) {
          next();
          return;
        }

        try {
          await handler(request, createApiResponse(response));
        } catch (error) {
          console.error(`Local API route failed: ${pathname}`, error);
          if (!response.headersSent) {
            response.statusCode = 500;
            response.setHeader("Content-Type", "application/json");
          }
          response.end(JSON.stringify({ error: "Local API route failed" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  applyServerEnv(loadEnv(mode, process.cwd(), ""));

  return {
    base: "./",
    plugins: [react(), localApiRoutes()],
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("@radix-ui")) return "radix-ui";
            if (id.includes("react") || id.includes("react-dom")) return "react";
            return "vendor";
          },
        },
      },
    },
  };
});
