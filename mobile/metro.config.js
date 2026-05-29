// Metro config tuned for the npm-workspaces monorepo so it can resolve the
// shared @mabhas19/assessment-core package that lives in ../packages, while
// forcing a single copy of react / react-native (the app's) to avoid the
// classic "Invalid hook call" from duplicate React in a hoisted monorepo.
const { getDefaultConfig } = require("expo/metro-config")
const path = require("path")

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "..")

const config = getDefaultConfig(projectRoot)

// 1. Watch the whole monorepo (keep Metro's defaults too).
config.watchFolders = Array.from(new Set([...(config.watchFolders ?? []), workspaceRoot]))

// 2. Resolve modules from both the app and the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
]

// 3. Pin react / react-native to the app's copy so hoisted packages can't pull
//    a second React version from the workspace root.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
}

module.exports = config
