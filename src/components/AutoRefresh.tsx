"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 每隔 intervalMs 呼叫 router.refresh()，讓整頁的 Server Component（Job 卡片、執行紀錄表）重新查 DB。
 * 分頁在背景時不刷新，避免沒人看也一直查資料庫。
 */
export function AutoRefresh({ intervalMs = 15_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);
  return null;
}
