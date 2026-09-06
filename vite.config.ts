import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: '/ffcs-admin/',
  plugins: [react()],
  server: { port: 5174 },
});
