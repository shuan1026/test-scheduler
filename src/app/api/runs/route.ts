import { connection } from "next/server";
import { errorMessage } from "@/lib/format";
import { listRecentRuns } from "@/lib/runs";

/** 儀表板輪詢用：最近 50 筆執行紀錄。 */
export async function GET() {
  await connection();
  try {
    const runs = await listRecentRuns(50);
    return Response.json({ runs });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
