# Plan de migracion de base de datos para OKRs

## Objetivo

Crear una nueva base de datos separada para OKRs, donde se sincronicen solo las tablas y campos necesarios desde Airtable para operar el modelo de trabajo de OKRs.

La nueva base no debe ser un espejo completo de la base actual. Debe enfocarse en soportar la operacion de OKRs con una estructura mas limpia, controlada y mantenible.

## Alcance por fases

### Fase 1

Migrar las siguientes tablas:

- `Epics` renombrada como `Key Projects`
- `Key Results`
- `Projects`
- `Objetives` normalizada como `Objectives`

### Fase 2

Migrar las siguientes tablas:

- `User Resources`
- `Resources`

### Fase 3

Migrar las siguientes tablas:

- `Sprint`
- `Stories`

## Reglas de migracion

- Crear una nueva base de datos independiente para OKRs.
- Crear columnas sincronizadas en Airtable para traer los datos desde la base origen.
- Jalar solo los campos necesarios para la nueva base.
- No migrar campos de tipo `lookup`.
- No migrar campos de tipo `AI`.
- Los campos `lookup` y `AI` deben ser inventariados y listados, aunque no se migren.
- El resto de campos quedan abiertos a seleccion segun necesidad funcional.
- Mantener trazabilidad entre tabla origen y tabla destino.

## Enfoque funcional recomendado

- La tabla `Epics` debe mostrarse en la nueva base como `Key Projects`.
- La tabla `Objetives` debe normalizarse como `Objectives`.
- La seleccion de campos a migrar debe hacerse por tabla y por valor de negocio.
- La base nueva debe contener solo la informacion necesaria para la operacion de OKRs.

## Historias de usuario

### Fase 1: base inicial de OKRs

#### HU-01

Como administrador de datos, quiero crear una nueva base de datos para OKRs para centralizar la informacion necesaria sin depender de la estructura completa de la base original.

#### HU-02

Como analista funcional, quiero definir el esquema inicial de las tablas `Key Projects`, `Key Results`, `Projects` y `Objectives` para que la nueva base responda al modelo de trabajo de OKRs.

#### HU-03

Como administrador de Airtable, quiero crear columnas sincronizadas para las tablas de fase 1 para traer automaticamente los campos aprobados desde la base origen.

#### HU-04

Como responsable de datos, quiero identificar y documentar todos los campos `lookup` y `AI` de las tablas de fase 1 para excluirlos de la migracion y mantener trazabilidad de lo no migrado.

#### HU-05

Como product owner, quiero seleccionar que campos no calculados ni AI se migran por cada tabla para asegurar que la nueva base contenga solo informacion util para la operacion de OKRs.

#### HU-06

Como usuario de negocio, quiero que la tabla `Epics` sea representada como `Key Projects` en la nueva base para alinear el lenguaje de la plataforma con el modelo OKR.

#### HU-07

Como responsable de calidad de datos, quiero validar que los registros sincronizados de fase 1 coincidan con la informacion fuente en campos y volumen para asegurar una migracion confiable.

### Fase 2: recursos

#### HU-08

Como administrador de datos, quiero migrar las tablas `User Resources` y `Resources` a la nueva base para complementar la operacion de OKRs con informacion de asignacion y soporte.

#### HU-09

Como responsable funcional, quiero revisar que campos de recursos aportan valor al modelo OKR para migrar solo la informacion necesaria y evitar ruido en la nueva base.

#### HU-10

Como responsable de calidad, quiero repetir la regla de exclusion de campos `lookup` y `AI` en las tablas de recursos para mantener consistencia entre fases.

### Fase 3: ejecucion

#### HU-11

Como administrador de datos, quiero migrar las tablas `Sprint` y `Stories` a la nueva base para conectar la planeacion de OKRs con la ejecucion operativa.

#### HU-12

Como lider de producto, quiero relacionar `Stories` y `Sprints` con `Projects`, `Key Projects`, `Key Results` u `Objectives` cuando aplique para tener trazabilidad entre estrategia y delivery.

#### HU-13

Como responsable de datos, quiero validar que la incorporacion de `Sprint` y `Stories` no introduzca dependencias en campos `lookup` o `AI` para mantener la base destino limpia y sostenible.

### Historias transversales

#### HU-14

Como equipo tecnico, queremos contar con un inventario de campos por tabla clasificados como `migrado`, `no migrado`, `lookup`, `AI` o `pendiente de decision` para facilitar diseno, validacion y auditoria.

#### HU-15

Como administrador de plataforma, quiero definir una estrategia de sincronizacion y actualizacion de datos para asegurar que la nueva base permanezca consistente con la fuente.

#### HU-16

Como equipo de implementacion, queremos documentar reglas de mapeo de nombres, tipos de campo y relaciones para facilitar mantenimiento y futuras fases.

## Criterios de aceptacion globales

- Existe una nueva base separada para OKRs.
- Las tablas de fase 1 estan creadas y sincronizadas.
- `Epics` se refleja como `Key Projects`.
- `Objetives` se refleja como `Objectives`.
- Los campos `lookup` no se migran.
- Los campos `AI` no se migran.
- Los campos `lookup` y `AI` quedan inventariados en un listado.
- Los campos restantes pasan por seleccion explicita.
- Se valida consistencia de registros y campos migrados por fase.

## Sugerencias de epic name

### Opcion recomendada

- `Crear base de datos operativa para OKRs`

### Otras opciones

- `Migracion de datos hacia la nueva base de OKRs`
- `Implementacion de base sincronizada para OKRs`
- `OKR Data Platform Migration`
- `OKR Data Foundation`
- `OKR Workspace Data Migration`
