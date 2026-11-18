import { Suspense } from "react";
import { connection } from "next/server";
import { CopyButton } from "@/components/CopyButton";
import { checkDatabase } from "@/lib/runs";
import { RECOMMENDED_SCHEDULES } from "@/lib/schedules";
import pkg from "../../../package.json";

const RULES = [
  "只有「動態網站」專案有排程工作分頁，且至少要成功部署過一次。",
  "每個專案最多 5 筆排程；任兩次執行間隔至少 10 分鐘；時區固定 Asia/Taipei。",
  "預設頻率的分鐘只能選 00、10、20、30、40、50；其他時間請用自訂 cron（5 欄數字語法，不支援 MON、@daily）。",
  "指令以 /bin/sh -c 在 Dockerfile 的 WORKDIR（/app）執行，可用 &&、管線；docker-entrypoint.sh 不會執行。",
  "使用目前上線版本的映像與環境變數；不重試；上一次還沒結束時，這次記為「已略過」。",
  "Log 來自 Cloud Logging，可能延遲 1–2 分鐘；只顯示 JSON log 的 message 欄位。",
];

export default function SchedulesPage() {
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">排程設定</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          在 AIBorn 專案的「排程工作」分頁，依下表新增 5 筆排程（剛好是每專案上限）。完整測試步驟見
          <code className="mx-1">docs/AIBORN_SCHEDULER_TEST.md</code>。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">建議排程</h2>
        <div className="space-y-3">
          {RECOMMENDED_SCHEDULES.map((s) => (
            <article key={s.no} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-zinc-900 px-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">#{s.no}</span>
                <span className="font-medium">{s.name}</span>
                <CopyButton text={s.name} />
              </div>
              <div className="mt-3 flex items-start gap-2">
                <code className="flex-1 rounded bg-zinc-100 px-2 py-1 font-mono text-xs break-all dark:bg-zinc-900">{s.command}</code>
                <CopyButton text={s.command} />
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-zinc-500">頻率</dt>
                <dd>
                  {s.frequency}
                  <code className="ml-2 text-zinc-500">{s.cron}</code>
                </dd>
                <dt className="text-zinc-500">逾時</dt>
                <dd>{s.timeoutMinutes} 分鐘</dd>
                <dt className="text-zinc-500">測試目的</dt>
                <dd>{s.purpose}</dd>
                <dt className="text-zinc-500">預期結果</dt>
                <dd>{s.expected}</dd>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">AIBorn 排程規則重點</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">網站端執行環境</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          與心跳排程 Log 的「執行環境」對照：網站容器會經過 docker-entrypoint.sh（ENTRYPOINT_RAN=1），排程容器不會。
        </p>
        <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />}>
          <RuntimeInfo />
        </Suspense>
      </section>
    </div>
  );
}

async function RuntimeInfo() {
  await connection(); // 讀執行期的環境變數，不能在 build 時就固定下來
  const db = await checkDatabase();
  const unset = "(未設定)";
  const rows: Array<[string, string]> = [
    ["版本（package.json）", pkg.version],
    ["Node.js", process.version],
    ["ENTRYPOINT_RAN", process.env.ENTRYPOINT_RAN ?? unset],
    ["PLAYGROUND_MARKER", process.env.PLAYGROUND_MARKER ?? unset],
    ["TZ", process.env.TZ ?? unset],
    ["PORT", process.env.PORT ?? unset],
    ["UPLOAD_DIR", process.env.UPLOAD_DIR ?? unset],
    ["DATABASE_HOST", process.env.DATABASE_HOST ? "已設定" : unset],
    ["資料庫連線", db.ok ? `正常（MySQL ${db.version}）` : `失敗：${db.error}`],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
      {rows.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="font-mono text-xs text-zinc-500">{key}</dt>
          <dd className="font-mono text-xs break-all">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
