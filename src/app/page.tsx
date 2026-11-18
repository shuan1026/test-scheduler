import { Suspense } from "react";
import { connection } from "next/server";
import { DbError } from "@/components/DbError";
import { RunsTable } from "@/components/RunsTable";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDuration, formatTaipei } from "@/lib/format";
import { listJobSummaries, listRecentRuns, type JobSummary, type RunRow } from "@/lib/runs";

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">排程儀表板</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          AIBorn 的排程在另一個容器（Cloud Run Job）執行，與網站共用同一個映像與 MySQL。每支排程腳本開跑與結束時都會寫入
          <code className="mx-1">cron_runs</code>，所以這裡看到的就是排程容器實際做了什麼。可對照 AIBorn「排程工作」的執行紀錄與 Log。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">各 Job 最新狀態</h2>
        <Suspense fallback={<Placeholder className="h-28" />}>
          <JobCards />
        </Suspense>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">最近執行紀錄</h2>
        <Suspense fallback={<Placeholder className="h-64" />}>
          <RecentRuns />
        </Suspense>
      </section>
    </div>
  );
}

function Placeholder({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900 ${className}`} />;
}

async function JobCards() {
  await connection();
  let summaries: JobSummary[];
  try {
    summaries = await listJobSummaries();
  } catch (error) {
    return <DbError error={error} />;
  }
  if (summaries.length === 0) {
    return <p className="text-sm text-zinc-500">尚無資料。</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {summaries.map((s) => (
        <JobCard key={s.key} summary={s} />
      ))}
    </div>
  );
}

function JobCard({ summary }: { summary: JobSummary }) {
  const last: RunRow = summary.last;
  const c = summary.last24h;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">
          {summary.jobName}
          {summary.tag ? <span className="ml-1 text-xs text-zinc-500">#{summary.tag}</span> : null}
        </div>
        <StatusBadge status={last.status} stale={last.stale} />
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-zinc-500">最後執行</dt>
        <dd className="tabular-nums">{formatTaipei(last.startedAt)}</dd>
        <dt className="text-zinc-500">觸發／耗時</dt>
        <dd>
          {last.trigger ?? "—"}・{formatDuration(last.durationMs)}
        </dd>
        <dt className="text-zinc-500">近 24 小時</dt>
        <dd>
          共 {c.total} 次：成功 {c.succeeded}・失敗 {c.failed}・終止 {c.terminated}
          {c.running ? `・執行中 ${c.running}` : ""}
        </dd>
      </dl>
    </div>
  );
}

async function RecentRuns() {
  await connection();
  let runs: RunRow[];
  try {
    runs = await listRecentRuns(50);
  } catch (error) {
    return <DbError error={error} />;
  }
  return <RunsTable initialRuns={runs} />;
}
