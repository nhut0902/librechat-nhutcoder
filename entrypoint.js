// entrypoint.js — Run LibreChat with clear setup instructions on Mongo failures.
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
const mongoUri = process.env.MONGO_URI || '';
logLine('MONGO_URI: ' + (mongoUri ? mongoUri.replace(/:[^:@]+@/, ':***@') : 'NOT SET'));
logLine('NODE_ENV: ' + process.env.NODE_ENV);
logLine('');

// Start LibreChat
logLine('Starting LibreChat...');
const proc = spawn('npm', ['run', 'backend'], {
  cwd: '/app',
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
});

let mongoIPError = false;
proc.stdout.on('data', d => {
  const s = d.toString();
  logStream.write(d);
  if (s.includes('IP whitelist') || s.includes("isn't whitelisted") || s.includes('Could not connect to any servers')) {
    mongoIPError = true;
  }
});
proc.stderr.on('data', d => {
  const s = d.toString();
  logStream.write(d);
  if (s.includes('IP whitelist') || s.includes("isn't whitelisted") || s.includes('Could not connect to any servers')) {
    mongoIPError = true;
  }
});

proc.on('exit', (code) => {
  logLine('');
  logLine('=== LibreChat exited code=' + code + ' ===');
  if (mongoIPError) {
    logLine('');
    logLine('═══════════════════════════════════════════════════════════════════');
    logLine('  ⚠ MongoDB Atlas IP Whitelist Issue');
    logLine('═══════════════════════════════════════════════════════════════════');
    logLine('');
    logLine('  Render uses dynamic IPs. You must allow ALL IPs in Atlas:');
    logLine('');
    logLine('  1. Go to: https://cloud.mongodb.com/v2/_clusters');
    logLine('  2. Select your cluster (cluster0.y9osekz)');
    logLine('  3. Sidebar → Network Access → Add IP Address');
    logLine('  4. Click "ALLOW ACCESS FROM ANYWHERE" → 0.0.0.0/0');
    logLine('  5. Confirm → wait 30s for Atlas to update');
    logLine('  6. Render Dashboard → librechat-nhutcoder → Manual Deploy');
    logLine('');
    logLine('  After whitelist, LibreChat will auto-start successfully.');
    logLine('═══════════════════════════════════════════════════════════════════');
  }
  logLine('=== Container staying alive for log retrieval ===');
});

// HTTP server
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

process.on('SIGTERM', () => process.exit(0));
