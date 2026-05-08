# ═══ STAGE 1: Build React ═══
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json ./
# KHONG copy package-lock.json (lock platform-specific binaries tu Windows local)
RUN npm install
# Workaround npm/cli#4828: optional deps cho rollup va esbuild khong install dung
# -> install thang Linux binary (Docker luon chay Linux nen hardcode duoc)
RUN npm install --no-save @rollup/rollup-linux-x64-gnu @esbuild/linux-x64

COPY . .

# VITE_API_URL được inject lúc build (từ GitHub Actions)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN chmod +x node_modules/.bin/tsc node_modules/.bin/vite
RUN npm run build

# ═══ STAGE 2: Serve bằng Nginx ═══
FROM nginx:1.25-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]