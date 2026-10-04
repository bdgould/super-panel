import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const playwrightPath = process.argv[2];
const { _electron } = await import(playwrightPath ? pathToFileURL(path.resolve(playwrightPath)).href : 'playwright');
fs.mkdirSync('logs', { recursive: true });
const electron = await _electron.launch({ executablePath: require('electron'), args: ['scripts/usage-ui-fixture.cjs'] });
const page = await electron.firstWindow();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const cards = page.locator('[data-usage-provider]');
const waitCount = async count => {
  await page.waitForFunction(count => document.querySelectorAll('[data-usage-provider]').length === count, count);
};
const settings = async () => page.getByRole('button', { name: 'Settings', exact: true }).click();
try {
  await page.getByRole('button', { name: 'Metrics only view' }).waitFor();
  assert.equal(await cards.count(), 0);
  await settings();
  const provider = name => page.locator('section').filter({ has: page.getByRole('heading', { name: 'AI usage', exact: true }) })
    .locator('div').filter({ has: page.getByRole('heading', { name, exact: true }) }).first();
  for (const name of ['Anthropic · Claude', 'OpenAI · Codex']) {
    await provider(name).getByRole('button', { name: 'Connect', exact: true }).click();
    await provider(name).getByRole('checkbox').waitFor();
  }
  // Connected accounts alone must not reveal cards.
  assert.equal(await cards.count(), 0);
  await provider('Anthropic · Claude').getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await cards.count(), 0);
  await settings();
  await provider('Anthropic · Claude').getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await waitCount(1);
  await settings();
  await provider('OpenAI · Codex').getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await waitCount(2);
  assert.equal(await page.getByRole('progressbar').count(), 4);
  assert.equal(await page.locator('[data-pace-marker]').count(), 4);
  assert.ok(!(await cards.first().innerText()).match(/reset|updated/i), 'Reset and update text are reserved for details');
  assert.equal(await cards.first().getByRole('img', { name: 'Claude', exact: true }).count(), 1);
  await page.screenshot({ path: 'logs/usage-ui-split.png' });
  // Usage stays left of the system metrics in the normal 1024x600 split layout.
  const ai = await cards.first().boundingBox();
  const cpu = await page.getByText('CPU', { exact: true }).boundingBox();
  assert.ok(ai.x + ai.width <= cpu.x, 'AI cards precede system metrics');
  assert.ok(await page.evaluate(() => {
    const card = document.querySelector('[data-usage-provider="codex"]');
    return card.getBoundingClientRect().bottom < innerHeight;
  }), 'Both cards fit the default height');
  await cards.first().hover();
  await page.mouse.down();
  assert.notEqual(await cards.first().evaluate(card => getComputedStyle(card).boxShadow), 'none', 'Press feedback is visible');
  await page.waitForTimeout(900);
  await page.mouse.up();
  await page.getByText('Last reported usage: 35%', { exact: true }).waitFor();
  await page.getByText(/Resets in 2h/).waitFor();
  assert.equal(await page.locator('[data-detail-pace-marker]').count(), 2);
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await page.getByRole('button', { name: 'Metrics only view' }).click();
  await page.screenshot({ path: 'logs/usage-ui-metrics.png' });
  await electron.evaluate(() => {
    const { service } = global.__usageTest;
    clearInterval(service.timer);
    service.states.claude.snapshot.observedAt = Date.now() - 400000;
    service.states.codex.snapshot.windows[0].resetsAt = Date.now() - 60000;
    service.states.codex.error = { code: 'network', message: 'Test network interruption' };
    service.publish();
  });
  await page.getByText('Test network interruption', { exact: true }).waitFor();
  assert.equal(await page.locator('[data-pace-marker]').count(), 1);
  assert.equal(await page.getByRole('progressbar').count(), 3);
  await cards.last().focus();
  await page.keyboard.press('Enter');
  await page.getByText('Awaiting updated window', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await settings();
  await provider('Anthropic · Claude').getByRole('button', { name: 'Disconnect', exact: true }).click();
  await waitCount(1);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await cards.getAttribute('data-usage-provider'), 'codex');
  await electron.evaluate(() => {
    const { window } = global.__usageTest;
    window.emit('minimize');
    if (global.__usageTest.service.visible) throw new Error('Polling did not pause');
    window.emit('restore');
    if (!global.__usageTest.service.visible) throw new Error('Polling did not resume');
  });
  assert.deepEqual(errors, []);
  console.log('Usage UI regression passed: opt-in, Cancel/Save, one/both cards, dials, layout, details, stale/reset/error, isolated disconnect, minimize/restore.');
} finally {
  await electron.close();
}
