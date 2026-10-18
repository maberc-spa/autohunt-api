# --- Build ---
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Mantener prisma CLI para migrate deploy en runtime
RUN npm prune --omit=dev && npm install prisma@5.22.0 --no-save

# --- Production ---
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app

COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh && chown -R app:app /app

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]
