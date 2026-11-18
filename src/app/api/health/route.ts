import pkg from "../../../../package.json";

/** AIBorn 規格：GET /api/health 回 200。不連 DB，DB 掛掉時服務仍算「已啟動」。 */
export function GET() {
  return Response.json({ ok: true, service: pkg.name, version: pkg.version });
}
