import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const target = mode === "production"
    ? "http://localhost:2310"
    : "http://localhost:2320";

  return {
    plugins: [
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler"]],
        },
      }),
    ],
    base: "/",
    server: {
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
        },
        "/assets": {
          target,
          changeOrigin: true,
        },
        "/temp_backup": {
          target,
          changeOrigin: true,
        },
      },
    },
    build: {
      // Optimasi build
      sourcemap: false, // Matikan sourcemap di prod agar lebih ringan & aman
      minify: "terser",
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: [
              "react",
              "react-dom",
              "react-router-dom",
              "@reduxjs/toolkit",
            ],
            charts: ["@ant-design/plots"],
          },
        },
      },
    },
  };
});
