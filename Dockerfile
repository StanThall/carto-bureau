# ── Stage 1 : build ──────────────────────────────────────────────────────────
FROM node:23-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2 : serve ──────────────────────────────────────────────────────────
FROM nginx:stable-alpine

# Configuration nginx adaptée aux SPA (toutes les routes → index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copie des assets buildés
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
