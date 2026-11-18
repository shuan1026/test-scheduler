# AIBorn 排程工作測試手冊（cron-playground）

這份手冊說明如何把 cron-playground 部署到 AIBorn、設定 5 筆排程，並逐項驗證排程工作的行為。每個測試都有「預期結果」和空白的「實際結果」欄，測試時直接填寫。

---

## 0. 前提

要測試的 AIBorn 環境必須：

- 已部署含「排程工作」功能的版本。這個功能在 2026-11-18 加入，資料表 migration 為 `20261118100000_project_scheduled_jobs`。
- 已開啟 `PROJECT_SCHEDULER_ENABLED=true`。沒開時專案頁不會有「排程工作」分頁，相關 API 一律回 404。
- 已建立 Cloud Scheduler `aiborn-scheduler-tick`，每分鐘呼叫 `/api/internal/scheduler-tick`（見 AIBorn `docs/GCPM_CONFIG.md` §13.6.3）。沒有它，「立即執行」可以用，但排程永遠不會自動觸發。
- 測試者在專案中的角色有部署權限。新增、修改、立即執行排程和查看 Log 都需要這個權限。

## 1. AIBorn 排程的運作方式（測試前先知道）

| 項目 | 行為 |
|---|---|
| 執行位置 | 每個專案一個 Cloud Run Job（`{service}-sched`），和網站分開的容器 |
| 程式與設定 | 一律使用**目前上線版本**的映像、環境變數、VPC 和磁碟區 |
| 指令執行方式 | `/bin/sh -c "<指令>"`，工作目錄是 Dockerfile 的 `WORKDIR`（本專案為 `/app`） |
| entrypoint | **不會執行**。ENTRYPOINT/CMD 都被覆蓋，所以 `docker-entrypoint.sh` 裡的建表等動作不會發生 |
| 額外環境變數 | `AIBORN_SCHEDULED_JOB_ID`、`AIBORN_JOB_RUN_ID`、`AIBORN_JOB_TRIGGER`（`schedule`／`manual`） |
| 頻率 | 每 10 分鐘、每小時、每天（分鐘只能選 00/10/20/30/40/50），或自訂 5 欄數字 cron；最短間隔 10 分鐘；時區固定 Asia/Taipei |
| 上限 | 每專案 5 筆；逾時可選 5/10/30/60 分（平台上限預設 60）；不重試 |
| 重疊 | 上一次還沒結束時，這次記為「已略過」；手動「立即執行」回「這筆排程還有執行尚未結束…」 |
| 手動執行頻率 | 每專案每 10 分鐘最多 10 次，超過會顯示「手動執行太頻繁，請稍後再試。」 |
| 錯過的時間點 | 不補跑 |
| Log | 取自 Cloud Logging，**可能延遲 1–2 分鐘**；只顯示 JSON log 的 `message` 欄位，`severity: ERROR` 的行標紅 |
| 執行紀錄 | 每筆排程保留最近 100 筆，畫面顯示 30 筆 |

本專案的腳本會在開始和結束時寫入 MySQL 的 `cron_runs` 表，網站「儀表板」會即時顯示。所以每次執行都可以從兩邊對照：AIBorn 的執行紀錄和 Log，以及 cron-playground 的儀表板。

## 2. 部署

### 2.1 建立專案和資料庫

1. 在 AIBorn 新增專案，類型選 **動態網站**。
2. 到專案的資料庫區塊建立 MySQL，然後按 **「帶入第二步環境變數」**。這會自動填入 `DATABASE_HOST`、`DATABASE_PORT`、`DATABASE_NAME`、`DATABASE_USER`、`DATABASE_PASSWORD`。
3. 在環境變數再手動加一行：

   ```
   PLAYGROUND_MARKER=v1
   ```

   其他變數不需要設定。`DATABASE_SSL` 預設為 true，AIBorn 上不用改。`PORT` 由平台注入，不要自己設定。

### 2.2 打包 ZIP

在專案根目錄執行：

