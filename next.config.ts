import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle canvas dependency that pdf-parse might try to use
      config.externals = config.externals || [];
      config.externals.push('canvas');
    }
    return config;
  },
  // Enable server components to handle larger payloads
  serverExternalPackages: ['pdf-parse']
};

export default nextConfig;
