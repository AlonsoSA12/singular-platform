# Historias de usuario macro para manejo integral de OKRs

## Enfoque

Estas 4 historias consolidan el alcance funcional principal ya definido para el manejo de OKRs.

El orden esperado de implementacion es:

1. `OKR Dashboard`
2. `OKR Administrator`

La historia de migracion de base de datos se considera cubierta por separado y no forma parte de este archivo.

## Entidades funcionales consideradas

Para estas historias se consideran como entidades principales del manejo de OKRs:

- `Key Projects` como nombre funcional de `Epics`
- `Objectives`
- `Key Results`

La entidad `Projects` se mantiene como contexto operativo para seleccionar el proyecto correcto, navegar el flujo y relacionar la administracion de OKRs con el trabajo correspondiente, pero no sustituye a `Key Projects`.

## Historia de usuario 1: dashboard core con historial

Como usuario, quiero contar con el flujo principal de consulta y seguimiento de OKRs para acceder al dashboard, revisar mi portafolio, navegar por mis proyectos, consultar el detalle de cada proyecto y analizar su historial con informacion confiable y actualizable.

### Criterios de aceptacion

- El usuario puede acceder al modulo de dashboard con el mecanismo de acceso definido para el manejo de OKRs.
- El home del dashboard esta disponible en `/`.
- El home muestra el resumen del portafolio de OKRs.
- El home muestra el listado de proyectos relacionados con el usuario.
- El usuario puede navegar desde el home hacia el detalle de un proyecto.
- La ruta canonica de detalle es `/project/[id]`.
- La vista de detalle del proyecto muestra objetivo, key results, metricas, estado y analisis correspondientes.
- El usuario puede navegar desde el home o el detalle hacia la historia del proyecto.
- La vista `/history` permite consultar la actividad historica del proyecto.
- La vista `/history` permite filtrar por rango de fechas.
- La vista `/history` permite filtrar por objectives.
- La vista `/history` permite filtrar por key results.
- La vista `/history` permite filtrar por quarter.
- La vista `/history` permite visualizar la informacion en tabla, graficas o en la representacion equivalente aprobada.
- El usuario autorizado puede editar los valores permitidos desde la experiencia historica o equivalente.
- Las lecturas del dashboard se encuentran integradas con la fuente de datos definida para la operacion de OKRs.
- Las actualizaciones del dashboard se sincronizan correctamente con la fuente operativa definida.
- La ruta `/product/[id]` deja de existir como pantalla independiente.
- Cualquier acceso previo a `/product/[id]` redirige o reutiliza correctamente la experiencia consolidada en `/project/[id]`.
- La accion `Add Objective` se identifica como parte del alcance funcional de `OKR Administrator` y no como parte del alcance del dashboard.
- El flujo completo de dashboard e historial puede ejecutarse de punta a punta sin depender del proyecto original.

## Historia de usuario 2: dashboard complementario y analisis adicional

Como usuario, quiero contar con las funcionalidades complementarias del dashboard para ampliar mi capacidad de seguimiento y analisis del portafolio mediante vistas agregadas, clasificaciones y tendencias consistentes con la operacion principal.

### Criterios de aceptacion

- La vista `Accounts` esta disponible en `/accounts` como funcionalidad complementaria del dashboard.
- La vista `Accounts` clasifica proyectos o cuentas en categorias como `Rose`, `Bud` y `Thorn`, o en el modelo de clasificacion aprobado.
- La vista `Accounts` permite abrir el detalle o actividad del proyecto desde cada tarjeta o fila mostrada.
- La vista `Accounts` refleja el estado derivado de los key results y del analisis disponible para cada proyecto.
- La vista `Insights` esta disponible en `/insights` como funcionalidad de analisis complementario del portafolio.
- La vista `Insights` presenta una lectura sintetica del portafolio basada en proyectos, categorias, metricas y estados agregados.
- La vista `Insights` muestra una narrativa, resumen o interpretacion ejecutiva cuando esa funcionalidad forme parte del alcance aprobado.
- La vista `Insights` utiliza datos consistentes con el home, el detalle del proyecto y la historia.
- La vista `Trends` esta disponible en `/trends` como funcionalidad de analisis historico agregado.
- La vista `Trends` permite consultar tendencias agregadas del comportamiento historico de OKRs en distintos rangos de tiempo.
- La vista `Trends` muestra graficas o visualizaciones que permitan identificar evolucion, estabilidad o deterioro del portafolio o de los key results agregados.
- Las vistas complementarias reutilizan las mismas reglas de negocio, transformaciones y fuentes de datos del flujo principal cuando aplique.
- Las integraciones de IA incluidas en estas vistas tienen un comportamiento claro, consistente y util para el usuario final.
- Las funcionalidades complementarias no generan contradicciones con la informacion mostrada en el flujo principal del dashboard.
- La navegacion entre vistas complementarias y flujo principal se mantiene clara y continua.

