# cron-playground：部署到 AIBorn（動態網站）的 Next.js 專案
#
# AIBorn 的排程工作用「同一個映像」在 Cloud Run Job 執行：
#   command = /bin/sh -c、args = 排程指令、工作目錄 = 這裡的 WORKDIR（/app）
#   → ENTRYPOINT / CMD 都會被蓋掉，docker-entrypoint.sh 不會執行
#   → 映像必須有 /bin/sh（不能用 distroless）
#   → 排程要跑的 src/scripts 與 package.json 必須在最終映像裡（standalone 不會自動帶）

# ---- 1. 安裝相依套件 ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2. 建置 ----
FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- 3. 執行映像 ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=Asia/Taipei \
    HOSTNAME=0.0.0.0 \
    PORT=8080

# Next standalone（server.js + 追蹤到的 node_modules，含 mysql2）
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
# 排程用：package.json（npm run job:*、版本號）與 src/scripts（node src/scripts/xxx.js）
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/src/scripts ./src/scripts
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
# Windows 編輯過的 .sh 可能是 CRLF，統一轉成 LF
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

USER node
EXPOSE 8080
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
