import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

// Run under xvfb-run on Linux with tauri-driver and WebKitWebDriver installed.
const executable = resolve(process.argv[2] ?? 'apps/native/src-tauri/target/release/kartube-native');
const driver = spawn('tauri-driver', ['--port', '4444', '--native-port', '4445'], { stdio: ['ignore', 'pipe', 'pipe'] });
let driverError, session;
let logs = '';
driver.on('error', error => { driverError = error; });
driver.stdout.on('data', data => { logs += data; });
driver.stderr.on('data', data => { logs += data; });
const call = async (method, path, body) => {
  const response = await fetch(`http://127.0.0.1:4444${path}`, {
    method, ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  const result = await response.json();
  if (!response.ok || result.value?.error) throw new Error(JSON.stringify(result));
  return result.value;
};
const execute = script => call('POST', `/session/${session}/execute/sync`, { script, args: [] });
const read = () => execute('const output = document.getElementById("report"); return output ? JSON.parse(output.textContent) : { status: "loading" }');
const waitFor = async predicate => {
  const deadline = Date.now() + 40_000;
  while (Date.now() < deadline) {
    const report = await read();
    if (report.status === 'error') throw new Error(JSON.stringify(report));
    if (predicate(report)) return report;
    await delay(200);
  }
  throw new Error(`Native scene timed out: ${JSON.stringify(await read())}`);
};
try {
  const deadline = Date.now() + 15_000;
  for (;;) {
    if (driverError) throw driverError;
    if (driver.exitCode !== null) throw new Error(`Driver exited: ${logs}`);
    try { await call('GET', '/status'); break; } catch {
      if (Date.now() > deadline) throw new Error(`Driver timed out: ${logs}`);
      await delay(100);
    }
  }
  const created = await call('POST', '/session', { capabilities: { alwaysMatch: { 'tauri:options': { application: executable } } } });
  session = created.sessionId;
  const running = await waitFor(report => report.status === 'running' && report.renderFrames > 2);
  assert.equal(running.runtime, 'tauri'); assert.equal(running.webgl2, true); assert.equal(running.wasm, true);
  assert.equal(running.scene, 'track');
  await waitFor(report => report.bodyY > 0.3 && report.bodyY < 0.4);
  await execute('document.getElementById("viewport").focus(); document.getElementById("viewport").dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp", bubbles: true }))');
  await waitFor(report => report.position.z < 5);
  await execute('window.dispatchEvent(new Event("blur")); document.getElementById("pause").click()');
  const paused = await read(); assert.equal(paused.status, 'paused');
  const screenshot = await call('GET', `/session/${session}/screenshot`);
  await writeFile('/tmp/kartube-native.png', Buffer.from(screenshot, 'base64'));
  await execute('document.getElementById("release").click()');
  const released = await read();
  assert.equal(released.status, 'disposed'); assert.equal(released.resourcesReleased, true);
  assert.equal(released.memory.geometries, 0);
  assert.deepEqual(released.release.physics, { worlds: 0, bodies: 0, colliders: 0 });
  await writeFile('/tmp/kartube-native-report.json', JSON.stringify({ running, paused, released, validation: { engine: 'Tauri / WebKitGTK', realAndroid: false, physicalGpu: false } }, null, 2) + '\n');
  await execute('document.getElementById("restart").click()');
  await waitFor(report => report.status === 'running');
  assert.equal(await execute('return document.querySelectorAll("canvas").length'), 1);
  console.log('Native Linux smoke passed: embedded client, WebGL2/WASM, driving, pause, release/restart');
} catch (error) {
  process.stderr.write(logs);
  throw error;
} finally {
  if (session) { try { await call('DELETE', `/session/${session}`); } catch {} }
  if (driver.exitCode === null && !driverError) { const exited = once(driver, 'exit'); driver.kill('SIGTERM'); await exited; }
}
