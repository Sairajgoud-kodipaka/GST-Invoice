import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use 'standalone' for Electron builds, remove for Vercel
  // Vercel will auto-detect and optimize the build
  ...(process.env.BUILD_FOR_ELECTRON === 'true' ? { output: 'standalone' } : {}),
  /* config options here */
};

export default nextConfig;
