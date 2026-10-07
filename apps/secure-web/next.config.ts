import type { NextConfig } from "next";

// Same server-only value lib/api.ts uses, e.g. https://api.example.com/api.
const API_URL = process.env.API_URL ?? "http://localhost:3000/api";

const nextConfig: NextConfig = {
  // Ship raw TypeScript with no build step (see packages/contracts,
  // packages/db) — Next needs to transpile it itself rather than treating
  // it as pre-built node_modules code.
  transpilePackages: ["@investment-platform/contracts"],

  // The browser calls /api on secure-web's own origin and Next forwards it
  // to the Nest API. The API's auth cookies are sameSite=strict and
  // host-only, so they only work when the browser sees one site — this is
  // the "secure-web proxies /api" setup apps/api/src/config/env.ts expects
  // (leave COOKIE_DOMAIN unset). Server-side code keeps calling API_URL
  // directly via lib/api.ts.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
