/**
 * 在 AIBorn「排程工作」分頁要建立的 5 筆排程（每專案上限 5 筆）。
 * /schedules 頁面與 docs/AIBORN_SCHEDULER_TEST.md 的內容一致，改這裡時記得同步文件。
 */
export type RecommendedSchedule = {
  no: number;
  name: string;
  command: string;
  /** AIBorn 表單上的頻率選項 */
  frequency: string;
  /** 存檔後的 cron（Asia/Taipei） */
  cron: string;
  timeoutMinutes: number;
  purpose: string;
  expected: string;
};

export const RECOMMENDED_SCHEDULES: RecommendedSchedule[] = [
  {
    no: 1,
    name: "cron-playground｜心跳 heartbeat",
    command: "node src/scripts/heartbeat.js",
    frequency: "每 10 分鐘",
    cron: "*/10 * * * *",
    timeoutMinutes: 5,
    purpose: "基本排程、AIBORN_* 環境變數注入、重新部署／只更新環境變數後是否跟著變",
    expected: "成功；儀表板每 10 分鐘多一筆 trigger=schedule",
  },
  {
    no: 2,
    name: "cron-playground｜自訂 cron + npm run",
    command: "npm run job:heartbeat -- --tag=npm-cron && echo shell-chain-ok",
    frequency: "自訂 cron",
    cron: "15,45 9-18 * * 1-5",
    timeoutMinutes: 5,
    purpose: "自訂 cron（清單＋範圍＋星期）、/bin/sh -c 的 && 串接、映像內 npm run 可用",
    expected: "平日 9–18 點每小時 :15、:45 執行成功；Log 最後有 shell-chain-ok",
  },
  {
    no: 3,
    name: "cron-playground｜失敗測試 always-fail",
    command: "node src/scripts/always-fail.js",
    frequency: "每小時（:30）",
    cron: "30 * * * *",
    timeoutMinutes: 5,
    purpose: "非 0 結束代碼 →「失敗」狀態、ERROR Log 標紅",
    expected: "失敗；儀表板紀錄為 failed",
  },
  {
    no: 4,
    name: "cron-playground｜逾時測試 7m/5m",
    command: "node src/scripts/slow-task.js --seconds=420 --tag=timeout",
    frequency: "每小時（:20）",
    cron: "20 * * * *",
    timeoutMinutes: 5,
    purpose: "執行超過逾時設定會被停止；觀察是否先收到 SIGTERM",
    expected: "約 5 分鐘後失敗（逾時）；儀表板為 terminated 或停在 running",
  },
  {
    no: 5,
    name: "cron-playground｜重疊略過 15m/10m",
    command: "node src/scripts/slow-task.js --seconds=900 --tag=overlap",
    frequency: "每 10 分鐘",
    cron: "*/10 * * * *",
    timeoutMinutes: 30,
    purpose: "上一次還沒結束時，這次記為「已略過」；執行中按「立即執行」回 409",
    expected: "成功與已略過交替出現（測完記得停用）",
  },
];
