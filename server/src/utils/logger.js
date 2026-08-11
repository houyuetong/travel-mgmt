function log(level, module, message, extra = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    ...extra,
  };
  console.log(JSON.stringify(entry));
}

module.exports = {
  info: (module, message, extra) => log('INFO', module, message, extra),
  warn: (module, message, extra) => log('WARN', module, message, extra),
  error: (module, message, extra) => log('ERROR', module, message, extra),
  debug: (module, message, extra) => log('DEBUG', module, message, extra),
};