## Historia de usuario 3: administracion de objectives con sugerencia de key projects

Como usuario, quiero crear y administrar `Objectives` con generacion sugerida de `Key Projects` para que cada objetivo quede acompañado por opciones accionables, relacionadas y suficientemente definidas desde el momento de su creacion.

### Criterios de aceptacion

- El usuario puede acceder al listado de proyectos permitidos dentro del modulo de administracion de OKRs en `/projects`.
- El usuario puede seleccionar un proyecto y continuar el flujo con ese contexto.
- El modulo conserva el contexto del proyecto seleccionado durante las acciones relacionadas con objectives.
- El usuario puede consultar los objectives del proyecto en `/objectives/[projectId]`.
- El usuario puede abrir el detalle de un objective en `/objective/[projectId]/[objectiveId]`.
- El usuario puede crear un objective en `/create/[projectId]`.
- El usuario puede completar el flujo de creacion de objective sin romper la navegacion.
- El usuario puede crear un objective mediante formulario, chatbot o la modalidad aprobada para el flujo final.
- Al crear un objective, el sistema genera `3` sugerencias de `Key Projects` relacionadas con ese objective.
- Cada sugerencia de `Key Project` se presenta con la informacion necesaria para su evaluacion y uso dentro del flujo aprobado.
- El usuario puede revisar las `3` sugerencias antes de continuar.
- El usuario puede seleccionar el `Key Project` que trabajara para ese objective, o ejecutar la accion equivalente definida en el flujo final.
- El usuario puede editar o refinar el objective sin perder la relacion con los `Key Projects` sugeridos o seleccionados.
- El usuario puede mejorar un objective existente en `/improve/[projectId]/[objectiveId]` para refinar redaccion, claridad, medicion o alineacion con el proyecto.
- El usuario puede editar o mejorar objectives desde chatbot cuando ese modo forme parte del flujo final aprobado.
- El usuario puede revisar el resultado generado antes de finalizar la accion cuando ese paso forme parte del flujo aprobado.
- El usuario puede utilizar el `Project Brief` o el contexto funcional equivalente en los flujos donde aplique.
- Las lecturas requeridas para `Projects`, `Objectives` y sugerencias de `Key Projects` funcionan correctamente.
- La persistencia del objective y de su relacion con el `Key Project` seleccionado funciona correctamente.
- El flujo completo de creacion y administracion de objectives puede ejecutarse de punta a punta como parte del manejo integral de OKRs.

## Historia de usuario 4: administracion de key results y gestion conversacional

Como usuario, quiero administrar `Key Results` dentro del contexto de un `Objective` y del `Key Project` asociado mediante formulario o chatbot para crear, editar y refinar resultados medibles con una experiencia consistente entre pantallas, contexto de proyecto, persistencia y asistencia conversacional.

### Criterios de aceptacion

- El usuario puede consultar los `Key Results` asociados a un objective desde `/objective/[projectId]/[objectiveId]` o desde la vista equivalente aprobada.
- El usuario puede identificar el `Objective` y el `Key Project` asociado dentro del flujo de trabajo.
- El usuario puede crear un `Key Result` dentro de un objective en `/create-kr/[projectId]/[objectiveId]`.
- El usuario puede crear un `Key Result` mediante formulario, chatbot o la modalidad aprobada para el flujo final.
- El usuario puede editar un `Key Result` existente en `/edit-kr/[projectId]/[objectiveId]/[keyResultId]`.
- El usuario puede editar un `Key Result` mediante formulario, chatbot o la modalidad aprobada para el flujo final.
- El usuario puede mantener la relacion correcta entre `Objective`, `Key Project` y `Key Result` durante creacion o edicion cuando esa relacion forme parte del flujo final aprobado.
- El usuario puede utilizar el chatbot para ajustar redaccion, metrica y valores operativos del `Key Result` cuando ese flujo forme parte del alcance aprobado.
- El usuario puede utilizar el chatbot no solo para crear, sino tambien para mejorar o editar `Key Results` de manera confiable.
- El comportamiento entre formulario, chatbot y resultado persistido permanece consistente.
- La informacion de `Projects`, `Key Projects`, `Objectives` y `Key Results` se mantiene coherente entre pantallas, formularios y chatbot.
- Las lecturas requeridas para `Key Results` funcionan correctamente.
- Las persistencias requeridas para `Key Results` funcionan correctamente.
- Los estados de carga, error, vacio y exito acompañan correctamente el flujo operativo.
- La navegacion entre objective, seleccion de `Key Project`, creacion y edicion de `Key Results` se mantiene clara y continua.
- El modulo de administracion complementa el manejo general de OKRs sin duplicar responsabilidades ajenas a su alcance, como el acceso principal al sistema.
- El flujo completo de administracion de `Key Results` puede ejecutarse de punta a punta con consistencia funcional y operativa.
