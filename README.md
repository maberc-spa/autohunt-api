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
| * | `/admin/catalog/*` | Proxy a la API admin del catálogo de vehículos (`/admin/*` de auto-db-api): cola de revisión, ingestas, jobs. El email del admin queda como `resolved_by` |

El primer administrador se configura con `ADMIN_EMAIL` y `ADMIN_PASSWORD` (ver `.env.example`): al arrancar, la API promueve esa cuenta a `ADMIN` o la crea si no existe.

### Catálogo de vehículos (`/catalog`, servido por auto-db-api)

autohunt-api es la puerta de entrada al catálogo canónico ([auto-db-api](https://auto-db-api.maberc.com)): la app nunca lo llama directo. autohunt reenvía a `/v1` con `CATALOG_API_KEY` y cachea en memoria según el `Cache-Control` del catálogo. Las respuestas mantienen el formato del catálogo (`data`, `nextCursor`) más `success`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/catalog/vehicle-types` | Tipos de vehículo (`vehicle_type`) con su categoría en el catálogo (`bodyType`) y cuántos modelos tiene cada uno (`modelCount`) (público) |
| GET | `/catalog/brands?limit=&cursor=&vehicleTypeId=` | Marcas; con `vehicleTypeId`, solo las que tienen modelos de ese tipo (público) |
| GET | `/catalog/brands/:brandId/models?vehicleTypeId=` | Modelos de la marca, opcionalmente filtrados por tipo (público) |
| GET | `/catalog/models/:modelId/years` | Años disponibles (público) |
| GET | `/catalog/models/:modelId/variants?year=` | Variantes de ese año (público) |
| GET | `/catalog/variants/:id` | Detalle de una variante (público) |
| GET | `/catalog/search?q=&vehicleTypeId=` | Typeahead de marcas y modelos, opcionalmente filtrado por tipo (público) |
| GET | `/catalog/enums` | Combustibles, carrocerías, tracciones y transmisiones (público) |
| POST | `/catalog/submissions` | "No encuentro mi auto" (`brand`, `model`, `year`, `variant?`, `vehicleTypeId?`). Requiere token; el usuario se identifica desde la sesión. Rate limit por usuario |

Si el catálogo no responde: `503`; si responde con error o rechaza la clave: `502`.

**Formulario "agregar vehículo":** la app pide primero el tipo de vehículo (`GET /catalog/vehicle-types`) y pasa ese `vehicleTypeId` a marcas, modelos y búsqueda, para no mostrar el catálogo completo. Un tipo con `modelCount: 0` (o sin `bodyType`) no tiene modelos en el catálogo: la app debe ir directo a texto libre y `POST /catalog/submissions` con el `vehicleTypeId`, que se guarda como categoría del modelo al aprobarlo. Un `vehicleTypeId` inexistente da `404`; uno sin categoría en el catálogo, `400`. SUV y Crossover se muestran juntos (el catálogo sigue la división de la EPA, que deja RAV4, CR-V o Tucson como crossover). El mismo id se guarda en `vehicle.vehicleTypeId`.

**Guardar el vehículo:** los ids de marca y modelo del catálogo no son los nuestros. `POST /vehicles` y `PUT /vehicles/:id` aceptan `brandName` y `modelName` (los nombres elegidos en el catálogo o escritos a mano) en lugar de `brandId` y `modelId`: la API reutiliza la marca y el modelo propios con ese nombre (sin distinguir mayúsculas) o los crea. Una marca nueva queda con el `countryId` del vehículo. No se pueden mezclar ids y nombres en la misma petición.

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
