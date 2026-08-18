import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// CAMPAIGN_API_KEY is read by the dev-server process only: it is injected into
// the proxied requests below and never bundled into browser code.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target =
    env.CAMPAIGN_API_TARGET ??
    "https://voice-containerapp.jollygrass-66012e86.westus3.azurecontainerapps.io";
  // twilio_bridge.py's own default (TWILIO_BRIDGE_PORT=8080), run locally
  // alongside this dev server — NGROK_URL is only needed for Twilio's own
  // webhooks to reach the bridge, not for this same-machine proxy hop.
  const bridgeTarget = env.TWILIO_BRIDGE_TARGET ?? "http://localhost:8080";

  // Shared with both proxies below: same CAMPAIGN_API_KEY the bridge's
  // _require_api_key() and the campaigns API both check.
  const attachAuth = (proxy) => {
    proxy.on("proxyReq", (proxyReq) => {
      if (env.CAMPAIGN_API_KEY) {
        proxyReq.setHeader("Authorization", `Bearer ${env.CAMPAIGN_API_KEY}`);
      }
    });
  };

  return {
    plugins: [react()],
    server: {
      open: true,
      proxy: {
        "/api/v1/campaigns": {
          target,
          changeOrigin: true,
          configure: attachAuth,
        },
        // -> pipecat_server.py's POST /api/v1/audiences (same backend/key as campaigns).
        "/api/v1/audiences": {
          target,
          changeOrigin: true,
          configure: attachAuth,
        },
        // -> twilio_bridge.py's POST /outbound-call (real phone call).
        "/api/v1/outbound-call": {
          target: bridgeTarget,
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(/^\/api\/v1\/outbound-call/, "/outbound-call"),
          configure: attachAuth,
        },
      },
    },
  };
});
