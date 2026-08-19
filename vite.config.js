import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// CAMPAIGN_API_KEY is read by the dev-server process only: it is injected into
// the proxied requests below and never bundled into browser code.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target =
    env.CAMPAIGN_API_TARGET ??
    "https://voice-containerapp.jollygrass-66012e86.westus3.azurecontainerapps.io";
  // Same deployed backend by default as `target` above (nginx there already
  // routes /api/v1/outbound-call to twilio_bridge.py, see deploy/pipecat/
  // nginx.conf) - only override to http://localhost:8080 if you're
  // intentionally running twilio_bridge.py locally yourself.
  const bridgeTarget = env.TWILIO_BRIDGE_TARGET ?? target;

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
