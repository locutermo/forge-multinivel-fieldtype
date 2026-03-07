/**
 * CRACO config to silence source-map-loader warnings from node_modules.
 * Some packages (e.g. @atlaskit) reference source files in their source maps
 * that are not published, causing ENOENT warnings.
 */
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      const rule = webpackConfig.module.rules.find(
        (r) => r && (r.loader && String(r.loader).includes('source-map-loader'))
      );
      if (rule) {
        rule.exclude = /node_modules/;
      }
      return webpackConfig;
    },
  },
};
