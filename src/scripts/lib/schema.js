/**
 * 冪等建表。網站啟動時由 docker-entrypoint.sh → migrate.js 執行；
 * 每支排程腳本開跑時也會自己呼叫一次（AIBorn 排程會略過 entrypoint）。
 */

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS cron_runs (
    id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    job_name      VARCHAR(60)  NOT NULL,
    tag           VARCHAR(40)  NULL,
    trigger_type  VARCHAR(16)  NULL COMMENT 'AIBORN_JOB_TRIGGER：schedule / manual；本機為 local',
    aiborn_job_id VARCHAR(40)  NULL COMMENT 'AIBORN_SCHEDULED_JOB_ID',
    aiborn_run_id VARCHAR(40)  NULL COMMENT 'AIBORN_JOB_RUN_ID',
    status        VARCHAR(16)  NOT NULL COMMENT 'running / succeeded / failed / terminated',
    message       VARCHAR(500) NULL,
    app_version   VARCHAR(40)  NULL,
    hostname      VARCHAR(100) NULL,
    started_at    DATETIME(3)  NOT NULL,
    finished_at   DATETIME(3)  NULL,
    duration_ms   INT          NULL,
    INDEX idx_cron_runs_job (job_name, started_at),
    INDEX idx_cron_runs_started (started_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
  `CREATE TABLE IF NOT EXISTS notes (
    id         BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    content    VARCHAR(1000) NOT NULL,
    created_at DATETIME(3)   NOT NULL,
    INDEX idx_notes_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
];

async function ensureSchema(pool) {
  for (const sql of STATEMENTS) {
    await pool.query(sql);
  }
}

module.exports = { ensureSchema };
