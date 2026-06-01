import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import orderSubmitHandler from "./api/order/submit.js";

const SERVER_ENV_KEYS = ["VITE_GAS_URL", "GAS_URL", "GAS_ADMIN_TOKEN", "ADMIN_SHARED_SECRET"];

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
      server.middlewares.use("/api/order/submit", async (request, response) => {
        await orderSubmitHandler(request, createApiResponse(response));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  applyServerEnv(loadEnv(mode, process.cwd(), ""));

  return {
    base: "./",
    plugins: [react(), localApiRoutes()],
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
