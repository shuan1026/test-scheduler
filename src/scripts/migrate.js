/**
 * 建立／補齊資料表。網站容器啟動時由 docker-entrypoint.sh 執行；本機可用 `npm run db:migrate`。
 *
 *   node src/scripts/migrate.js
 */
const { createPool } = require('./lib/db');
const { ensureSchema } = require('./lib/schema');
const { createLogger } = require('./lib/logger');

const log = createLogger('migrate');

async function main() {
  const startedAt = Date.now();
  const pool = createPool();
  try {
    await ensureSchema(pool);
    log('INFO', '資料表已就緒', { eventType: 'job_completed', durationMs: Date.now() - startedAt });
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((error) => {
  log('ERROR', `建表失敗：${error.message}`, { eventType: 'job_failed', error: error.message });
  process.exitCode = 1;
});
