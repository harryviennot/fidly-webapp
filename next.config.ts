import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["app.stampeo.10.196.9.69.nip.io"],
};

export default withNextIntl(nextConfig);
