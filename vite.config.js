import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// CAMPAIGN_API_KEY is read by the dev-server process only: it is injected into
// the proxied request below and never bundled into browser code.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target =
    env.CAMPAIGN_API_TARGET ??
    "https://voice-containerapp.jollygrass-66012e86.westus3.azurecontainerapps.io";

  return {
    plugins: [react()],
    server: {
      open: true,
      proxy: {
        "/api/v1/campaigns": {
          target,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (env.CAMPAIGN_API_KEY) {
                proxyReq.setHeader(
                  "Authorization",
                  `Bearer ${env.CAMPAIGN_API_KEY}`,
                );
              }
            });
          },
        },
      },
    },
  };
});
