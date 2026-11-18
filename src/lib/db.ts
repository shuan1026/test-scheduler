import mysql, { type Pool } from "mysql2/promise";

/**
 * 網站用的 MySQL 連線池。設定與 src/scripts/lib/db.js 相同（AIBorn 規格：TCP + SSL 不驗證憑證）。
 * 開發模式 HMR 會重新載入模組，所以把 pool 掛在 globalThis 上重複使用。
 */
const globalForDb = globalThis as typeof globalThis & { __cronPlaygroundPool?: Pool };

export class DbConfigError extends Error {}

export function getPool(): Pool {
  if (globalForDb.__cronPlaygroundPool) return globalForDb.__cronPlaygroundPool;

  const env = process.env;
  const missing = ["DATABASE_HOST", "DATABASE_NAME", "DATABASE_USER"].filter((key) => !env[key]);
  if (missing.length) {
    throw new DbConfigError(`缺少資料庫環境變數：${missing.join(", ")}`);
  }
  const useSsl = String(env.DATABASE_SSL ?? "true").toLowerCase() !== "false";

  const pool = mysql.createPool({
    host: env.DATABASE_HOST,
    port: Number(env.DATABASE_PORT || 3306),
    database: env.DATABASE_NAME,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD ?? "",
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    timezone: "Z",
    connectTimeout: 10_000,
    connectionLimit: 5,
    enableKeepAlive: true,
  });
  globalForDb.__cronPlaygroundPool = pool;
  return pool;
}