```bash
git add -A && git commit -m "..."   # 有修改時先 commit；git archive 只打包已 commit 的內容
npm run pack:zip                    # 產生 cron-playground.zip
```

- 用 `git archive` 打包。它會依 `.gitignore` 排除 `node_modules`、`.next`、`.env`，並保證 ZIP 內有 `package-lock.json`。
- **不要**用檔案總管手動壓縮。檔案被鎖定時可能會靜默漏掉檔案，也容易把 `node_modules`、`.next` 一起包進去，AIBorn 會拒收。

### 2.3 上傳部署

1. 上傳 `cron-playground.zip`，按「部署新版本」，等部署紀錄顯示成功。
2. 開啟網站確認以下三點：
   - `/api/health` 回 `{"ok":true,"service":"cron-playground","version":"0.1.0"}`。
   - 首頁「排程儀表板」正常顯示。還沒有紀錄是正常的。
   - `/schedules` 頁最下方的「網站端執行環境」顯示 `ENTRYPOINT_RAN = 1`，資料庫連線為「正常（MySQL 8.4.x）」。

## 3. 建立 5 筆排程

到專案的 **「排程工作」** 分頁，按「＋ 新增排程」依序建立。網站的 `/schedules` 頁也有同一份清單，可以直接複製。

| # | 名稱 | 指令 | 頻率 | 逾時 |
|---|---|---|---|---|
| 1 | `cron-playground｜心跳 heartbeat` | `node src/scripts/heartbeat.js` | 每 10 分鐘 | 5 分 |
| 2 | `cron-playground｜自訂 cron + npm run` | `npm run job:heartbeat -- --tag=npm-cron && echo shell-chain-ok` | 自訂 cron `15,45 9-18 * * 1-5` | 5 分 |
| 3 | `cron-playground｜失敗測試 always-fail` | `node src/scripts/always-fail.js` | 每小時，分鐘 30 | 5 分 |
| 4 | `cron-playground｜逾時測試 7m/5m` | `node src/scripts/slow-task.js --seconds=420 --tag=timeout` | 每小時，分鐘 20 | 5 分 |
| 5 | `cron-playground｜重疊略過 15m/10m` | `node src/scripts/slow-task.js --seconds=900 --tag=overlap` | 每 10 分鐘 | 30 分 |

> 第 2 筆的 cron 意思是「週一到週五、9 點到 18 點，每小時的 15 分和 45 分」，用來同時測試清單（`,`）、範圍（`-`）和星期欄。在週末或下班時間測試時，可以暫時改成 `15,45 * * * *`。

## 4. 測試項目

儀表板每 15 秒自動更新。AIBorn 的 Log 可能延遲 1–2 分鐘，看不到時稍等再展開。

