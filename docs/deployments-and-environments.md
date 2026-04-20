# Deployments y Ambientes

Estado operativo verificado el 19 de abril de 2026.

Esta guia documenta como vamos a manejar GitHub y Vercel en `Singular Platform` a partir de ahora.

## Decision actual

- Vamos a trabajar con tres ramas largas en GitHub: `development`, `preview` y `main`.
- `development` despliega a un custom environment remoto llamado `dev`.
- `preview` despliega al ambiente nativo `Preview` de Vercel.
- `main` queda reservada para `Production`.
- No vamos a usar dominio propio por ahora.
- Las URLs oficiales de ambientes remotos no productivos son aliases estables de `vercel.app`.

## Mapa de ramas y ambientes

| GitHub | Rol | Vercel | Estado |
| --- | --- | --- | --- |
| `feature/*` | Trabajo corto | `Preview` automatico | Activo |
| `development` | Integracion remota del equipo | `dev` | Activo |
| `preview` | QA / validacion interna | `Preview` | Pendiente de cerrar alias estable |
| `main` | Produccion | `Production` | Pendiente |

## Nota importante sobre `development`

Vercel no permite usar `development` como slug de un custom environment remoto porque es un nombre reservado.

Por eso:

- rama GitHub: `development`
- ambiente remoto Vercel: `dev`

Ese mapeo es intencional y es el que debemos seguir.

## Proyectos Vercel

- Scope: `singular-projects-f4874352`
- Frontend:
  - Proyecto: `singular-platform-web`
  - Project ID: `prj_6lda07SYG6QPlPWcETc6DJ7dW22S`
  - Root directory: `frontend`
- Backend:
  - Proyecto: `singular-platform-api`
  - Project ID: `prj_FaCVipNv5o0JMJaOzMZELtwWOoTJ`
  - Root directory: `backend`

## Estado actual implementado

### GitHub

- Existen las ramas `development`, `preview` y `main`.
- `qa` dejo de ser la rama operativa y fue reemplazada por `preview`.
- El workflow `Typecheck` ya corre sobre `development`, `preview` y `main`.

### Vercel: `development` remoto

Para ambos proyectos:

- existe el custom environment `dev`
- `dev` trackea la rama `development`
- ya hay deploys activos del ambiente `dev`

Aliases oficiales actuales:

- Frontend `dev`:
  - `https://singular-platform-web-env-dev-singular-projects-f4874352.vercel.app`
- Backend `dev`:
  - `https://singular-platform-api-env-dev-singular-projects-f4874352.vercel.app`

### Vercel: `preview`

Por ahora:

- la rama `preview` existe en GitHub
- el ambiente objetivo sigue siendo `Preview`
- todavia falta cerrar su alias estable y revisar sus overrides especificos

### Vercel: `production`

Por ahora:

- `main` queda reservada
- no estamos cerrando aun el flujo oficial de `Production`

## Politica de URLs

Por decision actual del proyecto:

- no usar dominio propio para ambientes remotos
- no documentar subdominios custom como URLs oficiales
- usar aliases estables de Vercel

### URLs oficiales hoy

#### Development

- Web:
  - `https://singular-platform-web-env-dev-singular-projects-f4874352.vercel.app`
- API:
  - `https://singular-platform-api-env-dev-singular-projects-f4874352.vercel.app`

#### Preview

- Pendiente de definir cuando cerremos la configuracion de la rama `preview`

## Variables importantes

### Frontend

- `SESSION_SECRET`
- `BACKEND_BASE_URL`
- `BACKEND_PROTECTION_BYPASS_SECRET`

### Backend

- `AIRTABLE_API_TOKEN`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_NAME`
- `AIRTABLE_TRUSTWORTHINESS_TABLE_NAME`
- `AIRTABLE_EMAIL_FIELD`
- `AIRTABLE_NAME_FIELD`
- `AIRTABLE_ROLE_FIELD`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `FRONTEND_URL`
- `AIRTABLE_BASE_ID_FOR_COACHING`
- `AIRTABLE_TABLE_NAME_FOR_COACHING_LOGS`
- `AIRTABLE_MONTHLY_TRUSTWORTHYNESS_FIELD`

## Matriz de variables por ambiente

### Local

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- `FRONTEND_URL=http://localhost:3000`
- `BACKEND_BASE_URL=http://localhost:4000`

