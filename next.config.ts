// next.config.ts

import type { NextConfig } from "next";

// Initialize the bundle analyzer
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
};

// Wrap your existing config with the analyzer
export default withBundleAnalyzer(nextConfig);
