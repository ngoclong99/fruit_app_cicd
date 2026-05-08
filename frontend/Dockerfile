# ═══ STAGE 1: Build React ═══
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json ./

# Skip ALL optional deps -> tranh install nham Windows binaries
# (yarn.lock/package-lock.json sinh tu Windows ghim sai platform)
RUN npm install --omit=optional

# Install rieng Linux platform binaries cho rollup va esbuild
# (Docker luon chay Linux x64 nen hardcode duoc)
RUN npm install --no-save @rollup/rollup-linux-x64-gnu @esbuild/linux-x64

COPY . .

# VITE_API_URL được inject lúc build (từ GitHub Actions)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Goi vite truc tiep qua node (bypass .bin symlink permission issue tren Linux)
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
