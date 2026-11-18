/**
 * 失敗測試：一定會失敗，用來確認 AIBorn 會把非 0 結束代碼顯示為「失敗」、ERROR Log 標紅。
 *
 *   node src/scripts/always-fail.js            # 結束代碼 1
 *   node src/scripts/always-fail.js --code=2   # 指定結束代碼
 */
const { runJob } = require('./lib/run-job');

runJob('always-fail', { code: { type: 'string' } }, async ({ log, args }) => {
  log('INFO', '這支腳本會故意失敗，用來測試 AIBorn 的「失敗」狀態與 ERROR Log');
  const error = new Error('故意失敗（always-fail 測試）');
  if (args.code !== undefined) {
    const code = Number(args.code);
    if (!Number.isInteger(code) || code < 1 || code > 255) {
      throw new Error(`--code 必須是 1–255 的整數，收到：${args.code}`);
    }
    error.exitCode = code;
  }
  throw error;
});
