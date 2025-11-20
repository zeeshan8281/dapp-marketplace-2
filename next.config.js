/** @type {import('next').NextConfig} */
const nextConfig = {
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Disable error overlay completely
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Remove error overlay plugin
      config.plugins = config.plugins.filter(
        (plugin) => plugin.constructor.name !== 'ReactRefreshPlugin' || !plugin.options?.overlay
      );
    }
    return config;
  },
  // Suppress error overlay via environment
  env: {
    NEXT_DISABLE_ERROR_OVERLAY: 'true',
  },
};

module.exports = nextConfig;

