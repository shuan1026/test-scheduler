import type { RunRow } from "@/lib/runs";
import { formatDuration, formatTaipei } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

/**
 * 最近執行紀錄。資料由 Server Component 查好傳進來；
 * 頁面上的 <AutoRefresh /> 每 15 秒 router.refresh()，這張表和 Job 卡片會一起更新。
 */
export function RunsTable({ runs, queriedAt }: { runs: RunRow[]; queriedAt: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">每 15 秒自動更新・資料時間 {formatTaipei(queriedAt)}</p>
      {runs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          還沒有任何執行紀錄。到 AIBorn「排程工作」按「立即執行」，或在本機執行 <code>npm run job:heartbeat</code>。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Job</th>
                <th className="px-3 py-2 font-medium">狀態</th>
                <th className="px-3 py-2 font-medium">觸發</th>
                <th className="px-3 py-2 font-medium">開始（台灣時間）</th>
                <th className="px-3 py-2 font-medium">耗時</th>
                <th className="px-3 py-2 font-medium">版本</th>
                <th className="px-3 py-2 font-medium">AIBorn Run ID</th>
                <th className="px-3 py-2 font-medium">訊息</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {runs.map((run) => (
                <tr key={run.id} className="align-top">
                  <td className="px-3 py-2 tabular-nums text-zinc-400">{run.id}</td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    {run.jobName}
                    {run.tag ? <span className="ml-1 text-xs text-zinc-500">#{run.tag}</span> : null}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={run.status} stale={run.stale} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{run.trigger ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatTaipei(run.startedAt)}</td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatDuration(run.durationMs)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{run.appVersion ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs break-all">{run.aibornRunId ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400 break-all">{run.message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
