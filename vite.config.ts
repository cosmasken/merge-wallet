/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/layout": path.resolve(__dirname, "./src/components/layout"),
      "@/views": path.resolve(__dirname, "./src/components/views"),
      "@/atoms": path.resolve(__dirname, "./src/components/atoms"),
      "@/icons": path.resolve(__dirname, "./src/components/atoms/icons"),
      "@/composite": path.resolve(__dirname, "./src/components/composite"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    exclude: ["node_modules/**"],
  },
});
