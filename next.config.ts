import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["app.stampeo.172.16.0.241.nip.io"],
};

export default withNextIntl(nextConfig);
