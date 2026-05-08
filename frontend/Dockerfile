# ═══ STAGE 1: Build React ═══
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json ./

# Install full deps (cho phep optional). Sau do se don dep platform binaries.
RUN npm install

# Xoa cac platform-specific packages cua esbuild/rollup tu Windows lockfile da/co
# (npm install fresh on Linux van co the keo Win binaries qua transitive deps)
# Sau do install/rebuild dung Linux binaries:
#   - npm rebuild esbuild: chay install script -> tai dung Linux binary cho esbuild
#   - npm install rollup linux binary explicit (npm/cli#4828: rollup deps khong tu install)
RUN rm -rf node_modules/@esbuild node_modules/@rollup
RUN npm rebuild esbuild
RUN npm install --no-save @rollup/rollup-linux-x64-gnu

COPY . .

# VITE_API_URL được inject lúc build (từ GitHub Actions)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Goi vite truc tiep qua node (bypass .bin symlink permission issue)
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
