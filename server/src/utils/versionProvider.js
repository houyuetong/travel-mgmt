const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function createVersionProvider(packagePath) {
  let cachedVersion = null;
  let loaded = false;

  function getVersion() {
    if (loaded) {
      return cachedVersion;
    }
    loaded = true;
    try {
      const raw = fs.readFileSync(packagePath, 'utf8');
      const pkg = JSON.parse(raw);
      const version = pkg && typeof pkg.version === 'string' ? pkg.version.trim() : null;
      if (version && VERSION_PATTERN.test(version)) {
        cachedVersion = version;
      } else {
        logger.error('META', 'Invalid version field in package.json', { version });
      }
    } catch (err) {
      logger.error('META', 'Failed to load version', { error: err.message });
    }
    return cachedVersion;
  }

  return { getVersion };
}

const defaultPackagePath = path.join(__dirname, '..', '..', 'package.json');
const versionProvider = createVersionProvider(defaultPackagePath);

module.exports = { createVersionProvider, versionProvider };