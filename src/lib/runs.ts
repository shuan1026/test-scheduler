import { connection } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getPool } from "./db";

/** 執行超過這個時間還是 running，就視為「未結束（疑似被強制終止）」。對應平台逾時上限 60 分。 */
export const STALE_RUNNING_MS = 60 * 60 * 1000;

export type RunStatus = "running" | "succeeded" | "failed" | "terminated";

export type RunRow = {
  id: number;
  jobName: string;
  tag: string | null;
  trigger: string | null;
  aibornJobId: string | null;
  aibornRunId: string | null;
  status: RunStatus;
  /** running 且超過 STALE_RUNNING_MS */
  stale: boolean;
  message: string | null;
  appVersion: string | null;
  hostname: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
};

export type JobSummary = {
  key: string;
  jobName: string;
  tag: string | null;
  last: RunRow;
  last24h: { total: number; succeeded: number; failed: number; terminated: number; running: number };
};

export type Note = { id: number; content: string; createdAt: string };

type RunRecord = RowDataPacket & {
  id: number;
  job_name: string;
  tag: string | null;
  trigger_type: string | null;
  aiborn_job_id: string | null;
  aiborn_run_id: string | null;
  status: RunStatus;
  message: string | null;
  app_version: string | null;
  hostname: string | null;
  started_at: Date;
  finished_at: Date | null;
  duration_ms: number | null;
};

function toRun(r: RunRecord, now: number): RunRow {
  return {
    id: Number(r.id),
    jobName: r.job_name,
    tag: r.tag,
    trigger: r.trigger_type,
    aibornJobId: r.aiborn_job_id,
    aibornRunId: r.aiborn_run_id,
    status: r.status,
    stale: r.status === "running" && now - r.started_at.getTime() > STALE_RUNNING_MS,
    message: r.message,
    appVersion: r.app_version,
    hostname: r.hostname,
    startedAt: r.started_at.toISOString(),
    finishedAt: r.finished_at ? r.finished_at.toISOString() : null,
    durationMs: r.duration_ms,
  };
}

/** 最近的執行紀錄（新到舊）。 */
export async function listRecentRuns(limit = 50): Promise<RunRow[]> {
  await connection(); // 只在請求時查 DB，build 時不連線
  const [rows] = await getPool().query<RunRecord[]>(
    "SELECT * FROM cron_runs ORDER BY started_at DESC, id DESC LIMIT ?",
    [limit]
  );
  const now = Date.now();
  return rows.map((r) => toRun(r, now));
}

/** 每個 job（job_name + tag）最後一次執行與近 24 小時統計。 */
export async function listJobSummaries(): Promise<JobSummary[]> {
  await connection();
  const now = Date.now();
  const since = new Date(now - 24 * 60 * 60 * 1000);
  const pool = getPool();

  const [latest] = await pool.query<RunRecord[]>(
    `SELECT r.* FROM cron_runs r
       JOIN (SELECT MAX(id) AS id FROM cron_runs GROUP BY job_name, tag) m ON m.id = r.id
      ORDER BY r.job_name, r.tag`
  );
  const [counts] = await pool.query<(RowDataPacket & { job_name: string; tag: string | null; status: RunStatus; n: number })[]>(
    `SELECT job_name, tag, status, COUNT(*) AS n FROM cron_runs
      WHERE started_at >= ? GROUP BY job_name, tag, status`,
    [since]
  );

  const keyOf = (jobName: string, tag: string | null) => `${jobName}${tag ? `#${tag}` : ""}`;
  return latest.map((r) => {
    const key = keyOf(r.job_name, r.tag);
    const last24h = { total: 0, succeeded: 0, failed: 0, terminated: 0, running: 0 };
    for (const c of counts) {
      if (keyOf(c.job_name, c.tag) !== key) continue;
      const n = Number(c.n);
      last24h.total += n;
      if (c.status in last24h) last24h[c.status] += n;
    }
    return { key, jobName: r.job_name, tag: r.tag, last: toRun(r, now), last24h };
  });
}

export async function listNotes(limit = 100): Promise<Note[]> {
  await connection();
  const [rows] = await getPool().query<(RowDataPacket & { id: number; content: string; created_at: Date })[]>(
    "SELECT id, content, created_at FROM notes ORDER BY created_at DESC, id DESC LIMIT ?",
    [limit]
  );
  return rows.map((r) => ({ id: Number(r.id), content: r.content, createdAt: r.created_at.toISOString() }));
}

export async function insertNote(content: string): Promise<void> {
  await getPool().query("INSERT INTO notes (content, created_at) VALUES (?, ?)", [content, new Date()]);
}

/** 網站端的資料庫狀態（給 /schedules 的環境資訊）。 */
export async function checkDatabase(): Promise<{ ok: true; version: string } | { ok: false; error: string }> {
  await connection();
  try {
    const [rows] = await getPool().query<(RowDataPacket & { version: string })[]>("SELECT VERSION() AS version");
    return { ok: true, version: rows[0]?.version ?? "unknown" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
