// entrypoint.js — Run LibreChat on Render PORT (10000) directly.
// If LibreChat crashes, fall back to log+health server on same port.
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

// IMPORTANT: LibreChat reads PORT env var directly and binds to it.
// We just start it. Our log+health server will only start IF LibreChat exits.
let libreChatStarted = false;
let logServerStarted = false;

function startLogServer() {
  if (logServerStarted) return;
  logServerStarted = true;
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
    logLine('Log+health server listening on ' + PORT + ' (fallback mode)');
  });
}

logLine('Starting LibreChat (binds to PORT ' + PORT + ')...');

const proc = spawn('npm', ['run', 'backend'], {
  cwd: '/app',
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
});

let mongoIPError = false;
proc.stdout.on('data', d => {
  const s = d.toString();
  logStream.write(d);
  if (s.includes('Server listening') || s.includes('listening on') || s.includes('ready')) {
    libreChatStarted = true;
  }
  if (s.includes('IP whitelist') || s.includes("isn't whitelisted") || s.includes('Could not connect to any servers')) {
    mongoIPError = true;
  }
});
proc.stderr.on('data', d => {
  const s = d.toString();
  logStream.write(d);
  if (s.includes('Server listening') || s.includes('listening on') || s.includes('ready')) {
    libreChatStarted = true;
  }
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
    logLine('  1. https://cloud.mongodb.com/v2/_clusters → cluster0.y9osekz');
    logLine('  2. Network Access → Add IP Address');
    logLine('  3. Click "ALLOW ACCESS FROM ANYWHERE" → 0.0.0.0/0');
    logLine('  4. Wait 30s → Render Dashboard → Manual Deploy');
    logLine('═══════════════════════════════════════════════════════════════════');
  }
  logLine('');
  logLine('=== Container staying alive for log retrieval ===');
  // Only start fallback log server if LibreChat crashed
  startLogServer();
});

process.on('SIGTERM', () => {
  proc.kill('SIGTERM');
  process.exit(0);
});
