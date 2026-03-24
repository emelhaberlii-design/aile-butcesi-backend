const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const localDir = path.resolve(__dirname, ".local");

const originalBlockList = config.resolver?.blockList;
const existingPatterns = Array.isArray(originalBlockList)
  ? originalBlockList
  : originalBlockList
  ? [originalBlockList]
  : [];

config.resolver = {
  ...config.resolver,
  blockList: [
    ...existingPatterns,
    new RegExp(`^${localDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${path.sep === "\\" ? "\\\\" : "/"}.*`),
  ],
};

module.exports = config;
