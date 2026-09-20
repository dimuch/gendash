/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the workspace packages (they ship TS source, not built JS).
  transpilePackages: ["@gendash/spec", "@gendash/ai", "@gendash/connectors", "@gendash/react"],
  // pg is an optional, server-only native dep — never bundle it (Next 16 key).
  serverExternalPackages: ["pg"],
};
export default nextConfig;
