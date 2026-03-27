import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["app.stampeo.192.0.0.2.nip.io"],
};

export default withNextIntl(nextConfig);
