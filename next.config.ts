import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "deifkwefumgah.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "html.tailus.io",
      },
    ],
  },
};

export default nextConfig;
