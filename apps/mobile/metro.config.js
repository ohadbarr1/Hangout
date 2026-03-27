const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Prefer CJS builds over ESM for web to avoid import.meta syntax errors.
// The 'module' condition in package.json exports maps to ESM which uses import.meta.
// Removing 'module' causes Metro to fall through to 'default' (CJS builds).
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.unstable_conditionNames = ['browser', 'require', 'default'];

module.exports = withNativeWind(config, { input: './global.css' });
