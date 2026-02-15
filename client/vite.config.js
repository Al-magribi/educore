import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
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
        target: "http://localhost:2310",
        changeOrigin: true,
      },
      "/assets": {
        target: "http://localhost:2310",
        changeOrigin: true,
      },
      "/temp_backup": {
        target: "http://localhost:2310",
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
});