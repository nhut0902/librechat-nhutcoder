// entrypoint.js — Run LibreChat with clear setup instructions on Mongo failure.
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

// Check if MONGO_URI looks valid
const hasValidMongo = mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://');
const isPlaceholder = mongoUri.includes('placeholder') || mongoUri.includes('example') ||
                       mongoUri.includes('your-') || mongoUri.includes('<');

if (!hasValidMongo || isPlaceholder) {
  logLine('⚠ MONGO_URI not configured or invalid — showing setup instructions');
  logLine('');
  logLine('═══════════════════════════════════════════════════════════════════');
  logLine('  LibreChat needs MongoDB. Setup your free MongoDB Atlas:');
  logLine('═══════════════════════════════════════════════════════════════════');
  logLine('');
  logLine('1. Go to: https://www.mongodb.com/cloud/atlas/register');
  logLine('2. Signup (no credit card needed for free M0 cluster)');
  logLine('3. Create FREE cluster (M0, 512MB, never expires)');
  logLine('4. Database Access → Add user:');
  logLine('   Username: librechat');
  logLine('   Password: <your-strong-password>');
  logLine('5. Network Access → Add IP: 0.0.0.0/0 (allow anywhere)');
  logLine('6. Connect → Drivers → Copy connection string:');
  logLine('   mongodb+srv://librechat:<password>@cluster0.xxxxx.mongodb.net/LibreChat');
  logLine('7. Render Dashboard → librechat-nhutcoder service → Environment');
  logLine('   → Update MONGO_URI = your-actual-connection-string');
  logLine('8. Manual Deploy → Deploy latest commit');
  logLine('');
  logLine('Container will stay alive on /health for health checks.');
  logLine('This page (/) shows setup instructions + LibreChat logs.');
  logLine('═══════════════════════════════════════════════════════════════════');

  // Still start LibreChat so user can see it fail and check logs
  const proc = spawn('npm', ['run', 'backend'], {
    cwd: '/app',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  proc.stdout.on('data', d => logStream.write(d));
  proc.stderr.on('data', d => logStream.write(d));
  proc.on('exit', (code) => {
    logLine('');
    logLine('=== LibreChat exited code=' + code + ' (expected — MONGO_URI not set) ===');
    logLine('=== Container staying alive for setup instructions ===');
  });
} else {
  logLine('✓ MONGO_URI configured. Starting LibreChat...');
  const proc = spawn('npm', ['run', 'backend'], {
    cwd: '/app',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  proc.stdout.on('data', d => logStream.write(d));
  proc.stderr.on('data', d => logStream.write(d));
  proc.on('exit', (code) => {
    logLine('');
    logLine('=== LibreChat exited code=' + code + ' ===');
    logLine('=== Container staying alive for log retrieval ===');
  });
}

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
