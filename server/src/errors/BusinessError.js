const errorCodes = require('../constants/errorCodes');

class BusinessError extends Error {
  constructor(errorCode, message, httpStatus = 400) {
    super(message);
    this.name = 'BusinessError';
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
  }
}

module.exports = BusinessError;