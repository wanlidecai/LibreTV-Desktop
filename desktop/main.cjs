const { app, BrowserWindow, Menu, dialog, shell, utilityProcess, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { loadSettings, prepareRuntime, isAppURL, isExternalURL } = require('./runtime.cjs');

const REPOSITORY = 'https://github.com/wanlidecai/LibreTV-Desktop';
app.setName('LibreTV');
if (process.env.LIBRETV_USER_DATA) app.setPath('userData', path.resolve(process.env.LIBRETV_USER_DATA));
else app.setPath('userData', path.join(app.getPath('appData'), 'LibreTV Desktop'));

let window;
let server;
let origin;
let quitting = false;
let log;

function writeLog(message) {
  if (log) log.write(`[${new Date().toISOString()}] ${message}\n`);
}

async function openExternal(url) {
  if (isExternalURL(url)) await shell.openExternal(url);
}

function installMenu() {
  const navigate = route => { if (origin && window && !window.isDestroyed()) void window.loadURL(origin + route); };
  const template = [
    ...(process.platform === 'darwin' ? [{ label: 'LibreTV', submenu: [
      { role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' },
    ] }] : []),
    { label: '文件', submenu: [
      { label: '首页', accelerator: 'CmdOrCtrl+1', click: () => navigate('/') },
      { label: '直播', accelerator: 'CmdOrCtrl+2', click: () => navigate('/live') },
      { label: '设置', accelerator: 'CmdOrCtrl+,', click: () => {
        if (origin && window && isAppURL(window.webContents.getURL(), origin)) {
          void window.webContents.executeJavaScript('document.querySelector(\'button[aria-label="设置"]\')?.click()');
        }
      } },
      { type: 'separator' }, { role: 'quit', label: '退出 LibreTV' },
    ] },
    { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: '显示', submenu: [{ role: 'reload', label: '刷新' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen', label: '全屏' }] },
    { label: '帮助', submenu: [
      { label: '使用说明', click: () => openExternal(`${REPOSITORY}/blob/main/docs/DESKTOP.md`) },
      { label: '下载新版本', click: () => openExternal(`${REPOSITORY}/releases/latest`) },
      { label: '源码与许可证', click: () => openExternal(REPOSITORY) },
      { type: 'separator' },
      { label: '打开数据目录', click: () => shell.openPath(app.getPath('userData')) },
      { label: '打开日志目录', click: () => shell.openPath(app.getPath('logs')) },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  window = new BrowserWindow({
    title: 'LibreTV', width: 1280, height: 840, minWidth: 800, minHeight: 600,
    backgroundColor: '#0b101a', show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, spellcheck: false },
  });
  window.once('ready-to-show', () => { if (!window.isDestroyed()) window.show(); });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (origin && isAppURL(url, origin)) {
      const target = new URL(url);
      if (target.pathname === '/api/live/playlist' && target.searchParams.get('format') === 'm3u') window.webContents.downloadURL(url);
      else void window.loadURL(url);
    }
    else void openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!isAppURL(url, origin)) { event.preventDefault(); void openExternal(url); }
  });
  window.webContents.on('will-redirect', (event, url) => {
    if (!isAppURL(url, origin)) event.preventDefault();
  });
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.webContents.on('render-process-gone', (_event, details) => writeLog(`Renderer stopped: ${details.reason}`));
  return window.loadFile(path.join(__dirname, 'loading.html'));
}

function launchServer(dir, settings) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, NODE_ENV: 'production', PORT: String(settings.port), HOSTNAME: '127.0.0.1', PASSWORD: settings.password,
      PROXY_SECRET: settings.password, COOKIE_SECURE: 'false', NEXT_TELEMETRY_DISABLED: '1' };
    delete env.NODE_OPTIONS;
    delete env.NODE_PATH;
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.NEXT_PRIVATE_WORKER;
    server = utilityProcess.fork(path.join(__dirname, 'server.cjs'), [dir], { env, cwd: dir, stdio: 'pipe', serviceName: 'LibreTV Local Server' });
    const timeout = setTimeout(() => { reject(new Error('本地服务启动超时，请查看日志后重试。')); server?.kill(); }, 90_000);
    server.stdout.on('data', chunk => writeLog(chunk.toString().trimEnd()));
    server.stderr.on('data', chunk => writeLog(chunk.toString().trimEnd()));
    server.on('message', message => {
      if (message.type === 'ready') { clearTimeout(timeout); resolve(); }
      if (message.type === 'error') { clearTimeout(timeout); reject(new Error(message.message)); }
    });
    server.once('exit', code => {
      clearTimeout(timeout);
      server = null;
      const error = new Error(`本地服务已退出（${code}）。端口 ${settings.port} 如被其他程序占用，请先关闭该程序后重试。`);
      reject(error);
      if (origin && !quitting) { dialog.showErrorBox('LibreTV 服务已停止', error.message); app.quit(); }
    });
  });
}

