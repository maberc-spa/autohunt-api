# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=26.12.1
ARG NPM_VERSION=12.2.1

# --- Build ---
FROM node:${NODE_VERSION}-alpine AS builder
ARG NPM_VERSION

# openssl: Prisma lo usa para detectar el engine correcto (musl + openssl 3)
RUN apk add --no-cache openssl \
 && npm install -g npm@${NPM_VERSION} \
 && npm cache clean --force

WORKDIR /app

ENV CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1

# Capa de dependencias: solo se invalida si cambian package*.json o el schema.
# bcrypt trae binarios precompilados para musl, no hace falta toolchain de C.
COPY package.json package-lock.json ./
COPY scripts ./scripts
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
# Compila sin sourcemaps/declaraciones, quita devDependencies y archivos
# que no se usan en runtime (docs, sourcemaps, binarios de otras plataformas)
RUN npm run build:prod \
 && npm prune --omit=dev --no-audit --no-fund \
 && find node_modules \( -name "*.md" -o -name "*.map" -o -name "CHANGELOG*" \) -type f -delete \
 && rm -rf node_modules/bcrypt/prebuilds/darwin-* node_modules/bcrypt/prebuilds/win32-* \
           node_modules/bcrypt/prebuilds/*/bcrypt.glibc.node

# --- Production ---
FROM node:${NODE_VERSION}-alpine AS runner

# npm/npx/yarn/corepack no se necesitan en runtime (~20 MB menos)
RUN apk add --no-cache openssl dumb-init \
 && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx \
           /usr/local/bin/corepack /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1

COPY --chown=node:node package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --start-interval=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Las migraciones (prisma migrate deploy) se aplican al arrancar en NODE_ENV=production
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
