/**
 * 排程腳本共用流程（寫法參考 valuation/api/src/scripts/expire-pending-orders.js）：
 *
 *   1. 解析參數（--tag 以及各腳本自訂參數）
 *   2. 建立連線、ensureSchema、在 cron_runs 新增一筆 running 紀錄、印 job_started
 *   3. 執行 fn：成功 → succeeded / job_completed；例外 → failed / job_failed，exitCode = 1
 *   4. 收到 SIGTERM（例如逾時被平台停止）→ 盡力記為 terminated，exit 143
 *   5. 最後一律關閉連線池
 *
 * AIBorn 會在排程容器注入 AIBORN_SCHEDULED_JOB_ID、AIBORN_JOB_RUN_ID、AIBORN_JOB_TRIGGER，
 * 這裡一併寫進紀錄，方便和 AIBorn「執行紀錄」對照。
 */
const os = require('node:os');
const { parseArgs } = require('node:util');
const { createPool } = require('./db');
const { ensureSchema } = require('./schema');
const { createLogger } = require('./logger');
const pkg = require('../../../package.json');

const MESSAGE_MAX = 500;

function readAibornEnv(env = process.env) {
  return {
    trigger: env.AIBORN_JOB_TRIGGER || 'local',
    aibornJobId: env.AIBORN_SCHEDULED_JOB_ID || null,
    aibornRunId: env.AIBORN_JOB_RUN_ID || null,
  };
}

function truncate(text, max = MESSAGE_MAX) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * @param {string} jobName 寫進 cron_runs.job_name 與 log 的名稱
 * @param {Record<string, import('node:util').ParseArgsOptionDescriptor>} argOptions 腳本自訂參數
 * @param {(ctx: { pool: import('mysql2/promise').Pool, log: Function, args: Record<string, any>, aiborn: ReturnType<typeof readAibornEnv>, rowId: number }) => Promise<string | void>} fn
 *   回傳的字串會寫進 cron_runs.message
 */
async function runJob(jobName, argOptions, fn) {
  const log = createLogger(jobName);
  const aiborn = readAibornEnv();
  const startedAt = new Date();
  const elapsed = () => Date.now() - startedAt.getTime();

  let pool = null;
  let rowId = null;
  let settled = false;

  async function settle(status, message) {
    if (settled || !pool || rowId == null) return;
    settled = true;
    const finishedAt = new Date();
    await pool.query(
      'UPDATE cron_runs SET status = ?, message = ?, finished_at = ?, duration_ms = ? WHERE id = ?',
      [status, truncate(message), finishedAt, finishedAt.getTime() - startedAt.getTime(), rowId]
    );
  }

  function onSignal(signal, exitCode) {
    log('WARNING', `job_terminated：收到 ${signal}（逾時或被平台停止）`, {
      eventType: 'job_terminated',
      signal,
      durationMs: elapsed(),
    });
    // 寫 DB 最多等 5 秒，之後無論如何結束
    const force = setTimeout(() => process.exit(exitCode), 5_000);
    settle('terminated', `收到 ${signal}，執行 ${Math.round(elapsed() / 1000)} 秒後被停止`)
      .catch((err) => log('ERROR', `無法寫入 terminated 紀錄：${err.message}`, { error: err.message }))
      .finally(() => {
        clearTimeout(force);
        process.exit(exitCode);
      });
  }
  process.once('SIGTERM', () => onSignal('SIGTERM', 143));
  process.once('SIGINT', () => onSignal('SIGINT', 130));

  try {
    const { values: args } = parseArgs({
      options: { tag: { type: 'string' }, ...argOptions },
      allowPositionals: false,
    });

    pool = createPool();
    await ensureSchema(pool);
    const [result] = await pool.query(
      `INSERT INTO cron_runs
         (job_name, tag, trigger_type, aiborn_job_id, aiborn_run_id, status, app_version, hostname, started_at)
       VALUES (?, ?, ?, ?, ?, 'running', ?, ?, ?)`,
      [
        jobName,
        args.tag ?? null,
        aiborn.trigger,
        aiborn.aibornJobId,
        aiborn.aibornRunId,
        pkg.version,
        truncate(os.hostname(), 100),
        startedAt,
      ]
    );
    rowId = result.insertId;

    log('INFO', 'job_started', {
      eventType: 'job_started',
      tag: args.tag ?? null,
      trigger: aiborn.trigger,
      aibornRunId: aiborn.aibornRunId,
      appVersion: pkg.version,
      rowId,
    });

    const message = (await fn({ pool, log, args, aiborn, rowId })) || 'ok';
    await settle('succeeded', message);
    log('INFO', 'job_completed', { eventType: 'job_completed', durationMs: elapsed(), result: truncate(message, 200) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.exitCode = Number.isInteger(err?.exitCode) && err.exitCode > 0 ? err.exitCode : 1;
    log('ERROR', `job_failed：${message}`, {
      eventType: 'job_failed',
      error: message,
      exitCode: process.exitCode,
      durationMs: elapsed(),
    });
    try {
      await settle('failed', message);
    } catch (dbErr) {
      log('ERROR', `無法寫入 failed 紀錄：${dbErr.message}`, { error: dbErr.message });
    }
  } finally {
    if (pool) await pool.end().catch(() => {});
  }
}

module.exports = { runJob, readAibornEnv };
