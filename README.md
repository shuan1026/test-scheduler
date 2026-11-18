# cron-playground

部署到 **AIBorn（動態網站）** 的 Next.js 專案，用來測試 AIBorn 的「排程工作」功能。

- 網站：排程儀表板（`/`）、排程設定小抄＋網站端執行環境（`/schedules`）、實驗筆記（`/notes`）、`GET /api/health`
- 排程腳本：`src/scripts/*.js`，以 `node src/scripts/xxx.js` 執行（寫法參考 valuation/api 的 `expire-pending-orders.js`）
- 資料庫：MySQL 8.4（AIBorn 提供），用 mysql2 直接下 SQL

**AIBorn 部署與排程測試步驟見 [docs/AIBORN_SCHEDULER_TEST.md](docs/AIBORN_SCHEDULER_TEST.md)。**

## 排程腳本

| 指令 | 用途 |
|---|---|
| `node src/scripts/heartbeat.js [--tag=x]` | 心跳：記錄一次執行，Log 印出 `AIBORN_*`、`PLAYGROUND_MARKER`、`ENTRYPOINT_RAN`、cwd、Node 版本等執行環境 |
| `node src/scripts/always-fail.js [--code=N]` | 一定失敗（結束代碼 1 或 N） |
| `node src/scripts/slow-task.js --seconds=N [--tag=x]` | 睡 N 秒後成功；收到 SIGTERM 時記為 terminated、exit 143 |
| `node src/scripts/migrate.js` | 建表（容器啟動時由 `docker-entrypoint.sh` 執行） |

每支腳本都走 [src/scripts/lib/run-job.js](src/scripts/lib/run-job.js) 的共用流程：

1. 先建表。排程不會經過 entrypoint，所以每支腳本自己處理。
2. 在 `cron_runs` 寫入一筆 `running`。
3. 執行。
4. 更新為 `succeeded`、`failed` 或 `terminated`。

Log 是單行 JSON，欄位包含 `severity`、`message`、`eventType`（`job_started`／`job_completed`／`job_failed`）。

### 新增一支排程腳本

```js
// src/scripts/my-job.js
const { runJob } = require('./lib/run-job');

runJob('my-job', { /* parseArgs 參數定義，例如 limit: { type: 'string' } */ }, async ({ pool, log, args }) => {
  const [result] = await pool.query('UPDATE ... WHERE ...');
  log('INFO', '處理完成', { affectedRows: result.affectedRows });
  return `affected=${result.affectedRows}`; // 會寫進 cron_runs.message
});
```

只用到 `mysql2` 和 Node 內建模組的腳本，不需要改 Dockerfile。若要用**其他 npm 套件**，該套件也必須出現在映像裡。做法是讓網站也 import 它並列進 `serverExternalPackages`，或在 Dockerfile 另外安裝。

## 本機開發

需要 Node.js 22.9 以上（建議 24）和 Docker Desktop。

```bash
npm install
cp .env.example .env    # 改成：DATABASE_PORT=3307、DATABASE_USER=cron、DATABASE_PASSWORD=cron-dev-only
docker compose up -d db # 本機 MySQL 8.4（對外 3307）
npm run db:migrate
npm run dev             # http://localhost:3000

npm run job:heartbeat   # 本機跑排程腳本（會讀 .env）
npm run job:fail
npm run job:slow -- --seconds=5
```

## 用正式映像模擬 AIBorn 排程

```bash
docker compose up -d --build   # 網站 → http://localhost:8080（會先跑 docker-entrypoint.sh 建表）

# AIBorn 以 /bin/sh -c 覆蓋 ENTRYPOINT 執行指令，這裡用 --entrypoint 模擬
docker compose run --rm --entrypoint /bin/sh app -c "node src/scripts/heartbeat.js"
docker compose run --rm --entrypoint /bin/sh app -c "npm run job:heartbeat -- --tag=npm && echo shell-chain-ok"
docker compose run --rm -e AIBORN_JOB_TRIGGER=manual --entrypoint /bin/sh app -c "node src/scripts/always-fail.js"; echo "exit=$?"

docker compose down     # 加 -v 會一併刪除 MySQL 資料
```

> Git Bash（Windows）會把 `/bin/sh` 轉成 Windows 路徑，請在指令前加 `MSYS_NO_PATHCONV=1`，或改用 PowerShell。

## 打包上傳

```bash
git add -A && git commit -m "..."
npm run pack:zip        # → cron-playground.zip（git archive，只包含已 commit 的檔案）
```

## 映像重點（[Dockerfile](Dockerfile)）

- 使用 `output: "standalone"`，執行映像只放 `server.js` 和追蹤到的 `node_modules`。
- `serverExternalPackages: ["mysql2"]`：Next 16 的 Turbopack 預設會把 mysql2 打包進 server chunk，standalone 就不會有 `node_modules/mysql2`，排程腳本會 `Cannot find module`。標成外部套件後，mysql2 和它的相依套件都會被複製出來。
- 最後一個 stage 額外複製 `src/scripts` 和 `package.json`。排程要用，而 standalone 不會帶。
- 基底是 `node:24-alpine`：有 `/bin/sh`，AIBorn 排程必須；也有 `npm`，供 `npm run job:*` 使用。
- `WORKDIR /app`，排程指令以這裡為工作目錄。
- 只有網站容器會執行 `docker-entrypoint.sh`，排程不會。

## Next.js 16 注意事項

本專案開啟了 `cacheComponents`，所以不能使用 `export const dynamic = "force-dynamic"`。讀 DB 的元件和函式要先呼叫 `await connection()`，並包在 `<Suspense>` 裡。這樣 `next build`（在 AIBorn 的 Cloud Build 上執行，沒有 DB）時就不會連資料庫。
