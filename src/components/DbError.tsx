import { errorMessage } from "@/lib/format";

/** 資料庫連不上或表不存在時的提示，不讓整頁壞掉。 */
export function DbError({ error }: { error: unknown }) {
  const message = errorMessage(error);
  const tableMissing = /doesn't exist|ER_NO_SUCH_TABLE/i.test(message);
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
      <p className="font-medium">無法讀取資料庫</p>
      <p className="mt-1 font-mono text-xs break-all">{message}</p>
      <p className="mt-2 text-xs">
        {tableMissing
          ? "資料表還沒建立：本機請先執行 npm run db:migrate（容器啟動時會自動執行）。"
          : "請確認 DATABASE_HOST / PORT / NAME / USER / PASSWORD 已設定（AIBorn：資料庫分頁 →「帶入第二步環境變數」）。"}
      </p>
    </div>
  );
}
