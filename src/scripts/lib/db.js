/**
 * 排程腳本用的 MySQL 連線（mysql2/promise）。
 *
 * AIBorn 規格：連線資訊讀 DATABASE_HOST / PORT / NAME / USER / PASSWORD，
 * 走 TCP + SSL 但不驗證憑證。排程不會經過 docker-entrypoint.sh，
 * 所以這裡直接從環境變數組設定，不依賴 entrypoint 先準備好任何東西。
 */
const mysql = require('mysql2/promise');

function dbConfigFromEnv(env = process.env) {
  const missing = ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER'].filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`缺少資料庫環境變數：${missing.join(', ')}（AIBorn：資料庫分頁 →「帶入第二步環境變數」）`);
  }
  const useSsl = String(env.DATABASE_SSL ?? 'true').toLowerCase() !== 'false';
  return {
    host: env.DATABASE_HOST,
    port: Number(env.DATABASE_PORT || 3306),
    database: env.DATABASE_NAME,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD ?? '',
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    // DATETIME 一律以 UTC 存取，畫面再轉 Asia/Taipei
    timezone: 'Z',
    connectTimeout: 10_000,
    connectionLimit: 2,
    // slow-task 會閒置很久：不保留閒置連線，結束時再開新連線寫結果，避免拿到已被切斷的連線
    maxIdle: 0,
    idleTimeout: 30_000,
    enableKeepAlive: true,
  };
}

function createPool() {
  return mysql.createPool(dbConfigFromEnv());
}

module.exports = { createPool, dbConfigFromEnv };
