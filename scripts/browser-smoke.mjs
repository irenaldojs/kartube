import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:3001');
  await page.getByRole('button', { name: 'Conectar e enviar hello' }).click();
  await page.waitForFunction(() => document.querySelector('#output').textContent.includes('welcome'));
  const reply = JSON.parse(await page.locator('#output').textContent());
  assert.equal(reply.protocolVersion, 1);
  assert.equal(reply.payload.type, 'welcome');
  assert.deepEqual(errors, []);
  console.log('Browser smoke passed: Chromium → WebSocket → Rust → welcome');
} finally { await browser.close(); }
