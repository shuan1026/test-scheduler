import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AIBorn 以 Docker 部署：standalone 只帶 Next 追蹤到的檔案，
  // src/scripts（排程腳本）由 Dockerfile 另外複製進映像。
  output: "standalone",
  // 不讓 Turbopack 把 mysql2 打包進 server chunk：保持外部套件，standalone 才會把
  // node_modules/mysql2（含相依套件）複製出來，排程腳本 require('mysql2/promise') 才找得到。
  serverExternalPackages: ["mysql2"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
