const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const executable = process.platform === 'win32'
  ? path.join(root, 'dist-desktop', 'win-unpacked', 'LibreTV Desktop.exe')
  : path.join(root, 'dist-desktop', process.arch === 'arm64' ? 'mac-arm64' : 'mac', 'LibreTV Desktop.app', 'Contents', 'MacOS', 'LibreTV Desktop');
if (!fs.existsSync(executable)) throw new Error(`Packaged executable not found: ${executable}`);
const result = spawnSync(process.execPath, [path.join(__dirname, 'smoke-desktop.cjs')], {
  cwd: root, stdio: 'inherit', env: { ...process.env, LIBRETV_EXECUTABLE: executable },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
