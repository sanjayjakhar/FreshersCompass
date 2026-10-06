# Multi-stage build for FreshersCompass React/Vite Frontend

# ---------- Stage 1: compile the Vite bundle ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* variables at build time, so they must be present as build
# args rather than runtime env vars for the bundle to pick them up.
ARG VITE_API_BASE_URL=http://localhost:5000/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build


# ---------- Stage 2: serve the static bundle with Nginx ----------
FROM nginx:alpine AS runtime

# Replace the stock config: the SPA needs a history fallback so deep links such
# as /portfolio/jane resolve to index.html instead of 404.
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx must not cache the entry document, or users keep getting a stale
# index.html pointing at hashed assets that no longer exist.
EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5173/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]