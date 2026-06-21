import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server (HMR WebSocket, dev assets) to accept requests
  // from LAN origins, not just localhost. Required when testing on another
  // device. Use a wildcard for the last octet so DHCP reassignments still work.
  allowedDevOrigins: ["10.179.114.252", "10.179.114.*"],
};

export default nextConfig;
