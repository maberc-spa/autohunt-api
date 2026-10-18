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
