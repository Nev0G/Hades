const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Web : expo-sqlite remplacé par sql.js (aperçu navigateur uniquement).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'expo-sqlite') {
    return { type: 'sourceFile', filePath: path.join(__dirname, 'src/web/sqlite.ts') };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
