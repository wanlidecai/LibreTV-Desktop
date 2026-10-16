const fs = require('node:fs');
const path = require('node:path');

// A live stream can keep Next's graceful shutdown waiting indefinitely. Give
// pending cache writes a short grace period, then release all sockets on quit.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => setTimeout(() => process.exit(0), 2000).unref());
}

async function main() {
  const dir = process.argv[2];
  process.chdir(dir);
  const { config } = JSON.parse(fs.readFileSync(path.join(dir, '.next', 'required-server-files.json'), 'utf8'));
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
  const { startServer } = require(path.join(dir, 'node_modules/next/dist/server/lib/start-server.js'));
  await startServer({
    dir,
    isDev: false,
    config,
    hostname: '127.0.0.1',
    port: Number(process.env.PORT),
    allowRetry: false,
  });
  process.parentPort.postMessage({ type: 'ready' });
}

main().catch(error => {
  console.error(error);
  process.parentPort.postMessage({ type: 'error', message: error.message });
  process.exit(1);
});
