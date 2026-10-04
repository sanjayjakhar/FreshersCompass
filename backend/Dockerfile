# Production Dockerfile for FreshersCompass Node.js / Express Backend
#
# Multi-stage: production dependencies are installed once in a throwaway stage so
# the runtime image carries no npm cache, no build toolchain and no dev
# dependencies. See .dockerignore for why the build context must stay filtered.

# ---------- Stage 1: production dependency tree ----------
FROM node:20-alpine AS deps

WORKDIR /app

# Only the manifests, so this layer is cached until dependencies actually change.
COPY package.json package-lock.json ./

# --omit=dev is the supported spelling on npm 9+; --only=production is deprecated.
RUN npm ci --omit=dev && npm cache clean --force


# ---------- Stage 2: minimal runtime ----------
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

# Run as an unprivileged user instead of root.
RUN addgroup -S freshercompass && adduser -S freshercompass -G freshercompass

COPY --from=deps --chown=freshercompass:freshercompass /app/node_modules ./node_modules
COPY --chown=freshercompass:freshercompass package.json ./
COPY --chown=freshercompass:freshercompass src ./src

USER freshercompass

EXPOSE 5000

# node:20-alpine ships BusyBox wget, so no extra package is needed for this.
# /api/health reports process uptime plus MongoDB connection readiness.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/health || exit 1

CMD ["node", "src/server.js"]