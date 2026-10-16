/* Real Electron smoke test. Run after npm run desktop:build. */
const { _electron: electron, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { randomUUID } = require('node:crypto');
const { bundledSources, sourceProvenance } = require('../desktop/bundled-sources.cjs');

const root = path.resolve(__dirname, '..');
const timeout = process.platform === 'win32' ? 180_000 : 120_000;
const artifacts = path.join(root, 'artifacts', `desktop-smoke-${process.platform}-${process.arch}`);
const marker = randomUUID();
const expectedSources = bundledSources.map((source, index) => ({
  key: `env_${index}`,
  name: source.name.trim(),
  url: source.url.trim().replace(/\/+$/, ''),
  ...(source.detail?.trim() ? { detail: source.detail.trim() } : {}),
  isAdult: false,
}));
let userData;
let current;
let page;
let origin;
const diagnostics = [];

function portIsOpen(port) {
  return new Promise(resolve => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    const done = value => { socket.destroy(); resolve(value); };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(500, () => done(false));
  });
}

function processExists(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; }
}

async function launch() {
  const env = { ...process.env, LIBRETV_USER_DATA: userData, NEXT_TELEMETRY_DISABLED: '1' };
  // Keep the fixture independent of a developer's server configuration.
  for (const key of Object.keys(env)) {
    if (key.startsWith('DEFAULT_') || ['ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS', 'PASSWORD', 'PROXY_SECRET'].includes(key)) delete env[key];
  }
  current = await electron.launch({
    ...(process.env.LIBRETV_EXECUTABLE ? { executablePath: process.env.LIBRETV_EXECUTABLE, args: [] } : { args: [path.join(root, 'desktop')] }),
    cwd: root, env, timeout,
  });
  current.process().stdout?.on('data', data => diagnostics.push(data.toString()));
  current.process().stderr?.on('data', data => diagnostics.push(data.toString()));
  const context = current.context();
  context.setDefaultTimeout(30_000);
  context.setDefaultNavigationTimeout(timeout);
  // Exercise the real local server/auth. Fixtures prevent external provider calls.
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.protocol === 'file:') return route.continue();
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (['/api/hot-list', '/api/douban'].includes(url.pathname)) return route.fulfill({ json: { items: [] } });
    if (url.pathname === '/api/bangumi/calendar') return route.fulfill({ json: { days: [] } });
    if (url.pathname === '/api/search') {
      const body = route.request().postDataJSON();
      const sources = Array.isArray(body?.sources) ? body.sources : [];
      const first = sources[0];
      const list = first ? [{
        sourceKey: first.key, sourceName: first.name, sourceUrl: first.url,
        vodId: 'desktop-smoke', name: `桌面烟测结果 ${body.wd}`, isAdult: false,
      }] : [];
      const events = [
        ...sources.map((source, index) => ({ type: 'source', sourceKey: source.key, ok: true, ms: 1, list: index === 0 ? list : [] })),
        { type: 'done', list, failures: [] },
      ];
      return route.fulfill({ contentType: 'application/x-ndjson', body: `${events.map(event => JSON.stringify(event)).join('\n')}\n` });
    }
    return route.continue();
  });
  page = await current.firstWindow({ timeout });
  page.on('pageerror', error => diagnostics.push(`Renderer: ${error.stack || error.message}`));
  await page.waitForURL(/^http:\/\/127\.0\.0\.1:\d+\/$/, { timeout });
  await expect(page.getByRole('heading', { name: 'LibreTV', exact: true })).toBeVisible();
  const newOrigin = new URL(page.url()).origin;
  if (origin) assert.equal(newOrigin, origin, 'Restart must preserve the origin used by browser storage');
  origin = newOrigin;
  const status = await page.evaluate(async () => {
    const response = await fetch('/api/status');
    return { ok: response.ok, body: await response.json() };
  });
  assert.equal(status.ok, true);
  assert.equal(status.body.passwordRequired, true);
  assert.equal(status.body.verified, true, 'Desktop must automatically authenticate the renderer');
  assert.deepEqual(status.body.defaultSources, expectedSources, 'The real API must expose every bundled upstream source without alteration');
  assert.deepEqual(status.body.defaultLiveSources, []);
  assert.deepEqual(await page.evaluate(() => ({ require: typeof require, process: typeof process })),
    { require: 'undefined', process: 'undefined' }, 'Renderer must not expose Node.js');
  const preferences = await current.evaluate(({ BrowserWindow }) => {
    const prefs = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return { nodeIntegration: prefs.nodeIntegration, contextIsolation: prefs.contextIsolation, sandbox: prefs.sandbox };
  });
  assert.deepEqual(preferences, { nodeIntegration: false, contextIsolation: true, sandbox: true });
  return status.body.version;
}

