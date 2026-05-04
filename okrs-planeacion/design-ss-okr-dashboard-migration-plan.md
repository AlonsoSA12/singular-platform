# Plan de migracion de OKR Dashboard hacia Design SS

## Objetivo

Migrar el modulo `OKR Dashboard` al proyecto `Design SS`, dejando operativo el flujo principal de consulta, seguimiento y actualizacion de OKRs dentro de una sola aplicacion.

La migracion debe priorizar el flujo core del dashboard y dejar para una segunda fase las vistas complementarias, mejoras de UX y limpieza de legado.

## Enfoque general

La migracion se trabajara en solo dos fases:

- `Fase 1`: core funcional del dashboard dentro de `Design SS`
- `Fase 2`: vistas complementarias, optimizacion y limpieza tecnica

Tambien se consolidara la ruta `product/[id]` dentro de `project/[id]` como parte de la fase 1, para evitar duplicidad funcional.

## Decision de consolidacion

La ruta canonica de detalle sera:

- `/project/[id]`

La ruta legacy:

- `/product/[id]`

debe consolidarse en la misma experiencia de detalle y dejar de evolucionar como pantalla independiente.

## Fase 1: core funcional de OKR Dashboard en Design SS

### Alcance

Implementar dentro de `Design SS` todo lo necesario para que el dashboard funcione operativamente de punta a punta.

### Incluye

- Login funcional
- Home del dashboard
- Portfolio analysis
- Lista de proyectos
- Detalle de proyecto en `/project/[id]`
- History en `/history`
- Edicion inline de valores historicos y actuales donde aplique
- Integracion con Airtable para lectura de datos
- Integracion con Airtable para actualizacion de registros
- Consolidacion de `/product/[id]` dentro de `/project/[id]`
- Integracion inicial con `OKR Administrator` para acciones como `Add Objective`

### Flujo esperado en fase 1

- El usuario inicia sesion
- El usuario accede al home del dashboard
- El usuario visualiza analisis del portafolio y listado de proyectos
- El usuario entra al detalle o actividad de un proyecto
- El usuario revisa historia, metricas, estado y analisis
- El usuario puede actualizar valores permitidos

### Historias de usuario

#### HU-01

Como usuario de `Design SS`, quiero iniciar sesion y acceder al modulo de OKRs para consultar la informacion que me corresponde.

#### HU-02

Como product owner o usuario autorizado, quiero visualizar un home con resumen del portafolio de OKRs para entender rapidamente el estado general de mis proyectos.

#### HU-03

Como usuario, quiero ver el listado de proyectos relacionados conmigo para poder navegar facilmente a su actividad y detalle.

#### HU-04

Como usuario, quiero abrir la vista de detalle de un proyecto en `/project/[id]` para revisar su objetivo, sus key results, sus metricas y su estado general.

#### HU-05

Como usuario, quiero consultar la actividad historica de un proyecto en `/history` para entender su evolucion y cambios en el tiempo.

#### HU-06

Como usuario, quiero filtrar la historia por rango de fechas, objectives, key results y quarter para analizar la informacion con mayor precision.

#### HU-07

Como usuario autorizado, quiero editar valores permitidos en la vista historica para mantener actualizados los datos operativos del proyecto.

#### HU-08

Como equipo de producto, queremos integrar las lecturas del dashboard con Airtable para mantener sincronizada la informacion mostrada en `Design SS`.

#### HU-09

Como equipo de producto, queremos integrar las actualizaciones de registros con Airtable para que los cambios realizados desde `Design SS` impacten la fuente operativa correspondiente.

#### HU-10

Como equipo tecnico, queremos consolidar la ruta `/product/[id]` dentro de `/project/[id]` para evitar duplicidad de pantallas y reducir deuda tecnica.

#### HU-11

Como usuario, quiero que cualquier acceso antiguo a `/product/[id]` me lleve al detalle canonico del proyecto para no romper navegacion ni accesos previos.

#### HU-12

Como usuario, quiero ejecutar acciones relacionadas con objetivos, como `Add Objective`, desde el contexto del dashboard para mantener continuidad operativa con `OKR Administrator`.

