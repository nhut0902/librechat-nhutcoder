// entrypoint.js — Run LibreChat, fall back to log+health server on crash.
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = parseInt(process.env.PORT || '10000', 10);
const LOG = '/tmp/librechat.log';

try { fs.mkdirSync('/tmp', { recursive: true }); } catch (e) {}
const logStream = fs.createWriteStream(LOG, { flags: 'w' });
function logLine(s) { logStream.write(s + '\n'); console.log(s); }

logLine('=== LibreChat entrypoint ===');
logLine('Time: ' + new Date().toISOString());
logLine('PORT: ' + PORT);
logLine('MONGO_URI: ' + (process.env.MONGO_URI ? process.env.MONGO_URI.replace(/:[^:@]+@/, ':***@') : 'NOT SET'));
logLine('NODE_ENV: ' + process.env.NODE_ENV);
logLine('');

// Start LibreChat (npm run backend — defined in upstream image CMD)
const proc = spawn('npm', ['run', 'backend'], {
  cwd: '/app',
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
});

proc.stdout.on('data', d => logStream.write(d));
proc.stderr.on('data', d => logStream.write(d));

let appAlive = true;
proc.on('exit', (code, sig) => {
  appAlive = false;
  logLine('');
  logLine('=== LibreChat exited code=' + code + ' sig=' + sig + ' ===');
  logLine('=== Container staying alive for log retrieval ===');
});

// HTTP server: always responds with log (or /health for OK)
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK\n');
    return;
  }
  let body = '(no log yet)';
  try { body = fs.readFileSync(LOG, 'utf8'); } catch (e) {}
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
});

server.listen(PORT, '0.0.0.0', () => {
  logLine('Log+health server listening on ' + PORT);
});

process.on('SIGTERM', () => { proc.kill('SIGTERM'); process.exit(0); });
