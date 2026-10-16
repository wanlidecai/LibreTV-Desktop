const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

module.exports = async context => {
  const mac = context.electronPlatformName === 'darwin';
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const resources = mac ? path.join(app, 'Contents', 'Resources') : path.join(context.appOutDir, 'resources');
  for (const file of ['.next/BUILD_ID', '.next/required-server-files.json', 'node_modules/next/dist/server/lib/start-server.js', 'public/icons/icon-512.png']) {
    if (!fs.existsSync(path.join(resources, 'server', file))) throw new Error(`Packaged server is incomplete: ${file}`);
  }
  if (mac) {
    // Finder can add presentation metadata while packaging in a visible folder.
    // Remove only those signing-incompatible attributes from our build output.
    for (const attribute of ['com.apple.FinderInfo', 'com.apple.ResourceFork']) {
      execFileSync('/usr/bin/xattr', ['-dr', attribute, app], { stdio: 'pipe' });
    }
  }
};
