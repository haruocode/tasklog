import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // During `vite dev`, proxy API calls to the local Worker (wrangler dev).
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
