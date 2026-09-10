import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship raw TypeScript with no build step (see packages/contracts,
  // packages/db) — Next needs to transpile it itself rather than treating
  // it as pre-built node_modules code.
  transpilePackages: ["@investment-platform/contracts"],
};

export default nextConfig;
