import type { NextConfig } from "next"
import path from "path"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig: NextConfig = {
  output: "standalone",
  // Compile the workspace-local shared engine (ships as TypeScript source).
  transpilePackages: ["@mabhas19/assessment-core"],
  // We're in an npm-workspaces monorepo; trace from the repo root so the
  // standalone bundle is deterministic (server entry lands at web/server.js).
  outputFileTracingRoot: path.join(__dirname, ".."),
}

export default withNextIntl(nextConfig)
