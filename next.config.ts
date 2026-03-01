import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/api/webhooks/:path*",
      headers: [
        { key: "Content-Type", value: "text/xml" },
      ],
    },
  ],
};

export default nextConfig;
