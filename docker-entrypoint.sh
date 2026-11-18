#!/bin/sh
# 網站容器啟動流程：建表 → 啟動 Next.js。
#
# 注意：AIBorn 排程（Cloud Run Job）會以 /bin/sh -c "<指令>" 覆蓋 ENTRYPOINT，
# 這支腳本「不會」在排程時執行。ENTRYPOINT_RAN 用來在實驗中證明這件事：
# 網站端 /schedules 會看到 1，心跳排程的 Log 會看到 (未設定)。
set -e

export ENTRYPOINT_RAN=1

node src/scripts/migrate.js

exec "$@"
