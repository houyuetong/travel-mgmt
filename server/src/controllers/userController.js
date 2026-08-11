const userService = require('../services/userService');
const { success } = require('../utils/response');

async function listUsers(req, res, next) {
  try {
    const users = userService.listUsers();
    res.json(success(users));
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { username, name, password } = req.body;
    const user = await userService.createUser(req.user, { username, name, password });
    res.json(success(user));
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { username, name, status } = req.body;
    const user = await userService.updateUser(req.user, req.params.id, { username, name, status });
    res.json(success(user));
  } catch (err) {
    next(err);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const { status } = req.body;
    const user = await userService.updateUserStatus(req.user, req.params.id, status);
    res.json(success(user));
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    const result = await userService.resetPassword(req.user, req.params.id, newPassword);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, createUser, updateUser, updateUserStatus, resetPassword };