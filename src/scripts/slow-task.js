/**
 * 慢速工作：睡滿指定秒數才成功結束，用來測試逾時與重疊略過。
 *
 *   node src/scripts/slow-task.js --seconds=420 --tag=timeout   # 搭配逾時 5 分 → 應被停止
 *   node src/scripts/slow-task.js --seconds=900 --tag=overlap   # 搭配每 10 分鐘 → 下一次應「已略過」
 *
 * 被停止時若收到 SIGTERM，cron_runs 會記為 terminated；若直接被殺掉，紀錄會停在 running。
 */
const { runJob } = require('./lib/run-job');

const PROGRESS_EVERY_MS = 30_000;
const MAX_SECONDS = 24 * 60 * 60;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

runJob('slow-task', { seconds: { type: 'string', default: '60' } }, async ({ log, args }) => {
  const seconds = Number(args.seconds);
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > MAX_SECONDS) {
    throw new Error(`--seconds 必須是 1–${MAX_SECONDS} 的整數，收到：${args.seconds}`);
  }

  const totalMs = seconds * 1000;
  const startedAt = Date.now();
  log('INFO', `開始等待 ${seconds} 秒`, { eventType: 'job_progress', seconds });

  for (;;) {
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs >= totalMs) break;
    await sleep(Math.min(PROGRESS_EVERY_MS, totalMs - elapsedMs));
    const done = Math.min(Math.round((Date.now() - startedAt) / 1000), seconds);
    log('INFO', `進度 ${done}/${seconds} 秒`, { eventType: 'job_progress', elapsedSeconds: done, seconds });
  }

  return `slept ${seconds}s`;
});
