# ═══ STAGE 1: Build React ═══
FROM node:20-slim AS builder
WORKDIR /app

# Enable yarn qua corepack (built-in trong node 20+)
# Yarn xu ly optional/platform-specific deps tot hon npm
# (npm/cli#4828: rollup va esbuild Linux binary khong install dung khi build tu Windows lock)
RUN corepack enable

COPY package.json yarn.lock ./
# --network-timeout: tang timeout vi cac package nang (recharts, botpress)
RUN yarn install --network-timeout 100000

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
