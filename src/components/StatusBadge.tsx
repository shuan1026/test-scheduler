import type { RunStatus } from "@/lib/runs";

const STYLES: Record<RunStatus | "stale", { label: string; className: string }> = {
  succeeded: { label: "成功", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200" },
  failed: { label: "失敗", className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200" },
  running: { label: "執行中", className: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200" },
  terminated: { label: "已終止", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200" },
  stale: { label: "未結束（疑似被強制終止）", className: "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200" },
};

export function StatusBadge({ status, stale = false }: { status: RunStatus; stale?: boolean }) {
  const style = STYLES[stale ? "stale" : status] ?? { label: status, className: "bg-zinc-100 text-zinc-700" };
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}