async function start() {
  app.setAboutPanelOptions({ applicationName: 'LibreTV Desktop', applicationVersion: app.getVersion(), copyright: 'LibreTV contributors · AGPL-3.0-or-later', website: REPOSITORY });
  app.setAppUserModelId('io.github.wanlidecai.libretv');
  app.setPath('logs', path.join(app.getPath('userData'), 'logs'));
  fs.mkdirSync(app.getPath('logs'), { recursive: true });
  const logFile = path.join(app.getPath('logs'), 'desktop.log');
  if (fs.existsSync(logFile) && fs.statSync(logFile).size > 2 * 1024 * 1024) fs.renameSync(logFile, `${logFile}.previous`);
  log = fs.createWriteStream(logFile, { flags: 'a' });
  writeLog(`Starting LibreTV ${app.getVersion()} on ${process.platform}/${process.arch}`);
  const allowedPermissions = new Set(['clipboard-sanitized-write', 'fileSystem', 'fullscreen']);
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    const requestingURL = details.requestingUrl || contents?.getURL();
    callback(Boolean(origin && contents && isAppURL(contents.getURL(), origin) && isAppURL(requestingURL, origin) && allowedPermissions.has(permission)));
  });
  session.defaultSession.setPermissionCheckHandler((_contents, permission, requestingOrigin) => {
    return Boolean(origin && isAppURL(requestingOrigin, origin) && allowedPermissions.has(permission));
  });
  installMenu();
  await createWindow();
  const settings = await loadSettings(app.getPath('userData'));
  if (quitting || window.isDestroyed()) return;
  const source = app.isPackaged ? path.join(process.resourcesPath, 'server') : path.join(__dirname, '..', '.desktop-server');
  const dir = await prepareRuntime(source, app.getPath('userData'), app.getVersion());
  if (quitting || window.isDestroyed()) return;
  await launchServer(dir, settings);
  if (quitting || window.isDestroyed()) return;
  const address = `http://127.0.0.1:${settings.port}`;
  // Authenticate through the original API; no password or Node API reaches the renderer.
  const response = await fetch(`${address}/api/auth`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: settings.password }), signal: AbortSignal.timeout(15_000),
  });
  const token = /(?:^|;\s*)ltv_session=([^;]+)/.exec(response.headers.get('set-cookie') || '')?.[1];
  if (!response.ok || !token) throw new Error('本地服务验证失败，请退出后重试。');
  await session.defaultSession.cookies.set({ url: address, name: 'ltv_session', value: token, path: '/', httpOnly: true, secure: false, sameSite: 'lax' });
  if (quitting || window.isDestroyed()) return;
  origin = address;
  await window.loadURL(origin);
  writeLog('Desktop ready');
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (window && !window.isDestroyed()) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); }
  });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => { quitting = true; server?.kill(); });
  app.on('will-quit', () => log?.end());
  app.whenReady().then(start).catch(error => {
    writeLog(error.stack || error.message);
    if (!quitting) dialog.showErrorBox('LibreTV 无法启动', `${error.message}\n\n日志位置：${app.getPath('logs')}`);
    app.quit();
  });
}
