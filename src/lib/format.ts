const taipei = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** ISO 字串 → 台灣時間 `YYYY/MM/DD HH:mm:ss`（server 與瀏覽器輸出一致）。 */
export function formatTaipei(iso: string | null | undefined): string {
  if (!iso) return "—";
  return taipei.format(new Date(iso));
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} 秒`;
  return `${Math.floor(s / 60)} 分 ${s % 60} 秒`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