### Criterios de aceptacion de fase 1

- El login del modulo funciona dentro de `Design SS`.
- El home del dashboard se visualiza correctamente.
- El home muestra portfolio analysis y lista de proyectos.
- La ruta `/project/[id]` funciona como detalle principal.
- La ruta `/history` funciona y permite visualizar la actividad del proyecto.
- Los filtros de historia funcionan correctamente.
- La edicion inline actualiza los datos permitidos.
- Las lecturas desde Airtable funcionan.
- Las actualizaciones hacia Airtable funcionan.
- La ruta `/product/[id]` deja de operar como pantalla independiente.
- Cualquier acceso legacy a `/product/[id]` redirige o reutiliza la experiencia consolidada.

## Fase 2: vistas complementarias, optimizacion y limpieza

### Alcance

Agregar las vistas no criticas para la operacion inicial y mejorar la calidad tecnica del modulo migrado.

### Incluye

- Pantalla `Accounts`
- Pantalla `Insights`
- Pantalla `Trends`
- Ajustes de experiencia de usuario y refinamiento visual
- Revision y depuracion de integraciones de IA secundarias
- Limpieza de codigo legado
- Reduccion de duplicidad de componentes y logica
- Optimizacion de performance y cache
- Fortalecimiento tecnico de autenticacion y roles, si aplica

### Historias de usuario

#### HU-13

Como usuario, quiero visualizar la clasificacion de cuentas o proyectos en `Rose`, `Bud` y `Thorn` para identificar rapidamente prioridades de seguimiento.

#### HU-14

Como usuario, quiero acceder a una vista de `Insights` para recibir una lectura sintetica del portafolio y sus categorias principales.

#### HU-15

Como usuario, quiero acceder a una vista de `Trends` para revisar tendencias agregadas del comportamiento historico de OKRs.

#### HU-16

Como equipo tecnico, queremos revisar y ajustar las integraciones de IA no esenciales para asegurar consistencia funcional y reducir errores o comportamientos incompletos.

#### HU-17

Como equipo tecnico, queremos limpiar rutas, componentes y codigo legacy del dashboard para simplificar el mantenimiento futuro.

#### HU-18

Como equipo tecnico, queremos optimizar cache, consultas y renderizado para mejorar velocidad y estabilidad dentro de `Design SS`.

#### HU-19

Como equipo de plataforma, queremos reforzar autenticacion y manejo de roles si el modulo requiere un esquema mas robusto que la implementacion actual.

### Criterios de aceptacion de fase 2

- `Accounts` esta disponible y funcional.
- `Insights` esta disponible y funcional.
- `Trends` esta disponible y funcional.
- Las integraciones de IA secundarias han sido revisadas y estabilizadas.
- Se ha reducido la deuda tecnica identificada en la migracion.
- El modulo presenta mejor mantenibilidad y mejor rendimiento.

## Priorizacion de rutas

### Fase 1

- `/login`
- `/`
- `/history`
- `/project/[id]`
- consolidacion de `/product/[id]`

### Fase 2

- `/accounts`
- `/insights`
- `/trends`

## Riesgos principales

- El login actual del dashboard es liviano y depende de validacion por email contra Airtable, por lo que puede requerir rediseño para alinearse con `Design SS`.
- Existe dependencia directa entre dashboard y `OKR Administrator` para el flujo de `Add Objective`.
- Parte de las integraciones de IA parecen secundarias o parcialmente incompletas y deben validarse antes de migrarlas tal cual.
- Hay rutas y componentes duplicados que deben consolidarse para evitar arrastrar deuda tecnica.

## Recomendacion de implementacion

- Ejecutar la fase 1 primero hasta lograr un flujo completo y usable dentro de `Design SS`.
- No migrar vistas secundarias antes de estabilizar login, home, detalle e historia.
- Consolidar las rutas duplicadas desde el inicio para no propagar estructuras legacy.
- Validar las integraciones con Airtable y las reglas de actualizacion antes de abrir el modulo a usuarios finales.
