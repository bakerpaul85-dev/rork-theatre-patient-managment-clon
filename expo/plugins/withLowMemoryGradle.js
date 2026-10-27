// Keeps the Android (Gradle) build within the memory limits of the cloud build sandbox.
// Three processes can overlap during the build: the Gradle JVM, the Kotlin compiler
// daemon, and the Node bundler (Metro). Each gets an explicit memory cap so the
// sandbox (8 GB) does not run out of memory.
const { withGradleProperties, withAppBuildGradle } = require("expo/config-plugins");

const PROPS = {
  "org.gradle.jvmargs": "-Xmx1536m -XX:MaxMetaspaceSize=384m -XX:+UseParallelGC -Dfile.encoding=UTF-8",
  "org.gradle.parallel": "false",
  "org.gradle.workers.max": "1",
  "org.gradle.daemon": "false",
  "kotlin.daemon.jvmargs": "-Xmx768m",
  "kotlin.compiler.execution.strategy": "in-process",
};

module.exports = function withLowMemoryGradle(config) {
  config = withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(PROPS)) {
      const existing = cfg.modResults.find((item) => item.type === "property" && item.key === key);
      if (existing) {
        existing.value = value;
      } else {
        cfg.modResults.push({ type: "property", key, value });
      }
    }
    return cfg;
  });

  config = withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = cfg.modResults.contents.replace(
      '// nodeExecutableAndArgs = ["node"]',
      'nodeExecutableAndArgs = ["node", "--max-old-space-size=1536"]'
    );
    return cfg;
  });

  return config;
};
