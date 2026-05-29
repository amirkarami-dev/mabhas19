import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig: NextConfig = {
  output: "standalone",
  // Compile the workspace-local shared engine (ships as TypeScript source).
  transpilePackages: ["@mabhas19/assessment-core"],
}

export default withNextIntl(nextConfig)
