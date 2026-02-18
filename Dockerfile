# ── Stage 1: Build client ──────────────────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app/apps/client
COPY .npmrc /root/.npmrc
COPY apps/client/package.json apps/client/package-lock.json ./
RUN npm ci --include=dev
RUN rm -f /root/.npmrc
COPY apps/client/ ./
RUN npm run build

# ── Stage 2: Build server ──────────────────────────────────────────
FROM node:20-alpine AS server-build
WORKDIR /app/apps/server
COPY .npmrc /root/.npmrc
COPY apps/server/package.json apps/server/package-lock.json ./
RUN npm ci --include=dev
RUN rm -f /root/.npmrc
COPY apps/server/ ./
RUN npm run build

# ── Stage 3: Production ───────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app/apps/server

# Copy server build output and install production-only dependencies
COPY --from=server-build /app/apps/server/dist ./dist
COPY .npmrc /root/.npmrc
COPY apps/server/package.json apps/server/package-lock.json ./
RUN npm ci --omit=dev
RUN rm -f /root/.npmrc

# Copy client build output (server serves it via express.static)
COPY --from=client-build /app/apps/client/dist ../client/dist

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/index.js"]