### Dev remoto

- `FRONTEND_URL=https://singular-platform-web-env-dev-singular-projects-f4874352.vercel.app`
- `BACKEND_BASE_URL=https://singular-platform-api-env-dev-singular-projects-f4874352.vercel.app`
- `BACKEND_PROTECTION_BYPASS_SECRET` vive en el frontend `dev`
- el backend mantiene su propio Protection Bypass for Automation

### Preview

- Se definira al cerrar el carril `preview`
- si alguna variable cambia solo para la rama `preview`, se configura con override especifico de esa rama

## Regla operativa sobre Deployment Protection

Frontend y backend viven en proyectos Vercel separados.

Cuando ambos ambientes remotos estan protegidos por Vercel Authentication:

- el login del navegador protege el acceso del usuario al frontend
- pero eso no resuelve automaticamente los fetch server-to-server del frontend hacia el backend

Para ese caso, el frontend debe enviar el header oficial de Vercel:

- `x-vercel-protection-bypass`

Y el secret debe venir de:

- `BACKEND_PROTECTION_BYPASS_SECRET`

Esto ya quedo implementado para `development`.

## Flujo operativo recomendado

1. Crear cambios desde `development` hacia ramas `feature/*`, `fix/*` o `chore/*`.
2. Abrir PR hacia `development`.
3. Cuando `development` este estable, abrir PR de `development` hacia `preview`.
4. Cuando `preview` este aprobada, abrir PR de `preview` hacia `main`.

## Reglas del equipo

- No abrir PR directo de `feature/*` a `preview`.
- No abrir PR directo de `feature/*` a `main`.
- `development` es el carril remoto principal de integracion.
- `preview` se usa para QA y validacion, no para desarrollo diario.
- `main` se usa para publicar, no para probar.

## Checklist actual

### GitHub

- [x] Existen las ramas `development`, `preview` y `main`
- [x] `qa` deja de ser la rama operativa principal
- [x] Existe workflow de GitHub Actions para `Typecheck`
- [ ] `development` tiene branch protection
- [ ] `preview` tiene branch protection
- [ ] `main` tiene branch protection

### Vercel web

- [x] Existe custom environment `dev`
- [x] `dev` trackea `development`
- [x] Existe alias estable de Vercel para `development`
- [x] Estan cargadas las variables correctas en `dev`
- [x] El frontend `dev` habla con el backend `dev`
- [ ] Alias estable final para `preview`
- [ ] Overrides finales de `preview`

### Vercel api

- [x] Existe custom environment `dev`
- [x] `dev` trackea `development`
- [x] Existe alias estable de Vercel para `development`
- [x] Estan cargadas las variables correctas en `dev`
- [x] El backend `dev` responde correctamente al flujo remoto
- [ ] Alias estable final para `preview`
- [ ] Overrides finales de `preview`

## Problemas comunes

### El frontend dice "El backend no devolvio JSON"

Revisar en este orden:

1. Que `BACKEND_BASE_URL` apunte al backend del mismo carril.
2. Que frontend y backend pertenezcan al mismo ambiente remoto.
3. Que el backend no este respondiendo HTML de Deployment Protection.
4. Que el frontend este enviando `x-vercel-protection-bypass` cuando corresponde.
5. Que el backend tenga desplegados los endpoints y variables correctas.

### El alias existe pero responde `401 Authentication Required`

Eso significa que el ambiente esta desplegado, pero sigue protegido por Vercel Authentication.

Opciones:

- usar login de Vercel para acceder
- crear una excepcion de protection si se decide exponer esa URL
- usar bypass de automatizacion para llamadas server-to-server

### Cuidado al guardar env vars con CLI

Si agregas variables con `vercel env add`, evita meter salto de linea al final del valor.

Correcto:

```bash
printf %s 'valor' | vercel env add NOMBRE dev --force
```

Evitar:

```bash
printf '%s\n' 'valor' | vercel env add NOMBRE dev --force
```

Ese salto de linea puede romper URLs, nombres de tabla y otros valores sensibles.
