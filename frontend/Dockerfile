# ═══ STAGE 1: Build React ═══
FROM node:20-slim AS builder
WORKDIR /app

# Enable yarn qua corepack (built-in trong node 20+)
# Yarn xu ly optional/platform-specific deps tot hon npm
# (npm/cli#4828: rollup va esbuild Linux binary khong install dung khi build tu Windows lock)
RUN corepack enable

COPY package.json ./
# KHONG copy yarn.lock: lockfile sinh tu Windows -> ghim binaries sai platform
# (vd: rollup-win32-x64-msvc thay vi rollup-linux-x64-gnu)
# Bo lockfile -> yarn re-resolve fresh tren Linux, install dung binaries
RUN yarn install --network-timeout 100000
# yarn 1.22 cai sai platform-specific binaries (esbuild Windows tren Linux)
# -> rebuild + install bo sung Linux binaries qua npm
RUN npm install --no-save @rollup/rollup-linux-x64-gnu
RUN npm rebuild esbuild

COPY . .

# VITE_API_URL được inject lúc build (từ GitHub Actions)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Goi vite truc tiep qua node (bypass .bin symlink + shebang permission issue)
# Cac file .bin/vite la symlink -> chmod khong tac dong target -> /bin/sh permission denied
RUN node ./node_modules/vite/bin/vite.js build

# ═══ STAGE 2: Serve bằng Nginx ═══
FROM nginx:1.25-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
