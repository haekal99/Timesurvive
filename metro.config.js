// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');
config.resolver.blockList.push(/[\\/]node_modules[\\/]\.react-native-[^\\/]+[\\/]/);

module.exports = config;
