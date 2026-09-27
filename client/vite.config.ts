import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // A separate browser prefix avoids collisions between page URLs and the
  // existing Express endpoints, e.g. GET /homes vs POST /homes.
  const proxy = {
    "/backend": {
      target: env.BACKEND_URL || "http://127.0.0.1:3000",
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/backend/, ""),
    },
  };
  return {
    plugins: [react()],
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
  };
});
