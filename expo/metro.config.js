const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

const config = getDefaultConfig(__dirname);

// Fewer parallel bundler workers keeps memory low on the cloud build machine.
config.maxWorkers = 2;

module.exports = withRorkMetro(config);
