const authService = require('../services/authService');
const { success } = require('../utils/response');
const BusinessError = require('../errors/BusinessError');
const errorCodes = require('../constants/errorCodes');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.token;
    await authService.logout(token);
    res.json(success({ success: true }));
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout };