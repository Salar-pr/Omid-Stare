'use strict';
/**
 * server.js — entry point.
 * - production: node src/server.js
 * - dev:        npm run dev (node --watch)
 */
const { buildApp } = require('./app');
const config = require('./config');
const { checkConnection } = require('./db/client');
const { migrate } = require('./db/migrate');

async function main() {
  const app = await buildApp();

  const shutdown = (signal) => {
    app.log.info(`${signal} — shutting down`);
    app.close().then(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // DB check در استارت (فشل کردن server را نمی‌راند — /api/health وضعیت را نشان می‌دهد)
  checkConnection()
    .then((r) => app.log.info(`db: ${r.up ? 'up' : 'down'} (${r.latencyMs}ms)`))
    .catch(() => app.log.warn('db: down at boot — /api/health را چک کن'));
}

main();
