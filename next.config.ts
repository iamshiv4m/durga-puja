import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Bihar page used to live at /mithila; keep old shared links working.
  async redirects() {
    return [{ source: "/mithila", destination: "/bihar", permanent: true }];
  },
};

export default nextConfig;
