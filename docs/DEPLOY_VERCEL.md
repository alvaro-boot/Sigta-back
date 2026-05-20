# Despliegue del backend en Vercel

## Configuración del proyecto

En el dashboard de Vercel del proyecto **sigtabackend**:

1. **Root Directory:** `back` (si el repo es el monorepo SIGTA completo).
2. **Framework Preset:** Other.
3. **Build Command:** `npm run build` (definido en `vercel.json`).
4. **Output:** no aplica (serverless).

## Variables de entorno (obligatorias)

Copiar desde `back/.env` (Production y Preview):

| Variable | Ejemplo |
|----------|---------|
| `DB_HOST` | `srv883.hstgr.io` |
| `DB_PORT` | `3306` |
| `DB_USER` | usuario MySQL Hostinger |
| `DB_PASSWORD` | contraseña (respetar `/`, `&`, etc.) |
| `DB_NAME` | nombre de la base |
| `JWT_SECRET` | secreto largo (no dejar el valor por defecto) |
| `JWT_EXPIRES_IN` | `7d` |
| `APP_TIMEZONE` | `America/Bogota` |
| `TYPEORM_SYNC` | `false` |

Opcionales (WhatsApp): `ULTRAMSG_INSTANCE_ID`, `ULTRAMSG_TOKEN`, `ULTRAMSG_API_URL`.

## MySQL remoto (Hostinger)

En hPanel → **Bases de datos remotas MySQL**, permitir acceso desde cualquier host (`%`) o las IPs que indique Vercel. Sin esto la función arranca pero falla al conectar y verás 500.

## Migraciones

Ejecutar en local apuntando a la misma BD:

```bash
cd back
npm run migration:run
```

## Redeploy

Tras cambiar variables o código, **Redeploy** en Vercel. El login del front debe usar `NEXT_PUBLIC_BACKEND_URL=https://sigtabackend.vercel.app`.

## Limitaciones en serverless

- Los **cron** de recordatorios WhatsApp no corren de forma fiable en Vercel; para producción con notificaciones programadas conviene Railway, Render o un VPS.
