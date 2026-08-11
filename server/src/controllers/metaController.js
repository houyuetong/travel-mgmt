const { versionProvider } = require('../utils/versionProvider');
const { success } = require('../utils/response');
const BusinessError = require('../errors/BusinessError');
const errorCodes = require('../constants/errorCodes');

function createMetaController(provider) {
  return {
    getVersion(req, res, next) {
      try {
        const version = provider.getVersion();
        if (!version) {
          throw new BusinessError(errorCodes.VERSION_UNAVAILABLE, '版本信息不可用', 500);
        }
        res.json(success({ version }));
      } catch (err) {
        next(err);
      }
    },
  };
}

const metaController = createMetaController(versionProvider);

module.exports = { metaController, createMetaController };
