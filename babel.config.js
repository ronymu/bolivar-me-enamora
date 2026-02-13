// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // IMPORTANTE: siempre al final
      "react-native-reanimated/plugin",
    ],
  };
};
