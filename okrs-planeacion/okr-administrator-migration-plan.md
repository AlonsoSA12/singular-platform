# Plan de migracion de OKR Administrator

## Objetivo

Migrar el modulo `OKR Administrator` como la experiencia complementaria encargada de crear, consultar, mejorar y editar `Objectives` y `Key Results`, manteniendo continuidad funcional en los procesos actuales y asegurando una operacion consistente, estable y bien resuelta desde su definicion inicial.

La migracion debe preservar el flujo completo de administracion de OKRs:

- seleccion de proyecto
- creacion de objective
- consulta de objectives
- consulta de detalle de objective
- mejora y edicion asistida por IA del objective
- creacion de key results
- edicion de key results
- gestion conversacional mediante chatbot para crear, mejorar y editar

## Alcance funcional actual del modulo

El modulo hoy cubre estas capacidades principales:

- Seleccion de proyecto activo o semi-activo
- Consulta de objectives por proyecto
- Vista de detalle de objective
- Creacion de objective en modo chatbot o formulario
- Mejora y edicion de objective en modo chatbot o formulario
- Creacion de key result en modo chatbot o formulario
- Edicion de key result en modo chatbot o formulario
- Uso de `Project Brief` o `MAP / PEP` como contexto para asistencia IA

## Mapa funcional actual

### Rutas principales

- `/projects`
- `/create/[projectId]`
- `/objectives/[projectId]`
- `/objective/[projectId]/[objectiveId]`
- `/improve/[projectId]/[objectiveId]`
- `/create-kr/[projectId]/[objectiveId]`
- `/edit-kr/[projectId]/[objectiveId]/[keyResultId]`

### Integraciones actuales

- Webhooks externos para lectura de proyectos y objectives
- Webhooks externos para creacion o actualizacion de objectives
- Webhooks externos para consulta de key results
- Airtable API directa para lectura puntual de key results
- Airtable API directa para actualizacion de key results
- Modelos de IA para:
  - crear objective
  - generar metric
  - mejorar objective
  - crear key result
  - editar key result

## Enfoque recomendado

Trabajar la migracion en dos fases:

- `Fase 1`: core funcional de administracion de objectives y key results
- `Fase 2`: consolidacion operativa, robustez funcional y mejoras de experiencia

## Criterios transversales de calidad

Estos criterios deben considerarse desde el principio en ambas fases y no como trabajo separado o posterior:

- consistencia entre pantallas, formularios, chatbot y persistencia final
- claridad en navegacion, retorno entre vistas y continuidad del flujo
- manejo correcto de estados de carga, vacio, error y exito
- coherencia de datos entre projects, objectives y key results
- confiabilidad en lecturas y escrituras
- uso del `Project Brief` solo cuando aporte contexto real
- comportamiento predecible del chatbot y del formulario cuando conviven en el mismo flujo
- estructura suficientemente clara para permitir evolucion futura sin reabrir decisiones base

## Fase 1: core funcional de OKR Administrator

### Objetivo de la fase

Dejar operativo el flujo completo de administracion de objectives y key results, de punta a punta, como parte del manejo integral de OKRs.

### Alcance funcional

- Seleccion de proyecto
- Carga de proyectos disponibles para el usuario
- Vista de objectives por proyecto
- Vista de detalle de objective
- Creacion de objective
- Edicion y mejora de objective
- Consulta de key results de un objective
- Creacion de key result
- Edicion de key result
- Gestion conversacional por chatbot para objectives y key results
- Integracion de `Project Brief` como contexto funcional cuando aplique
- Persistencia y lectura de datos con las integraciones definidas para la migracion

### Capacidades incluidas

#### 1. Seleccion y contexto de proyecto

- El usuario puede consultar los proyectos disponibles
- El usuario puede seleccionar un proyecto
- El sistema conserva el proyecto seleccionado para los flujos siguientes
- El modulo distingue proyectos activos o semi-activos segun las reglas aprobadas

#### 2. Gestion de objectives

- El usuario puede crear un objective desde el proyecto seleccionado
- La creacion de objective puede realizarse en modo chatbot o modo formulario, si ambos modos se conservan
- El usuario puede revisar el resumen del objective antes de finalizar
- El usuario puede consultar la lista de objectives del proyecto
- El usuario puede abrir el detalle de un objective
- El usuario puede editar manualmente los campos permitidos del objective
- El usuario puede mejorar el objective con ayuda de IA
- El usuario puede editar y refinar el objective desde una experiencia conversacional cuando ese flujo se mantenga en el modulo

#### 3. Gestion de key results

