// next.config.ts

import type { NextConfig } from "next";

// Initialize the bundle analyzer
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
};

// Wrap your existing config with the analyzer
export default withBundleAnalyzer(nextConfig);