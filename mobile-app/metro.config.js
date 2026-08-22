const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Allow .wasm files (needed by expo-sqlite on web)
config.resolver.assetExts.push('wasm');

// Inject COOP/COEP headers so SharedArrayBuffer works in browser (needed by expo-sqlite sync)
const originalMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const base = originalMiddleware ? originalMiddleware(middleware, server) : middleware;
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      base(req, res, next);
    };
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
