import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:" + (env.PORT || 3000),
          changeOrigin: true,
        },
      },
    },
    root: resolve(__dirname, "client"),
    build: {
      outDir: resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "client/src"),
        "@shared": resolve(__dirname, "shared"),
      },
    },
    define: {
      // Make environment variables available in client code
      'import.meta.env.VITE_TIMEZONE': JSON.stringify(env.VITE_TIMEZONE || 'UTC')
    },
  };
});
