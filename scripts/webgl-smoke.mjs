import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', 'apps/web', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: ['ignore', 'pipe', 'inherit'] });
let ready = false, failure;
server.on('error', error => { failure = error; });
server.stdout.on('data', data => { process.stdout.write(data); if (data.toString().includes('127.0.0.1:4173')) ready = true; });
let browser;
try {
  const deadline = Date.now() + 30_000;
  while (!ready) {
    if (failure) throw failure;
    if (server.exitCode !== null) throw new Error(`Preview exited ${server.exitCode}`);
    if (Date.now() > deadline) throw new Error('Preview timed out');
    await delay(100);
  }
  assert.equal((await fetch('http://127.0.0.1:4173')).status, 200);
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const read = async () => JSON.parse(await page.locator('#report').textContent());
  const readyScene = async () => page.waitForFunction(() => document.body.dataset.status === 'running', { timeout: 30_000 });
  await page.goto('http://127.0.0.1:4173'); await readyScene();
  const track = await read();
  assert.equal(track.camera.mode, 'chase'); assert.equal(track.shadow, 'contact');
  assert.equal(track.scene, 'track'); assert.equal(track.track.ramps, 2);
  assert.equal(track.track.boosts, 3); assert.equal(track.track.itemBoxes, 3);
  assert.equal(track.track.alternativeRoutes, 1);
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.getByRole('button', { name: 'Avançar 120 passos' }).click();
  await page.waitForFunction(() => {
    const report = JSON.parse(document.getElementById('report').textContent);
    return Math.abs(report.camera.position[1] - report.bodyY - 5) < 0.05;
  });
  const settledTrack = await read();
  assert.ok(settledTrack.bodyY >= 0.3 && settledTrack.bodyY <= 0.4, 'Kart must rest on the track at its spawn');
  assert.equal(settledTrack.shadowVisible, true);
  // Switching the camera preserves physics and keeps the kart's target in front of it.
  const chaseY = settledTrack.camera.position[1];
  assert.ok(chaseY > settledTrack.bodyY);
  assert.ok(Math.abs(settledTrack.camera.target[0] + 20) < 0.01);
  await page.screenshot({ path: '/tmp/kartube-chase.png', fullPage: true });
  await page.locator('#camera').selectOption('overview');
  const overview = await read();
  assert.equal(overview.physicsSteps, settledTrack.physicsSteps);
  assert.equal(overview.camera.mode, 'overview');
  assert.ok(overview.camera.position[1] > chaseY);
  await page.screenshot({ path: '/tmp/kartube-track.png', fullPage: true });
  await page.locator('#camera').selectOption('chase');
  assert.equal((await read()).physicsSteps, settledTrack.physicsSteps);
  await page.getByRole('button', { name: 'Liberar recursos' }).click();
  assert.equal(await page.locator('canvas').count(), 0);
  await page.getByRole('button', { name: 'Reiniciar teste' }).click(); await readyScene();
  assert.equal((await read()).scene, 'track');
  assert.equal(await page.locator('canvas').count(), 1);
  await page.locator('#scene').selectOption('drop'); await readyScene();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  const before = await read();
  await page.getByRole('button', { name: 'Avançar 120 passos' }).click();
  const report = await read();
  assert.equal(report.webgl2, true); assert.equal(report.wasm, true);
  assert.equal(report.physicsSteps, before.physicsSteps + 120);
  assert.ok(report.renderFrames > 0);
  assert.ok(report.bodyY >= 0.3 && report.bodyY <= 0.4, JSON.stringify(report));
  const colors = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
    const gl = document.querySelector('canvas').getContext('webgl2');
    const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const palette = new Set();
    for (let i = 0; i < pixels.length; i += 64) palette.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
    resolve(palette.size);
  })));
  assert.ok(colors > 8, `Expected scene pixels while paused, got ${colors} colors`);
  await page.screenshot({ path: '/tmp/kartube-webgl.png', fullPage: true });
  await writeFile('/tmp/kartube-webgl-report.json', JSON.stringify({ ...report, validation: { browser: 'Chromium headless', graphics: 'SwiftShader (software)', realAndroid: false, collisionRestHeightPassed: true } }, null, 2) + '\n');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportar relatório JSON' }).click();
  assert.equal((await download).suggestedFilename(), 'kartube-prova-3d.json');
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Liberar recursos' }).click();
    assert.equal(await page.locator('canvas').count(), 0); assert.equal((await read()).resourcesReleased, true);
    await page.getByRole('button', { name: 'Reiniciar teste' }).click(); await readyScene();
    assert.equal(await page.locator('canvas').count(), 1);
    assert.ok((await read()).memory.geometries <= 9);
  }
  await page.locator('#quality').selectOption('low'); await readyScene();
  assert.equal((await read()).quality, 'low'); assert.ok((await read()).pixelRatio <= 1);
  // Actual WebGL context loss should stop physics/render and permit an explicit restart.
  await page.evaluate(() => document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.waitForFunction(() => document.body.dataset.status === 'error');
  assert.equal((await read()).error, 'webgl_context_lost');
  await page.getByRole('button', { name: 'Reiniciar teste' }).click(); await readyScene();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  assert.deepEqual(errors, []);
  const fallback = await browser.newPage();
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind, ...args) { return kind === 'webgl2' ? null : original.call(this, kind, ...args); };
  });
  await fallback.goto('http://127.0.0.1:4173');
  await fallback.waitForFunction(() => document.body.dataset.status === 'error');
  assert.match(await fallback.locator('#status').textContent(), /WebGL2/);
  const wasmFallback = await browser.newPage();
  await wasmFallback.addInitScript(() => { window.WebAssembly = undefined; });
  await wasmFallback.goto('http://127.0.0.1:4173');
  await wasmFallback.waitForFunction(() => document.body.dataset.status === 'error');
  assert.match(await wasmFallback.locator('#status').textContent(), /WebAssembly/);
  assert.equal(await wasmFallback.locator('canvas').count(), 0);
  console.log('WebGL2/WASM smoke passed: render, collision, release/restart, context loss, mobile layout and unsupported fallback');
} finally {
  await browser?.close();
  if (server.exitCode === null && !failure) { const exited = once(server, 'exit'); server.kill('SIGTERM'); await exited; }
}
