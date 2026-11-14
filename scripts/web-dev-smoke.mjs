import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const temporary = await mkdtemp(join(tmpdir(), 'kartube-dev-'));
let browser;
try {
  const emptyConfig = join(temporary, 'vite.config.mjs');
  await writeFile(emptyConfig, 'export default {};\n');
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const withoutMetadata of [false, true]) {
    const args = ['node_modules/vite/bin/vite.js', 'apps/web', '--host', '127.0.0.1', '--port', '4174', '--strictPort'];
    if (withoutMetadata) args.push('--config', emptyConfig);
    const server = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let ready = false, failure, logs = '';
    server.on('error', error => { failure = error; });
    server.stdout.on('data', data => { logs += data; if (String(data).includes('127.0.0.1:4174')) ready = true; });
    server.stderr.on('data', data => { logs += data; });
    try {
      const deadline = Date.now() + 30_000;
      while (!ready) {
        if (failure) throw failure;
        if (server.exitCode !== null || Date.now() > deadline) throw new Error(logs || 'Dev server timed out');
        await delay(100);
      }
      const page = await browser.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto('http://127.0.0.1:4174');
        await page.waitForFunction(() => document.body.dataset.status === 'running');
        const report = JSON.parse(await page.locator('#report').textContent());
        if (withoutMetadata) assert.equal(report.buildId, 'development-unversioned');
        else assert.match(report.buildId, /@/);
        assert.equal(report.webgl2, true); assert.equal(report.wasm, true);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    } finally {
      if (server.exitCode === null && !failure) { const exited = once(server, 'exit'); server.kill('SIGTERM'); await exited; }
    }
  }
  console.log('Web dev smoke passed: boot with and without build metadata');
} finally {
  await browser?.close();
  await rm(temporary, { recursive: true, force: true });
}
