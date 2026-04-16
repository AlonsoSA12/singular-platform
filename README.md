# Singular Platform

Monorepo inicial para `Singular Platform` con frontend web en Next.js y backend API en Fastify.

## Estructura

- `frontend/`: login, workspace y demo de shell de producto
- `backend/`: validacion de email contra Airtable
- `.env`: configuracion local centralizada

## Variables de entorno

Completa estas variables en la raiz del proyecto:

```env
AIRTABLE_API_TOKEN=
AIRTABLE_BASE_ID=
AIRTABLE_TABLE_NAME=
AIRTABLE_EMAIL_FIELD=
AIRTABLE_NAME_FIELD=
AIRTABLE_ROLE_FIELD=
SESSION_SECRET=
FRONTEND_URL=http://localhost:3000
BACKEND_PORT=4000
BACKEND_BASE_URL=http://localhost:4000
```

## Desarrollo local

Si no tienes `pnpm` global, usa Corepack:

```bash
corepack pnpm install
corepack pnpm dev
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:4000`

## Flujo de autenticacion

1. El usuario escribe su email en el frontend.
2. El frontend llama a `/api/auth/login`.
3. La ruta del frontend reenvia la validacion al backend.
4. El backend consulta Airtable y confirma si el email existe.
5. El frontend crea una cookie de sesion firmada y redirige a `/workspace`.

## Vercel

Proyectos previstos:

- `singular-platform-web`
- `singular-platform-api`

URL fija esperada para la rama `development` del frontend:

`https://singular-platform-web-git-development-singular-projects-f4874352.vercel.app`
