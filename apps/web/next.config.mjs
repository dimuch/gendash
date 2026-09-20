/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the workspace packages (they ship TS source, not built JS).
  transpilePackages: ["@gendash/spec", "@gendash/ai", "@gendash/connectors", "@gendash/react"],
  // pg is an optional, server-only native dep — never bundle it.
  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },
  // The shared packages import with explicit .js extensions (Node-ESM style);
  // let webpack resolve those to the .ts source.
  webpack(config) {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};
export default nextConfig;