- El usuario puede consultar los key results asociados a un objective
- El usuario puede crear un key result dentro de un objective
- La creacion de key result puede realizarse en modo chatbot o modo formulario, si ambos modos se conservan
- El usuario puede editar un key result existente
- La edicion de key result puede realizarse en modo chatbot o modo formulario, si ambos modos se conservan
- El usuario puede utilizar el chatbot para ajustar redaccion, metrica y valores operativos del key result cuando ese flujo se mantenga en el modulo

#### 4. Contexto funcional de Project Brief

- El usuario puede visualizar el `Project Brief`
- El `Project Brief` puede ser usado como insumo contextual en los flujos asistidos por IA
- El modulo puede distinguir cuando el brief fue utilizado en la interaccion, si ese comportamiento sigue siendo necesario

### Historias de usuario

#### HU-01

Como usuario, quiero seleccionar un proyecto dentro del flujo de gestion de OKRs para administrar sus objectives y key results en el contexto correcto.

#### HU-02

Como usuario, quiero consultar los objectives de un proyecto para entender el estado actual de planeacion y administracion del trabajo OKR.

#### HU-03

Como usuario, quiero crear un objective para un proyecto con ayuda de formulario o asistencia conversacional para acelerar la definicion de objetivos de calidad.

#### HU-04

Como usuario, quiero revisar el detalle de un objective para consultar sus campos principales, su contexto y sus key results asociados.

#### HU-05

Como usuario, quiero editar o mejorar un objective para refinar su redaccion, claridad, medicion y alineacion con el proyecto.

#### HU-06

Como usuario, quiero crear un key result dentro de un objective para convertir el objetivo en resultados medibles y accionables.

#### HU-07

Como usuario, quiero editar un key result existente para corregir o mejorar su redaccion, su metrica o sus valores operativos.

#### HU-08

Como usuario, quiero utilizar el chatbot como mecanismo de trabajo para crear, mejorar y editar objectives y key results de manera conversacional cuando ese flujo sea parte del alcance del modulo.

#### HU-09

Como usuario, quiero utilizar el `Project Brief` como contexto durante la definicion o mejora de objectives y key results para mantener coherencia con el proyecto.

#### HU-10

Como equipo tecnico, queremos asegurar la lectura y persistencia de objectives y key results mediante las integraciones definidas para que el flujo funcional opere de punta a punta.

#### HU-11

Como equipo de producto, queremos que este modulo complemente el manejo general de OKRs sin duplicar capacidades ya cubiertas por el flujo principal, especialmente en acceso y autenticacion.

### Criterios de aceptacion de fase 1

- El usuario puede acceder al listado de proyectos permitidos.
- El usuario puede seleccionar un proyecto y continuar el flujo con ese contexto.
- El usuario puede consultar los objectives del proyecto.
- El usuario puede abrir el detalle de un objective.
- El usuario puede crear un objective.
- El usuario puede completar el flujo de creacion de objective sin romper la navegacion.
- El usuario puede editar o mejorar un objective existente.
- El usuario puede crear, mejorar o editar objectives desde chatbot cuando ese modo forme parte del flujo final aprobado.
- El usuario puede consultar los key results asociados a un objective.
- El usuario puede crear un key result dentro de un objective.
- El usuario puede editar un key result existente.
- El usuario puede crear o editar key results desde chatbot cuando ese modo forme parte del flujo final aprobado.
- El usuario puede utilizar el `Project Brief` en los flujos donde aplique.
- Las lecturas requeridas para proyectos, objectives y key results funcionan correctamente.
- Las persistencias requeridas para objectives y key results funcionan correctamente.
- El flujo completo de administracion de objectives y key results puede ejecutarse de punta a punta.
- La autenticacion necesaria para llegar a este modulo se asume resuelta por el flujo general de manejo de OKRs y no forma parte del alcance de esta fase.

## Fase 2: consolidacion operativa, robustez funcional y mejoras

### Objetivo de la fase

Fortalecer la operacion del modulo, mejorar la consistencia funcional entre sus pantallas y flujos, reducir fragilidad en integraciones y dejar el comportamiento general correctamente resuelto para evolucion futura.

### Alcance funcional y tecnico

- Reducir dependencia de `localStorage` como mecanismo principal de estado critico
- Revisar y consolidar integraciones dispersas entre webhooks y Airtable directo
- Unificar reglas de lectura y escritura de objectives y key results
- Revisar consistencia de campos, nombres y transformaciones de datos
- Mejorar resiliencia ante errores y estados intermedios
- Mejorar mensajes de error, estados de carga y retornos de exito
- Revisar y estabilizar comportamientos IA
- Reducir duplicidad de comportamientos y dejar rutas, componentes y flujos con una responsabilidad mas clara

