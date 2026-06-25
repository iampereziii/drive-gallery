import 'dotenv/config';
import os from 'node:os';
import { loadConfig } from './config';
import { buildApp } from './app';

/** All non-internal IPv4 addresses, so we can tell the user what to type on their phone. */
function lanUrls(port: number): string[] {
  const out: string[] = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal) out.push(`http://${a.address}:${port}`);
    }
  }
  return out;
}

try {
  const config = loadConfig();
  const app = buildApp(config);

  app.listen(config.port, config.host, () => {
    console.log('\n  Drive Gallery');
    console.log(`  Serving: ${config.photosRoot}`);
    console.log(`  Local:   http://localhost:${config.port}`);
    for (const url of lanUrls(config.port)) {
      console.log(`  Network: ${url}   ← open this on your phone`);
    }
    console.log('');
  });
} catch (err) {
  console.error(`\n  [Drive Gallery] Failed to start: ${(err as Error).message}\n`);
  process.exit(1);
}
