import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["nspell"],
  outputFileTracingIncludes: {
    "/api/anagram": ["./node_modules/dictionary-en-gb/**/*"],
    "/api/generate": ["./node_modules/dictionary-en-gb/**/*"],
  },
};

export default nextConfig;