# ═══ STAGE 1: Install dependencies ═══
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ═══ STAGE 2: Production image ═══
FROM node:20-alpine AS production

# curl để healthcheck, dumb-init để handle signals đúng cách
RUN apk add --no-cache curl dumb-init

# Chạy với user non-root (bảo mật)
RUN addgroup -g 1001 nodejs && adduser -S -u 1001 -G nodejs nodejs

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built output từ stage builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

USER nodejs
EXPOSE 5000

# Docker tự check container alive mỗi 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]