# ═══ Frontend Docker image: chi serve static files qua Nginx ═══
# Frontend dist da duoc build NGOAI Docker boi GitHub Actions runner
# (deploy.yml step "Build frontend on runner")
# Tranh duoc bug npm/cli#4828 voi platform-specific binaries

FROM nginx:1.25-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*
COPY dist /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
