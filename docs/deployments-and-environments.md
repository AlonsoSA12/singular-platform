# Deployments y Ambientes

Esta guía documenta el modelo objetivo de GitHub + Vercel que vamos a manejar para `Singular Platform`.

Por ahora el foco es dejar bien definida la operación de:

- GitHub
- ambiente remoto de desarrollo
- ambiente remoto de preview

`Production` queda planificado, pero fuera del alcance inmediato.

## Resumen ejecutivo

- Vamos a trabajar con tres ramas largas en GitHub: `development`, `preview` y `main`.
- `main` quedará reservada para `Production`.
- `preview` será la rama estable de validación interna y QA en el ambiente `Preview` de Vercel.
- `development` será la rama estable de integración continua y desplegará a un ambiente remoto dedicado en Vercel.
- Para evitar confusión con el `Development` local nativo de Vercel, el ambiente remoto de la rama `development` se documenta aquí como `dev`.

## Proyectos Vercel

- Team / Scope: `team_S1Dpa5HObAh9vyDNl6iEjejb`
- Frontend:
  - Proyecto: `singular-platform-web`
  - Project ID: `prj_6lda07SYG6QPlPWcETc6DJ7dW22S`
  - Root directory: `frontend`
- Backend:
  - Proyecto: `singular-platform-api`
  - Project ID: `prj_FaCVipNv5o0JMJaOzMZELtwWOoTJ`
  - Root directory: `backend`

## Modelo objetivo

| GitHub | Rol | Vercel | Tipo | Estado |
| --- | --- | --- | --- | --- |
| `feature/*` | Trabajo puntual | `Preview` automático | Efímero | Activo por convención |
| `development` | Integración base del equipo | `dev` | Ambiente remoto estable | Fase 1 |
| `preview` | Validación interna / QA | `Preview` | Ambiente remoto estable | Fase 1 |
| `main` | Producción | `Production` | Ambiente oficial | Fase 2 |

## Decisión de diseño

### 1. GitHub

El flujo objetivo es:

1. Crear cambios desde `development` hacia ramas `feature/*`.
2. Abrir PR de `feature/*` hacia `development`.
3. Cuando `development` esté validada, abrir PR de `development` hacia `preview`.
4. Cuando `preview` esté aprobada, abrir PR de `preview` hacia `main`.

### 2. Vercel

No vamos a usar `Development` de Vercel como ambiente remoto, porque ese ambiente existe para uso local (`vercel dev`, `vercel env pull`).

Para la rama `development`, la opción bien hecha es crear un ambiente remoto dedicado llamado `dev` y asociarlo a esa rama.

Para la rama `preview`, vamos a usar el ambiente `Preview` nativo de Vercel, pero tratado operativamente como una rama larga y estable, con variables y dominio propios para esa rama.

## Requisito de plan en Vercel

Este modelo asume que el equipo usa Vercel con soporte para `Custom Environments`.

Punto importante:

- En `Pro`, Vercel permite `1 custom environment por proyecto`.
- En `Enterprise`, permite más.

Eso afecta nuestra implementación:

- reservamos el único custom environment para `dev`
- usamos `Preview` nativo para la rama `preview`
- dejamos `Production` para más adelante sobre `main`

Con esta decisión no necesitamos Enterprise para arrancar bien `development + preview`.

## Mapa operativo por ambiente

### Local

- Uso: desarrollo en máquina local
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Fuente de variables: ambiente `Development` nativo de Vercel y/o `.env`
- Rama recomendada para arrancar trabajo: `development`

### Dev remoto

- Rama GitHub: `development`
- Ambiente Vercel: `dev` (custom environment)
- Objetivo: integración remota permanente del equipo
- Duración: larga
- URL: alias o dominio estable por definir
- Variables: propias de `dev`

### Preview estable

- Rama GitHub: `preview`
- Ambiente Vercel: `Preview`
- Objetivo: validación funcional, QA y revisión con stakeholders
- Duración: larga
- URL: alias o dominio estable asignado a la rama `preview`
- Variables: `Preview` con overrides específicos para la rama `preview`

### Production

- Rama GitHub: `main`
- Ambiente Vercel: `Production`
- Objetivo: salida oficial
- Estado: diferido

## Plan de implementación

### Fase 1: GitHub + dev + preview

#### GitHub

1. Mantener tres ramas largas:
   - `development`
   - `preview`
   - `main`
2. Dejar de usar `qa` como rama principal de validación.
3. Crear reglas de protección:
   - `development`: sin push directo idealmente, PR obligatorio
   - `preview`: sin push directo, merge solo desde `development`
   - `main`: sin push directo, merge solo desde `preview`
4. Exigir checks mínimos antes de merge:
   - workflow `Typecheck` en GitHub Actions
