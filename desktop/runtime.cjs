const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');

async function freePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

async function loadSettings(userData) {
  await fs.mkdir(userData, { recursive: true });
  const file = path.join(userData, 'desktop-settings.json');
  try {
    const settings = JSON.parse(await fs.readFile(file, 'utf8'));
    if (!Number.isInteger(settings.port) || settings.port < 1024 || settings.port > 65535 ||
        !/^[a-f0-9]{64}$/.test(settings.password)) {
      throw new Error('桌面配置损坏。请从帮助菜单打开数据目录并恢复 desktop-settings.json 备份。');
    }
    return settings;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const settings = { port: await freePort(), password: crypto.randomBytes(32).toString('hex') };
  await fs.writeFile(file, JSON.stringify(settings, null, 2), { flag: 'wx', mode: 0o600 });
  return settings;
}

// Next.js writes caches at runtime. Keep the installed bundle read-only and stage
// a versioned, private working copy, committing it only after the copy succeeds.
async function prepareRuntime(source, userData, version) {
  const buildId = (await fs.readFile(path.join(source, '.next', 'BUILD_ID'), 'utf8')).trim();
  const key = crypto.createHash('sha256').update(`${version}:${process.arch}:${buildId}`).digest('hex').slice(0, 20);
  const parent = path.join(userData, 'runtime');
  const destination = path.join(parent, key);
  const marker = path.join(destination, '.desktop-ready');
  try {
    await fs.access(marker);
    return destination;
  } catch { /* First run for this build. */ }
  await fs.mkdir(parent, { recursive: true });
  const staging = `${destination}.staging`;
  await fs.rm(staging, { recursive: true, force: true });
  await fs.cp(source, staging, { recursive: true, dereference: true });
  await fs.writeFile(path.join(staging, '.desktop-ready'), buildId);
  await fs.rm(destination, { recursive: true, force: true });
  await fs.rename(staging, destination);
  return destination;
}

function isAppURL(value, origin) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && !url.username && !url.password && url.origin === origin;
  } catch { return false; }
}

function isExternalURL(value) {
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}

module.exports = { loadSettings, prepareRuntime, isAppURL, isExternalURL };
