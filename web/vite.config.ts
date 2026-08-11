import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const webRoot = fileURLToPath(new URL(".", import.meta.url));
const backendSrc = fileURLToPath(new URL("../src", import.meta.url));

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // Aliases are prefix-matched in insertion order, so the longer key comes first.
      // The alias points at the full .ts path; the tsconfig `paths` entry omits the
      // extension. Asymmetric on purpose — both are correct for their resolver.
      "@contract": `${backendSrc}/shared/contract.ts`,
      "@app": `${webRoot}src`,
    },
  },

  server: {
    port: 5173,
    strictPort: true,

    // Bind the IPv4 loopback explicitly. Vite's default resolves `localhost` through
    // Node's DNS order, which on this machine listens on ::1 only — a browser that
    // tries 127.0.0.1 then gets connection refused. Not `true`/0.0.0.0: there is no
    // reason to expose a dev server to the LAN.
    host: "127.0.0.1",

    // The contract barrel lives outside this project's root, so it is served via
    // /@fs and gated here. Vite's default workspace heuristic would probably allow
    // it — a load-bearing path should not depend on "probably".
    fs: { allow: [webRoot, backendSrc] },

    // The API has no CORS middleware. Proxying keeps the browser on one origin, so
    // there is no cross-origin request to permit and the backend needs no changes.
    proxy: {
      "/api": { target: "http://localhost:4000" },
      "/health": { target: "http://localhost:4000" },
    },
  },

  build: { outDir: "dist", sourcemap: true },
});