### Capacidades incluidas

#### 1. Consolidacion de capa de datos

- Revisar las integraciones actuales por webhook
- Revisar las integraciones actuales directas contra Airtable
- Definir una estrategia consistente para lectura y escritura
- Reducir puntos de fallo por dispersion de integraciones

#### 2. Estabilizacion de IA

- Revisar los prompts y salidas estructuradas
- Validar que los flujos chatbot y formulario no generen contradicciones entre si
- Confirmar que los cambios asistidos por IA se reflejen correctamente en los formularios y persistencias
- Confirmar que el chatbot funcione tambien como interfaz confiable de edicion y refinamiento, no solo de creacion
- Ajustar o descartar comportamientos IA que no agreguen valor suficiente

#### 3. Mejora de UX operativa

- Mejorar navegacion entre proyectos, objectives y key results
- Mejorar estados vacios, errores y loaders
- Asegurar una experiencia coherente al volver desde create, improve y edit
- Mejorar claridad en las acciones disponibles por pantalla

#### 4. Limpieza tecnica

- Reducir duplicidad de logica entre modos chat y form cuando sea posible
- Eliminar comportamientos innecesarios o ambiguos que compliquen la experiencia del usuario
- Dejar una estructura de implementacion clara para futuras evoluciones del modulo

### Historias de usuario

#### HU-11

Como usuario, quiero que la informacion de projects, objectives y key results sea consistente en todo el modulo para confiar en los datos que estoy administrando.

#### HU-12

Como usuario, quiero que los flujos asistidos por IA sean utiles, claros y coherentes con los formularios y cambios que realizo manualmente.

#### HU-13

Como usuario, quiero una navegacion mas clara y estados de interfaz mas confiables para trabajar sin confusiones ni cortes innecesarios del flujo.

#### HU-14

Como usuario, quiero que la informacion mostrada y actualizada en projects, objectives y key results sea consistente entre pantallas, formularios y chatbot para confiar en el resultado final del modulo.

#### HU-15

Como usuario, quiero que el modulo responda correctamente ante errores, cargas, retornos entre vistas y cambios de contexto para trabajar sin fricciones ni comportamientos ambiguos.

#### HU-16

Como equipo de producto, queremos que las integraciones, reglas de datos y comportamientos asistidos por IA queden correctamente resueltos dentro del modulo para sostener una operacion confiable y lista para crecer.

#### HU-17

Como equipo de producto, queremos que este modulo se acople de forma mas limpia al manejo global de OKRs sin arrastrar mecanismos tecnicos propios que ya no deberian vivir aqui.

### Criterios de aceptacion de fase 2

- El contexto de usuario y proyecto se maneja de forma mas robusta.
- La capa de lectura y escritura de datos es mas consistente que en la implementacion original.
- Las integraciones necesarias para projects, objectives y key results presentan menor fragilidad operativa.
- Los flujos IA fueron revisados y estabilizados.
- Los resultados IA y los formularios permanecen consistentes entre si.
- El chatbot puede participar de forma confiable en creacion, mejora y edicion sin perder consistencia con la persistencia real de datos.
- Los estados de carga, error y exito mejoran la experiencia operativa.
- La navegacion entre rutas principales es mas clara y predecible.
- Los comportamientos duplicados o ambiguos se reducen respecto a la implementacion original.
- El modulo queda preparado para futuras mejoras sin reabrir definiciones base del flujo.
- El modulo queda mejor acoplado al manejo integral de OKRs y con menos responsabilidades que no le corresponden.

## Riesgos principales

- La capa de datos esta fragmentada entre webhooks y Airtable directo.
- Parte del estado operativo depende de `localStorage` y `sessionStorage`.
- Los flujos chatbot y form comparten responsabilidad funcional y pueden generar duplicidad o inconsistencias.
- La experiencia depende del uso correcto del `selectedProject` y otros artefactos de sesion guardados en navegador.

## Recomendacion de implementacion

- Ejecutar la fase 1 hasta cerrar el flujo completo de administracion de objectives y key results.
- No mover mejoras de consolidacion por delante del flujo core, salvo cuando bloqueen funcionamiento.
- Tratar la fase 2 como una consolidacion real de comportamiento, consistencia y operacion, no solo como retoque visual.
- Validar especialmente el comportamiento de persistencia en objectives y key results antes de abrir el modulo a usuarios finales.