async function expectSelectedSources(sources) {
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('libretv-settings') || '{}');
    return (saved.state?.selectedKeys || []).slice().sort();
  }), { timeout: 15_000, message: 'Selected sources must persist in the application settings' })
    .toEqual(sources.map(source => source.key).sort());
}

async function inspectSourceSettings(selectedSources) {
  const settings = page.getByRole('dialog', { name: '设置', exact: true });
  await expect(settings).toBeVisible();
  await expect(settings.getByRole('checkbox')).toHaveCount(expectedSources.length);
  const selected = new Set(selectedSources.map(source => source.key));
  for (const source of expectedSources) {
    const checkbox = settings.getByRole('checkbox', { name: `选择 ${source.name}`, exact: true });
    await expect(checkbox).toBeVisible();
    await expect(settings.getByText(source.url, { exact: true })).toBeVisible();
    await expect(checkbox).toBeChecked({ checked: selected.has(source.key) });
  }
}

async function searchWithBundledSources(sources, phase) {
  const query = `桌面源烟测 ${phase} ${marker.slice(0, 8)}`;
  const requested = page.waitForRequest(request => {
    return new URL(request.url()).pathname === '/api/search' && request.method() === 'POST' && request.postDataJSON()?.wd === query;
  });
  await page.getByRole('combobox', { name: '搜索影片', exact: true }).fill(query);
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  const payload = (await requested).postDataJSON();
  assert.deepEqual(payload.sources, sources, 'Search must use precisely the enabled bundled sources');
  assert.equal(payload.filterAdult, true);
  await expect(page.getByRole('heading', { name: `桌面烟测结果 ${query}`, exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '搜索结果', exact: true })).toContainText('1 部影片');
  await page.screenshot({ path: path.join(artifacts, `source-search-${phase}.png`) });
  await page.getByRole('link', { name: 'LibreTV 首页', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'LibreTV', exact: true })).toBeVisible();
}

async function closeAndCheckServer() {
  const closing = current;
  const pids = await closing.evaluate(({ app }) => app.getAppMetrics().filter(item => item.type === 'Utility').map(item => item.pid));
  const exited = closing.waitForEvent('close', { timeout: 30_000 });
  await page.close(); // Simulate closing the actual desktop window.
  await exited;
  current = null;
  page = null;
  await expect.poll(() => portIsOpen(Number(new URL(origin).port)), { timeout: 15_000, message: 'Local server must stop after the last window closes' }).toBe(false);
  for (const pid of pids) {
    await expect.poll(() => processExists(pid), { timeout: 15_000, message: `Utility process ${pid} must exit` }).toBe(false);
  }
}