5. Definir convención de ramas cortas:
   - `feature/*`
   - `fix/*`
   - `chore/*`

#### Vercel: ambiente `dev`

Para cada proyecto (`web` y `api`):

1. Crear custom environment `dev`.
2. Configurar branch tracking para la rama `development`.
3. Definir variables propias de `dev`.
4. Asignar alias o dominio estable para ese ambiente.
5. Verificar que cada push a `development` actualice ese ambiente remoto.

#### Vercel: ambiente `Preview`

Para cada proyecto (`web` y `api`):

1. Mantener `Preview` nativo de Vercel.
2. Definir a la rama `preview` como la rama estable de QA.
3. Configurar variables `Preview` específicas para la rama `preview` cuando deban diferir del resto de previews.
4. Asignar alias o dominio estable a la rama `preview`.
5. Verificar que cada push a `preview` actualice siempre esa URL estable.

### Fase 2: Production

1. Confirmar que `main` será la `Production Branch` de ambos proyectos.
2. Crear variables de `Production`.
3. Asignar dominio oficial.
4. Habilitar promoción a producción solo desde `preview`.

## Reglas operativas recomendadas

- No abrir PR directo de `feature/*` a `preview`.
- No abrir PR directo de `feature/*` a `main`.
- `preview` no se usa para desarrollo diario; se usa para validar una integración ya consolidada.
- `main` no se usa para probar; se usa para publicar.
- Si una variable cambia solo para QA, debe vivir en `Preview` rama `preview`, no en todas las ramas preview.

## Variables importantes

### Frontend

- `SESSION_SECRET`
- `BACKEND_BASE_URL`

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

## Matriz de variables por fase

### Local

- Usar `.env` o `vercel env pull`
- `FRONTEND_URL=http://localhost:3000`
- `BACKEND_BASE_URL=http://localhost:4000`

### Dev remoto

- `FRONTEND_URL` debe apuntar al frontend `dev`
- `BACKEND_BASE_URL` debe apuntar al backend `dev`
- resto de secretos aislados para `dev`

### Preview estable

- `FRONTEND_URL` debe apuntar al frontend `preview`
- `BACKEND_BASE_URL` debe apuntar al backend `preview`
- si una variable de `Preview` cambia solo para la rama `preview`, se configura por branch

## Checklist de configuración

### GitHub

- [ ] Existen las ramas `development`, `preview` y `main`
- [ ] `qa` deja de ser la rama operativa principal
- [ ] Existe workflow de GitHub Actions para `Typecheck`
- [ ] `development` tiene branch protection
- [ ] `preview` tiene branch protection
- [ ] `main` tiene branch protection

### Vercel web

- [ ] Existe custom environment `dev`
- [ ] `dev` trackea `development`
- [ ] `Preview` tiene configuración estable para la rama `preview`
- [ ] Están cargadas las variables correctas en `dev`
- [ ] Están cargadas las variables correctas en `preview`

### Vercel api

- [ ] Existe custom environment `dev`
- [ ] `dev` trackea `development`
- [ ] `Preview` tiene configuración estable para la rama `preview`
- [ ] Están cargadas las variables correctas en `dev`
- [ ] Están cargadas las variables correctas en `preview`

## Nota sobre URLs

Hoy Vercel genera URLs automáticas por branch y por commit. Para el modelo estable que queremos, debemos dejar definidos alias o dominios permanentes al menos para:

- `dev` web
- `dev` api
- `preview` web
- `preview` api

Hasta que eso quede configurado, no conviene documentar URLs fijas aquí como definitivas.

## Problemas comunes

### El frontend dice "El backend no devolvió JSON"

Revisar en este orden:

1. Que `BACKEND_BASE_URL` apunte al backend correcto del ambiente actual.
2. Que frontend y backend pertenezcan al mismo carril (`dev` con `dev`, `preview` con `preview`).
3. Que el backend no esté protegido por Vercel Authentication si el frontend necesita consumirlo.
4. Que el backend tenga desplegados los endpoints nuevos.
5. Que `AIRTABLE_TRUSTWORTHINESS_TABLE_NAME` exista en el ambiente correcto.

### Cuidado al guardar env vars con CLI

Si agregas variables con `vercel env add`, evita meter salto de línea al final del valor.

Correcto:

```bash
printf %s 'valor' | vercel env add NOMBRE preview preview --force
```

También es válido para custom environments como `dev`:

```bash
printf %s 'valor' | vercel env add NOMBRE dev --force
```

Evitar:

```bash
printf '%s\n' 'valor' | vercel env add NOMBRE preview preview --force
```

Ese salto de línea puede romper URLs, nombres de tabla y otros valores sensibles.
