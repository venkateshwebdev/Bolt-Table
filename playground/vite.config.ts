import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "bolt-table": path.resolve(__dirname, "../src/index.ts"),
    },
  },
  server: {
    port: 3333,
    open: true,
  },
});
