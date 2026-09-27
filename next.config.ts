import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Durga Puja used to be the whole site, at /, /bihar and /gujarat (and Bihar before that at
  // /mithila). Parv now lives at /, so keep the old region links working.
  async redirects() {
    return [
      { source: "/mithila", destination: "/durga-puja/bihar", permanent: true },
      { source: "/bihar", destination: "/durga-puja/bihar", permanent: true },
      { source: "/gujarat", destination: "/durga-puja/gujarat", permanent: true },
    ];
  },
};

export default nextConfig;
