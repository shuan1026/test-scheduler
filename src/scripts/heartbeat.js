/**
 * 心跳：記錄一次執行，並印出排程容器的執行環境，用來確認 AIBorn 注入的內容。
 *
 *   node src/scripts/heartbeat.js [--tag=npm-cron]
 *
 * 觀察重點：
 *   - AIBORN_JOB_TRIGGER / AIBORN_JOB_RUN_ID 是否有值、是否與 AIBorn 執行紀錄一致
 *   - ENTRYPOINT_RAN 應為「(未設定)」→ 證明排程不會經過 docker-entrypoint.sh
 *   - PLAYGROUND_MARKER 在「只更新環境變數」後是否跟著變
 *   - appVersion 在重新部署後是否變成新版本
 */
const fs = require('node:fs');
const os = require('node:os');
const { runJob } = require('./lib/run-job');

const PRUNE_DAYS = 14;
const unset = '(未設定)';

runJob('heartbeat', {}, async ({ pool, log, aiborn }) => {
  const uploadDir = process.env.UPLOAD_DIR;
  const env = {
    trigger: aiborn.trigger,
    aibornJobId: aiborn.aibornJobId ?? unset,
    aibornRunId: aiborn.aibornRunId ?? unset,
    marker: process.env.PLAYGROUND_MARKER ?? unset,
    entrypointRan: process.env.ENTRYPOINT_RAN ?? unset,
    cwd: process.cwd(),
    node: process.version,
    tz: process.env.TZ ?? unset,
    port: process.env.PORT ?? unset,
    uploadDir: uploadDir ?? unset,
    uploadDirExists: uploadDir ? fs.existsSync(uploadDir) : false,
    hostname: os.hostname(),
    cpus: os.cpus().length,
    memoryMb: Math.round(os.totalmem() / 1024 / 1024),
  };
  log('INFO', '執行環境', { eventType: 'job_env', ...env });

  const [[{ notes }]] = await pool.query('SELECT COUNT(*) AS notes FROM notes');
  const cutoff = new Date(Date.now() - PRUNE_DAYS * 24 * 60 * 60 * 1000);
  const [pruned] = await pool.query('DELETE FROM cron_runs WHERE started_at < ?', [cutoff]);

  return [
    `marker=${env.marker}`,
    `entrypoint=${env.entrypointRan}`,
    `cwd=${env.cwd}`,
    `node=${env.node}`,
    `notes=${notes}`,
    `pruned=${pruned.affectedRows}`,
  ].join(' ');
});