| ID | 情境 | 操作 | 預期結果 | 實際結果 |
|---|---|---|---|---|
| T1 | 手動執行 | 對 #1 按「立即執行」 | AIBorn：排隊中 → 執行中 → 成功。Log 有 `job_started`、`執行環境`、`job_completed`，且 `trigger=manual`。儀表板多一筆 heartbeat，**AIBorn Run ID 欄位與 AIBorn 執行紀錄一致** | |
| T2 | 自動觸發 | 等到下一個整 10 分（:00、:10…） | #1 自動執行，`trigger=schedule`，執行時間與排程時間相差在 1 分鐘內 | |
| T3 | 失敗狀態 | 對 #3 按「立即執行」，或等到 :30 | AIBorn 顯示「失敗」，訊息為「指令以非 0 的結束代碼結束…」。Log 中 `job_failed` 那行標紅。儀表板為「失敗」 | |
| T4 | 逾時 | 對 #4 按「立即執行」，或等到 :20 | 約 5 分鐘後 AIBorn 顯示「失敗」（逾時）。觀察儀表板：**「已終止」** 表示容器先收到 SIGTERM，Log 也會有 `job_terminated`；一直是 **「執行中」**、超過 60 分鐘後顯示「未結束（疑似被強制終止）」，表示是直接被殺掉 | |
| T5 | 重疊略過 | #5 開著等 30 分鐘以上 | 每次執行 15 分鐘，所以執行紀錄會出現「成功」和「已略過」交替。在 #5 執行中按「立即執行」，應顯示「這筆排程還有執行尚未結束，請等它完成後再試。」 | |
| T6 | 自訂 cron、npm run、shell 串接 | 新增 #2 時看表單預覽，之後按「立即執行」 | 表單預覽的下次執行時間符合 cron。執行成功，Log 最後一行是 `shell-chain-ok`。儀表板出現 `heartbeat #npm-cron` | |
| T7 | 重新部署後換映像 | 把 `package.json` 的 `version` 改成 `0.1.1`，commit，再 `npm run pack:zip` 並「部署新版本」 | 部署完成後，下一次 #1 的「版本」欄是 **0.1.1**，證明排程會跟著上線版本 | |
| T8 | 只更新環境變數 | 把 `PLAYGROUND_MARKER` 改成 `v2`，按「只更新環境變數」 | 下一次 #1 的 Log 和儀表板訊息出現 `marker=v2` | |
| T9 | entrypoint 不會執行 | 比對 #1 的 Log 和網站 `/schedules` | 排程 Log 是 `entrypointRan=(未設定)`，網站端是 `ENTRYPOINT_RAN = 1` | |
| T10 | 停用／啟用 | 停用 #1，觀察 20 分鐘，再啟用 | 停用期間沒有自動執行，「立即執行」仍然可以用。啟用後從下一個整 10 分恢復，**不會補跑**停用期間的時間點 | |
| T11 | 排程讀得到網站寫入的資料 | 在網站「實驗筆記」新增一筆，再對 #1 按「立即執行」 | 心跳訊息的 `notes=` 數字加 1 | |

每項測完可以在網站「實驗筆記」記下時間和觀察結果。

## 5. 收尾

- 測完先**停用 #4 和 #5**。#5 每 10 分鐘就要跑 15 分鐘，會一直消耗 Job 的 vCPU 時間。
- 要完全清除時刪除排程即可，執行紀錄會一起刪除。刪除專案時，AIBorn 也會一併刪除對應的 Cloud Run Job。

## 6. 常見問題

| 狀況 | 原因／處理 |
|---|---|
| 排程失敗，Log 有 `Cannot find module 'mysql2/promise'` | 映像裡沒有 mysql2。確認 `next.config.ts` 有 `serverExternalPackages: ["mysql2"]`。Turbopack 預設會把 mysql2 打包進 server chunk，standalone 就不會複製 `node_modules/mysql2` |
| 排程失敗，Log 有 `Cannot find module '/app/src/scripts/...'` | Dockerfile 最後一個 stage 沒有 `COPY ... /app/src/scripts`。standalone 不會自動帶入沒被網站 import 的檔案 |
| 排程失敗，Log 有 `缺少資料庫環境變數` | 環境變數沒有帶入 `DATABASE_*`。到資料庫區塊按「帶入第二步環境變數」後重新部署，或用「只更新環境變數」 |
| 排程失敗，Log 有 `Table ... doesn't exist` | 照理不會發生，因為每支腳本開跑時都會先建表。若發生，表示 DB 使用者沒有 CREATE 權限 |
| `npm run` 的 Log 出現 `.env not found. Continuing without it.` | 正常。npm script 用了 `--env-file-if-exists=.env`，方便本機開發；映像裡本來就沒有 `.env` |
| 「排程工作」分頁不見了 | 專案不是動態網站、`PROJECT_SCHEDULER_ENABLED` 沒開，或還沒有成功部署過 |
| 按「立即執行」後一直「排隊中」 | 看「執行紀錄」的錯誤訊息。10 分鐘內拿不到 execution 會自動標為失敗 |
| Log 是空的 | Cloud Logging 延遲 1–2 分鐘，稍後再展開 |
