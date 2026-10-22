#!/bin/sh
# Despliegue en servidor: actualiza el código, construye, migra, reemplaza el
# contenedor y libera espacio. Conserva la imagen anterior para poder volver atrás.
#
# Uso:
#   ./scripts/deploy.sh             despliega la versión actual de la rama
#   ./scripts/deploy.sh rollback    vuelve a la imagen del despliegue anterior
set -eu

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Falta .env (cp .env.example .env y complétalo)" >&2
  exit 1
fi

if [ "${1:-}" = "rollback" ]; then
  docker image inspect autohunt-api:previous >/dev/null 2>&1 || {
    echo "No hay imagen anterior (autohunt-api:previous)" >&2
    exit 1
  }
  docker tag autohunt-api:previous autohunt-api:latest
  docker compose up -d --no-build
  docker compose ps
  echo "Rollback hecho. Ojo: las migraciones de BD no se revierten." >&2
  exit 0
fi

if [ -d .git ]; then
  git pull --ff-only
fi

# Guarda la imagen en uso para rollback
if docker image inspect autohunt-api:latest >/dev/null 2>&1; then
  docker tag autohunt-api:latest autohunt-api:previous
fi

docker compose build --pull

# Migra antes de reemplazar el contenedor: si falla, la versión actual sigue corriendo
docker compose run --rm --no-deps api node node_modules/prisma/build/index.js migrate deploy

docker compose up -d --remove-orphans

# Espera a que el healthcheck pase
i=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' autohunt-api)" = "healthy" ]; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "La API no quedó healthy. Revisa: docker compose logs api" >&2
    echo "Para volver atrás: ./scripts/deploy.sh rollback" >&2
    exit 1
  fi
  sleep 3
done

# Limpieza: imágenes huérfanas y caché de build de más de 3 días
docker image prune -f
docker builder prune -f --filter "until=72h"

docker compose ps
