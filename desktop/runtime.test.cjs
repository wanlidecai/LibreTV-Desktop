const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { loadSettings, prepareRuntime, isAppURL, isExternalURL } = require('./runtime.cjs');

async function temporaryDirectory(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'libretv-runtime-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

async function fixture(directory, buildId = 'build-one') {
  await fs.mkdir(path.join(directory, '.next'), { recursive: true });
  await fs.writeFile(path.join(directory, '.next', 'BUILD_ID'), buildId);
  await fs.writeFile(path.join(directory, 'server.js'), `// ${buildId}\n`);
  return directory;
}

test('settings preserve the origin and private password across restarts', async t => {
  const root = await temporaryDirectory(t);
  const userData = path.join(root, '用户资料 with spaces');
  const first = await loadSettings(userData);
  assert.ok(Number.isInteger(first.port) && first.port >= 1024 && first.port <= 65535);
  assert.match(first.password, /^[a-f0-9]{64}$/);
  const file = path.join(userData, 'desktop-settings.json');
  const contents = await fs.readFile(file, 'utf8');
  assert.deepEqual(await loadSettings(userData), first);
  assert.equal(await fs.readFile(file, 'utf8'), contents);
  if (process.platform !== 'win32') {
    assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
  }
});

test('damaged settings are rejected without silently losing the existing origin', async t => {
  const root = await temporaryDirectory(t);
  const file = path.join(root, 'desktop-settings.json');
  const password = 'a'.repeat(64);
  const invalidContents = [
    '{',
    'null',
    JSON.stringify({ port: 0, password }),
    JSON.stringify({ port: 65536, password }),
    JSON.stringify({ port: '42000', password }),
    JSON.stringify({ port: 42000, password: 'short' }),
    JSON.stringify({ port: 42000 }),
  ];
  for (const contents of invalidContents) {
    await fs.writeFile(file, contents);
    await assert.rejects(loadSettings(root));
    assert.equal(await fs.readFile(file, 'utf8'), contents);
  }
});

test('a copied runtime is reusable without erasing its writable cache', async t => {
  const root = await temporaryDirectory(t);
  const source = await fixture(path.join(root, '安装包 with spaces'));
  const userData = path.join(root, '用户资料');
  const installed = await prepareRuntime(source, userData, '1.0.0');
  assert.notEqual(installed, source);
  assert.equal(await fs.readFile(path.join(installed, '.desktop-ready'), 'utf8'), 'build-one');
  assert.equal(await fs.readFile(path.join(installed, 'server.js'), 'utf8'), '// build-one\n');
  const cache = path.join(installed, '.next', 'cache');
  await fs.mkdir(cache);
  await fs.writeFile(path.join(cache, 'saved'), 'cached content');
  assert.equal(await prepareRuntime(source, userData, '1.0.0'), installed);
  assert.equal(await fs.readFile(path.join(cache, 'saved'), 'utf8'), 'cached content');
  await assert.rejects(fs.access(path.join(source, '.desktop-ready')), { code: 'ENOENT' });
});

test('a different build or app version gets a new runtime and keeps the old build', async t => {
  const root = await temporaryDirectory(t);
  const source = await fixture(path.join(root, 'bundle'));
  const userData = path.join(root, 'data');
  const first = await prepareRuntime(source, userData, '1.0.0');
  await fixture(source, 'build-two');
  const second = await prepareRuntime(source, userData, '1.0.0');
  assert.notEqual(second, first);
  assert.equal(await fs.readFile(path.join(first, 'server.js'), 'utf8'), '// build-one\n');
  assert.equal(await fs.readFile(path.join(second, 'server.js'), 'utf8'), '// build-two\n');
  const third = await prepareRuntime(source, userData, '1.1.0');
  assert.notEqual(third, second);
  assert.equal(await fs.readFile(path.join(second, '.desktop-ready'), 'utf8'), 'build-two');
});

test('an interrupted copy never publishes a ready runtime and a retry replaces its staging files', async t => {
  const root = await temporaryDirectory(t);
  const source = await fixture(path.join(root, 'bundle'));
  const userData = path.join(root, 'data');
  const previous = await prepareRuntime(source, userData, '1.0.0');
  await fixture(source, 'build-two');
  let staging;
  const copy = t.mock.method(fs, 'cp', async (_source, destination) => {
    staging = destination;
    await fs.mkdir(destination, { recursive: true });
    await fs.writeFile(path.join(destination, 'incomplete'), 'partial copy');
    throw Object.assign(new Error('Simulated interrupted copy'), { code: 'EIO' });
  });
  await assert.rejects(prepareRuntime(source, userData, '1.0.0'), { code: 'EIO' });
  copy.mock.restore();
  assert.ok(staging.endsWith('.staging'));
  const destination = staging.slice(0, -'.staging'.length);
  await assert.rejects(fs.access(destination), { code: 'ENOENT' });
  assert.equal(await fs.readFile(path.join(previous, '.desktop-ready'), 'utf8'), 'build-one');
  const recovered = await prepareRuntime(source, userData, '1.0.0');
  assert.equal(recovered, destination);
  assert.equal(await fs.readFile(path.join(recovered, '.desktop-ready'), 'utf8'), 'build-two');
  await assert.rejects(fs.access(path.join(recovered, 'incomplete')), { code: 'ENOENT' });
  await assert.rejects(fs.access(staging), { code: 'ENOENT' });
});

test('missing build metadata cannot replace an installed runtime', async t => {
  const root = await temporaryDirectory(t);
  const source = await fixture(path.join(root, 'bundle'));
  const userData = path.join(root, 'data');
  const previous = await prepareRuntime(source, userData, '1.0.0');
  await fs.unlink(path.join(source, '.next', 'BUILD_ID'));
  await assert.rejects(prepareRuntime(source, userData, '2.0.0'), { code: 'ENOENT' });
  assert.equal(await fs.readFile(path.join(previous, '.desktop-ready'), 'utf8'), 'build-one');
});

test('navigation allows only ordinary URLs at the exact local origin', () => {
  const origin = 'http://127.0.0.1:42000';
  for (const value of [origin, `${origin}/live?source=test#channel`, `${origin}/api/live/playlist?format=m3u`]) {
    assert.equal(isAppURL(value, origin), true, value);
  }
  for (const value of [
    'http://127.0.0.1:42001/', 'http://localhost:42000/',
    'https://127.0.0.1:42000/', 'http://127.0.0.1.example.com:42000/',
    'http://user:password@127.0.0.1:42000/', `blob:${origin}/example`,
    'file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,test', '/relative', '',
  ]) {
    assert.equal(isAppURL(value, origin), false, value);
  }
  assert.equal(isAppURL(origin, undefined), false);
});

test('external navigation never invokes non-web protocol handlers', () => {
  assert.equal(isExternalURL('https://github.com/wanlidecai/LibreTV-Desktop'), true);
  assert.equal(isExternalURL('http://example.com/help'), true);
  for (const value of [
    'file:///Applications/Example.app', 'javascript:alert(1)', 'data:text/html,test',
    'mailto:example@example.com', 'ms-settings:', 'blob:https://example.com/id',
    '//example.com/path', 'not a URL', '',
  ]) {
    assert.equal(isExternalURL(value), false, value);
  }
});
