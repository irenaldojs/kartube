import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const server = spawn('cargo', ['run', '--locked', '--manifest-path', 'apps/server/Cargo.toml'], { stdio: ['ignore', 'pipe', 'inherit'] });
let ready = false;
let failure;
server.on('error', error => { failure = error; });
server.stdout.on('data', data => {
  process.stdout.write(data);
  if (data.toString().includes('http://127.0.0.1:3001')) ready = true;
});
try {
  const deadline = Date.now() + 120_000;
  while (!ready) {
    if (failure) throw failure;
    if (server.exitCode !== null) throw new Error(`Server exited: ${server.exitCode}`);
    if (Date.now() > deadline) throw new Error('Server startup timed out');
    await delay(100);
  }
  await import('./websocket-smoke.mjs');
  await import('./remote-session-smoke.mjs');
  await import('./browser-smoke.mjs');
} finally {
  if (server.exitCode === null && !failure) {
    const exited = once(server, 'exit');
    server.kill('SIGTERM');
    await exited;
  }
}
