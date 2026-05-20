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

**WhatsApp:**

| Variable | Descripción |
|----------|-------------|
| `ULTRAMSG_INSTANCE_ID` | ej. `instance176484` |
| `ULTRAMSG_TOKEN` | token del panel UltraMsg |
| `ULTRAMSG_API_URL` | opcional |

En **UltraMsg** la instancia debe estar **conectada** (QR escaneado).

## MySQL remoto (Hostinger)

En hPanel → **Bases de datos remotas MySQL**, permitir acceso desde cualquier host (`%`) o las IPs que indique Vercel.

## Migraciones

```bash
cd back
npm run migration:run
```

## Redeploy

Tras cambiar variables o código, **Redeploy** en Vercel. El front usa `NEXT_PUBLIC_BACKEND_URL=https://sigtabackend.vercel.app`.

## WhatsApp: proceso interno del backend

La cola de mensajes (`scheduled_notifications`) la procesa el propio Nest al arrancar:

- **Poll cada 30 s** — revisa mensajes vencidos (recordatorios 3 d / 1 d / 1 h).
- **Timer por mensaje** — para envíos cercanos (p. ej. aviso al estudiante ~1 min después de asignar docente).

No hay cron externo ni endpoint HTTP de cron.

### Mensajes inmediatos en Vercel

Solicitud, confirmación, aviso al profesor, etc. se envían **en la misma petición HTTP** (`await` en el servicio de tutorías).

### Cola diferida en Vercel (limitación)

En **serverless**, el proceso solo vive durante cada petición. Los timers y el poll **no siguen corriendo** entre requests. Por tanto:

| Tipo | En Vercel |
|------|-----------|
| Mensaje al crear / confirmar / asignar (profesor) | Sí, en la misma petición |
| Mensaje al estudiante ~1 min después | Solo si hay otra petición al back después, o al redeploy |
| Recordatorios 3 d / 1 d / 1 h | No fiables en Vercel |

Para **toda** la cola WhatsApp (retraso 1 min + recordatorios), ejecuta el backend como **servidor persistente**:

```bash
cd back
npm run start:dev   # desarrollo
npm run build && npm run start:prod   # producción
```

Alternativas: Railway, Render, Fly.io, VPS, o un segundo servicio Node siempre encendido apuntando a la misma BD.
