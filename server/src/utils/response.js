function success(data) {
  return { code: 0, data };
}

function fail(code, message) {
  return { code, message };
}

module.exports = { success, fail };