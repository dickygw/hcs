import type { NextConfig } from "next";

// Semua alamat /api/... diteruskan ke backend Express.
// Browser hanya berbicara dengan satu domain (HCS), tidak pernah langsung ke database.
const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
