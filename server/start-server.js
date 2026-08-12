const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const serverDir = path.join(__dirname);
const out = fs.openSync(path.join(serverDir, 'server.out.log'), 'a');
const err = fs.openSync(path.join(serverDir, 'server.err.log'), 'a');
const child = spawn(process.execPath, [path.join(serverDir, 'src', 'app.js')], {
  cwd: serverDir,
  detached: true,
  stdio: ['ignore', out, err],
});
child.unref();
console.log('spawned pid=' + child.pid);