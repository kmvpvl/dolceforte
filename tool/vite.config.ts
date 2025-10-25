// vite.config.ts
/// <reference types="vitest" />
/// <reference types="vite/client" />

import {
  ConfigEnv,
  defineConfig,
  loadEnv,
  UserConfig,
  UserConfigExport,
  UserConfigFnObject,
} from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
interface MyC extends ConfigEnv {
  server: {
    allowedHosts: boolean;
  };
}

export default defineConfig((config) => {
  const env = loadEnv(config.mode, process.cwd(), "");
  return {
    server: {
      allowedHosts: true,
      //  port: 4000
    },
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 1000,
    },
    css: {
      devSourcemap: true,
    },
    define: {
      "process.env.SERVER_BASE_URL": JSON.stringify(env.SERVER_BASE_URL),
      "process.env.QR_BASE_URL": JSON.stringify(env.QR_BASE_URL),
      "process.env.TG_BOT_URL": JSON.stringify(env.TG_BOT_URL),
      "process.env.LANGUAGES": JSON.stringify(env.LANGUAGES),
      "process.env.CF_PHONE": JSON.stringify(env.CF_PHONE),
      "process.env.CF_PHONE_VIEW": JSON.stringify(env.CF_PHONE_VIEW),
      "process.env.MODE": JSON.stringify(env.MODE) !== "" ? JSON.stringify(env.MODE) : JSON.stringify(config.mode),
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@betypes": path.resolve(__dirname, "../api/src/types/"),
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/__test__/setup.ts",
      css: true,
    },
  } as UserConfig;
});
