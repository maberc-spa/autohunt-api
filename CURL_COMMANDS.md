# Comandos cURL para AutoHunt API

Base: `http://localhost:3000/api`

## Autenticación

Registro (público):

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Juan Pérez","email":"juan@example.com","password":"password123","countryId":1}'
```

Login (público):

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@example.com","password":"password123"}'
```

Guarda el `token` de la respuesta y úsalo en rutas protegidas:

```bash
export TOKEN="eyJhbGciOiJIUzI1NiIs..."
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/auth/me
```

Perfil (requiere token):

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users/me
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  http://localhost:3000/api/users/me -d '{"name":"Juan Actualizado"}'
```

## Health (público)

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/ready
```

## Catálogos — lectura pública, escritura con token

```bash
# Público
curl http://localhost:3000/api/countries
curl http://localhost:3000/api/brands

# Requiere token
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  http://localhost:3000/api/countries -d '{"name":"Chile","code":"CHL"}'
```

## Recursos del usuario — siempre requieren token

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/vehicles

curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  http://localhost:3000/api/vehicles \
  -d '{"brandId":1,"modelId":1,"vehicleTypeId":1,"year":2024,"mileage":15000}'

curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/maintenances
```

## Orden recomendado

1. `POST /auth/register` o login con seed (`demo@autohunt.dev` / `demo12345`)
2. Catálogos (countries, brands, models, vehicle-types, maintenance-types)
3. `POST /vehicles` → `POST /maintenances` → `POST /maintenance-details`

## Permisos por recurso

| Recurso | GET | POST/PUT/DELETE |
|---|---|---|
| `/health`, `/auth/register`, `/auth/login` | Público | Público (login/register) |
| Catálogos (`countries`, `brands`, …) | Público | Token requerido |
| `/users/me` | Token | Token |
| `vehicles`, `maintenances`, etc. | Token (solo propios) | Token (solo propios) |
