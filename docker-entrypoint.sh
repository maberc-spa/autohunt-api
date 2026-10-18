#!/bin/sh
set -e

echo "Aplicando migraciones..."
npx prisma migrate deploy

echo "Iniciando API..."
exec node dist/index.js
