/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/layout": path.resolve(__dirname, "./src/components/layout"),
      "@/views": path.resolve(__dirname, "./src/components/views"),
      "@/atoms": path.resolve(__dirname, "./src/components/atoms"),
      "@/icons": path.resolve(__dirname, "./src/components/atoms/icons"),
      "@/composite": path.resolve(__dirname, "./src/components/composite"),
      "@": path.resolve(__dirname, "./src"),
      "capacitor-plugin-simple-encryption": path.resolve(__dirname, "./plugins/capacitor-plugin-simple-encryption/dist/esm/index.js"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    exclude: ["node_modules/**"],
  },
});
