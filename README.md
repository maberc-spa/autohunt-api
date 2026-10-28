# AutoHunt API

API REST para gestión de vehículos y mantenimientos. Construida con Node.js, Express, TypeScript, Prisma y PostgreSQL (Neon).

## Tecnologías

- **Node.js** + **Express** + **TypeScript**
- **Prisma** + **PostgreSQL** (Neon)
- **Zod** — validación de requests
- **bcrypt** — hash de contraseñas
- **jsonwebtoken** — autenticación JWT
- **helmet** — headers de seguridad HTTP

## Instalación

```bash
npm install
cp .env.example .env
# Configura DATABASE_URL, DIRECT_URL y JWT_SECRET
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed   # opcional: datos de demo
```

## Ejecución

```bash
npm run dev          # desarrollo con hot reload
npm run build && npm start   # producción
npm test             # unit tests
npm run test:watch   # tests en modo watch
```

## Endpoints

Base URL: `http://localhost:3000/api`

### Autenticación (público)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Registro de usuario |
| POST | `/auth/login` | Inicio de sesión (devuelve JWT) |
| GET | `/auth/me` | Perfil del usuario autenticado |

Incluye el token en rutas protegidas: `Authorization: Bearer <token>`

### Catálogos (GET público, escritura con token)

`/countries`, `/brands`, `/models`, `/vehicle-types`, `/maintenance-types`

### Recursos protegidos (requieren token, solo datos propios)

| Recurso | Ruta |
|---|---|
| Perfil | `/users/me` |
| Vehículos | `/vehicles` |
| Mantenimientos | `/maintenances` |
| User maintenances | `/user-maintenances` |
| Maintenance details | `/maintenance-details` |
| Decodificar VIN | `GET /vin/:vin` |

`PUT /users/me` acepta `username`, `email`, `firstName`, `lastName`, `phone` y `countryId`. Para cambiar el `email` de una cuenta con contraseña hay que enviar también `currentPassword`. `role` y `plan` no se pueden modificar desde aquí.

El `vin` de un vehículo se normaliza (mayúsculas, sin espacios ni guiones) y se valida: 17 caracteres sin I, O ni Q, con dígito verificador obligatorio para VINs norteamericanos (WMI `1`–`5`). Se aceptan VINs antiguos de 11 a 16 caracteres (anteriores a 1981).

`GET /vin/:vin` identifica el vehículo a partir de un VIN de 17 caracteres. Consulta [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api/) (cobertura completa para vehículos del mercado norteamericano) y, si no responde o no conoce el VIN, devuelve lo que se puede deducir del propio VIN: marca (WMI), país de fabricación y año modelo. Respuesta:

```json
{ "vin": "…", "make": "Toyota", "model": "Corolla", "year": 2019,
  "countryCode": "JPN", "displacementL": 1.8, "fuelType": "gasoline",
  "bodyType": "sedan", "source": "nhtsa" }
```

`fuelType` (`gasoline`, `diesel`, `electric`, `hybrid`, `lpg`, `cng`) y `bodyType` (`sedan`, `hatchback`, `suv`, `crossover`, `pickup`, `coupe`, `convertible`, `wagon`, `minivan`, `van`, `truck`, `bus`, `motorcycle`) son claves independientes del catálogo. Los resultados se guardan en caché 24 h y el endpoint tiene su propio rate limit (`RATE_LIMIT_VIN_*`).

### Administración (token de un usuario con rol `ADMIN`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/admin/stats` | Totales (usuarios, vehículos, mantenimientos, documentos, almacenamiento, gasto), altas de los últimos 30 días, usuarios por plan, vehículos por combustible, top 5 marcas y series diarias de 14 días |
| GET | `/admin/users?search=&page=1&pageSize=20&sort=recent\|vehicles` | Listado paginado con búsqueda por username, email o nombre |
| GET | `/admin/users/:id` | Perfil, estadísticas y vehículos del usuario |
| DELETE | `/admin/users/:id` | Elimina al usuario con todos sus vehículos, mantenimientos y documentos (incluidos los archivos). No permite borrarse a sí mismo ni a otro admin |

El primer administrador se configura con `ADMIN_EMAIL` y `ADMIN_PASSWORD` (ver `.env.example`): al arrancar, la API promueve esa cuenta a `ADMIN` o la crea si no existe.

### Health (público)

`/health`, `/health/ready`, `/health/live`

Ver ejemplos en [`CURL_COMMANDS.md`](./CURL_COMMANDS.md) o importar [`postman_collection.json`](./postman_collection.json).

## Estructura

```
autohunt-api/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── config/         # Conexión a BD
│   ├── controllers/    # Lógica de endpoints
│   ├── interfaces/     # Tipos TypeScript
│   ├── middleware/     # Validación, errores, 404
│   ├── routes/         # Rutas Express
│   ├── validators/     # Schemas Zod
│   ├── utils/          # CRUD factory, errores, password
│   ├── app.ts
│   └── index.ts
└── ...
```

## Entidades

- **Country**, **Brand**, **Model**, **VehicleType**
- **User**, **Vehicle**
- **MaintenanceType**, **Maintenance**, **UserMaintenance**, **MaintenanceDetail**

## Producción

```bash
npm run build
npm run prisma:migrate:deploy
npm start
```

## Recursos

- [Neon Console](https://console.neon.tech/)
- [Prisma Docs](https://www.prisma.io/docs)

## Despliegue con Docker (servidor Ubuntu)

Imagen multi-stage sobre `node:26-alpine` (npm 12 solo en la etapa de build; el runtime no incluye npm y corre como usuario sin privilegios).

```bash
# Una vez: instalar Docker Engine + plugin compose
curl -fsSL https://get.docker.com | sh

# Configurar y desplegar
cp .env.example .env   # completar DATABASE_URL, DIRECT_URL, JWT_SECRET, API_PUBLIC_URL
./scripts/deploy.sh    # pull + build + migraciones + up -d + espera healthy + limpieza
./scripts/deploy.sh rollback   # vuelve a la imagen anterior (no revierte migraciones)
```

- La API escucha solo en `127.0.0.1:3000` (Docker se salta UFW al publicar puertos). Se expone a internet a través de Caddy, que corre en su propio contenedor: el compose une la API a la red externa `web` (cámbiala con `PROXY_NETWORK`). **Agrega** este bloque al Caddyfile existente (`/opt/caddy/Caddyfile`), sin reemplazar los demás sitios:
  ```
  autohunt-api.maberc.com {
      reverse_proxy autohunt-api:3000
  }
  ```
  Luego `docker exec caddy caddy reload --config /etc/caddy/Caddyfile`. Desde el contenedor de Caddy, `127.0.0.1` es el propio contenedor, no el host.
  `API_BIND` y `API_PORT` cambian la dirección y el puerto del host.
- Las migraciones se aplican antes de reemplazar el contenedor: si fallan, la versión anterior sigue corriendo.
- Logs del contenedor limitados a 3 × 10 MB; `deploy.sh` borra imágenes huérfanas y caché de build de más de 72 h.
- npm 12 bloquea los scripts de instalación de dependencias: las permitidas están en `allowScripts` de `package.json`. Al actualizar Prisma o bcrypt, ejecuta `npm install-scripts approve <paquete>`.