async function main() {
  assert.ok(expectedSources.length > 0, 'Desktop must bundle the requested upstream sources');
  assert.ok(bundledSources.every(source => source.isAdult === false), 'Bundled source metadata must explicitly mark non-adult sources');
  assert.ok(sourceProvenance, 'Bundled upstream sources must include provenance');
  await fs.mkdir(artifacts, { recursive: true });
  userData = await fs.mkdtemp(path.join(os.tmpdir(), 'libretv-desktop-smoke-'));
  const version = await launch();
  await expectSelectedSources(expectedSources);
  await page.screenshot({ path: path.join(artifacts, 'home.png') });
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await inspectSourceSettings(expectedSources);
  await page.screenshot({ path: path.join(artifacts, 'settings.png') });
  await page.getByRole('dialog', { name: '设置', exact: true }).getByRole('button', { name: '关闭', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '设置', exact: true })).toHaveCount(0);
  await searchWithBundledSources(expectedSources, 'initial');
  await current.evaluate(({ Menu }) => {
    const menu = Menu.getApplicationMenu();
    const settings = menu.items.find(item => item.label === '文件')?.submenu?.items.find(item => item.label === '设置');
    if (!settings) throw new Error('Native Settings menu is missing');
    settings.click();
  });
  await inspectSourceSettings(expectedSources);
  const remainingSources = expectedSources.slice(1);
  await page.getByRole('dialog', { name: '设置', exact: true }).getByRole('checkbox', { name: `选择 ${expectedSources[0].name}`, exact: true }).uncheck();
  await inspectSourceSettings(remainingSources);
  await expectSelectedSources(remainingSources);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '设置', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: '直播', exact: true }).click();
  await page.waitForURL(`${origin}/live`);
  await expect(page.getByText('请先在设置中添加直播源（M3U 订阅）', { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, 'live.png') });
  await page.getByRole('link', { name: 'LibreTV 首页', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'LibreTV', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^切换主题/ }).click();
  await page.getByRole('button', { name: /^切换主题/ }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('libretv-theme'))).toBe('light');
  // Write into the application's real history database, then verify it after restart.
  await page.evaluate(async token => {
    localStorage.setItem('desktop-smoke-marker', token);
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('libretv');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('searchHistory', 'readwrite');
        tx.objectStore('searchHistory').put({ text: token, timestamp: Date.now() });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
        tx.onabort = () => { db.close(); reject(tx.error || new Error('History write aborted')); };
      };
    });
  }, marker);
  await closeAndCheckServer();
  await launch();
  await expectSelectedSources(remainingSources);
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await inspectSourceSettings(remainingSources);
  await page.screenshot({ path: path.join(artifacts, 'settings-after-restart.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '设置', exact: true })).toHaveCount(0);
  if (remainingSources.length) await searchWithBundledSources(remainingSources, 'restarted');
  assert.deepEqual(await page.evaluate(() => ({ marker: localStorage.getItem('desktop-smoke-marker'), theme: localStorage.getItem('libretv-theme'), dark: document.documentElement.classList.contains('dark') })),
    { marker, theme: 'light', dark: false });
  const stored = await page.evaluate(token => new Promise((resolve, reject) => {
    const request = indexedDB.open('libretv');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('searchHistory', 'readonly');
      const result = tx.objectStore('searchHistory').get(token);
      result.onsuccess = () => resolve(result.result?.text);
      result.onerror = () => reject(result.error);
      tx.oncomplete = () => db.close();
    };
  }), marker);
  assert.equal(stored, marker, 'IndexedDB history must survive a complete restart');
  await closeAndCheckServer();
  await fs.writeFile(path.join(artifacts, 'result.json'), JSON.stringify({ passed: true, platform: process.platform, arch: process.arch, upstreamVersion: version, packaged: Boolean(process.env.LIBRETV_EXECUTABLE), bundledSourceCount: expectedSources.length, sourceProvenance, checks: ['automatic authentication', 'complete bundled sources in real API', 'bundled sources initially enabled and visible', 'bundled sources used by search UI', 'source opt-out survives restart and search', 'home/settings/live', 'native settings menu', 'renderer isolation', 'localStorage persistence', 'IndexedDB persistence', 'stable local origin', 'window close stops server'] }, null, 2));
  console.log(`Desktop smoke passed (${process.platform}/${process.arch}); evidence: ${artifacts}`);
}

let watchdog;
Promise.race([
  main(),
  new Promise((_, reject) => {
    watchdog = setTimeout(() => reject(new Error(`Desktop smoke exceeded ${timeout * 3 / 1000} seconds`)), timeout * 3);
  }),
]).catch(async error => {
  console.error(error);
  await fs.mkdir(artifacts, { recursive: true });
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(artifacts, 'failure.png') }).catch(() => {});
  await fs.writeFile(path.join(artifacts, 'failure.log'), `${error.stack || error}\n${diagnostics.join('\n')}`);
  if (userData) await fs.cp(path.join(userData, 'logs'), path.join(artifacts, 'app-logs'), { recursive: true }).catch(() => {});
  process.exitCode = 1;
}).finally(async () => {
  clearTimeout(watchdog);
  if (current) await current.close().catch(() => {});
  if (userData) await fs.rm(userData, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }).catch(() => {});
});
