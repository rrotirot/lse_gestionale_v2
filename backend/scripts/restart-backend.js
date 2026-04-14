/**
 * Restart backend even if port already in use.
 *
 * Usage:
 *   node scripts/restart-backend.js dev
 *   node scripts/restart-backend.js start
 *
 * It kills processes LISTENING on PORT (default 5000),
 * then runs `npm run <script>`.
 */

const { spawnSync } = require('child_process');

function getPort() {
  const raw = process.env.PORT ?? '5000';
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : 5000;
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', stdio: 'pipe', ...opts });
}

function unique(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function getListeningPidsWindows(port) {
  const res = run('netstat', ['-ano', '-p', 'tcp']);
  const out = (res.stdout || '') + '\n' + (res.stderr || '');
  const pids = [];

  // Example:
  // TCP    0.0.0.0:5000           0.0.0.0:0              LISTENING       12345
  const lines = out.split(/\r?\n/);
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    if (!l.toUpperCase().includes('LISTENING')) continue;
    if (!l.includes(`:${port}`)) continue;

    const parts = l.split(/\s+/);
    const pid = parts[parts.length - 1];
    if (/^\d+$/.test(pid)) pids.push(pid);
  }
  return unique(pids);
}

function killPidWindows(pid) {
  // /T kills child processes, /F forces
  run('taskkill', ['/PID', String(pid), '/T', '/F']);
}

function getListeningPidsUnix(port) {
  // lsof might not be installed in minimal systems; we try it anyway.
  const res = run('lsof', ['-ti', `:${port}`]);
  const out = (res.stdout || '').trim();
  if (!out) return [];
  return unique(out.split(/\s+/));
}

function killPidUnix(pid) {
  run('kill', ['-9', String(pid)]);
}

function main() {
  const script = (process.argv[2] || 'dev').trim();
  const port = getPort();

  const isWindows = process.platform === 'win32';
  const pids = isWindows ? getListeningPidsWindows(port) : getListeningPidsUnix(port);

  if (pids.length > 0) {
    for (const pid of pids) {
      try {
        if (isWindows) killPidWindows(pid);
        else killPidUnix(pid);
      } catch {
        // best-effort
      }
    }
  }

  // Run the desired npm script
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';
  const res = spawnSync(npmCmd, ['run', script], { stdio: 'inherit' });
  process.exit(res.status ?? 0);
}

main();

