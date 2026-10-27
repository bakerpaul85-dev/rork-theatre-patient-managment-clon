// react-native-maps is pulled in indirectly by the Rork toolkit (web-only maps helper)
// but is never used by this app. Skip compiling it into the Android build to save memory.
module.exports = {
  dependencies: {
    "react-native-maps": {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
