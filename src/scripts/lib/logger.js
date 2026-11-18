/**
 * 單行 JSON log（Cloud Logging 會解析成 jsonPayload）。
 *
 * - `severity`：INFO / WARNING / ERROR，AIBorn 的 Log 檢視會把 ERROR 標紅。
 * - `message`：AIBorn 只顯示 jsonPayload.message，所以把重要欄位也串進 message 文字裡。
 * - `eventType`：沿用 valuation/api 的 job_started / job_completed / job_failed 慣例。
 */

// eventType 已在文字裡、error 也會由呼叫端寫進文字，不重複串進 message
const HIDDEN_IN_MESSAGE = new Set(['eventType', 'error']);

function formatFields(fields) {
  const parts = [];
  for (const [key, value] of Object.entries(fields)) {
    if (HIDDEN_IN_MESSAGE.has(key)) continue;
    if (value === undefined) continue;
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.length ? ` | ${parts.join(' ')}` : '';
}

function createLogger(jobName) {
  return function log(severity, text, fields = {}) {
    const entry = {
      severity,
      message: `[${jobName}] ${text}${formatFields(fields)}`,
      time: new Date().toISOString(),
      jobName,
      ...fields,
    };
    const line = JSON.stringify(entry);
    if (severity === 'ERROR') console.error(line);
    else console.log(line);
  };
}

module.exports = { createLogger };
