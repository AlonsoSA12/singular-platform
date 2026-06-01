# Historias de usuario macro para migracion de OKR Dashboard

## Historia de usuario 1: fase 1

Como usuario, quiero contar con el flujo core de `OKR Dashboard` completamente funcional para iniciar sesion, consultar mi portafolio, revisar mis proyectos, analizar su actividad historica y actualizar la informacion operativa necesaria sin depender del proyecto anterior.

### Criterios de aceptacion

- El usuario puede iniciar sesion y acceder al modulo de OKRs.
- El modulo valida correctamente el acceso del usuario con la fuente de datos definida.
- El home del dashboard esta disponible.
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
- La vista `/history` permite visualizar la informacion tanto en tabla como en graficas, si ese comportamiento se conserva.
- El usuario autorizado puede editar los valores permitidos desde la experiencia historica o equivalente.
- Las lecturas del dashboard se encuentran integradas con Airtable o con la nueva capa de datos definida para reemplazarla.
- Las actualizaciones del dashboard se sincronizan correctamente con la fuente operativa definida.
- La ruta `/product/[id]` deja de existir como pantalla independiente.
- Cualquier acceso previo a `/product/[id]` redirige o reutiliza correctamente la experiencia consolidada en `/project/[id]`.
- La accion `Add Objective` se reconoce como parte del alcance funcional de `OKR Administrator` y no como parte del alcance de fase 1 de `OKR Dashboard`.
- El flujo completo de fase 1 puede ejecutarse de punta a punta sin depender del proyecto `OKR Dashboard` original.

## Historia de usuario 2: fase 2

Como usuario, quiero contar con las funcionalidades complementarias del dashboard, los analisis adicionales y las mejoras de calidad del modulo de OKRs para ampliar mi capacidad de seguimiento, analisis y gestion diaria con una experiencia mas completa, estable y mantenible.

### Criterios de aceptacion

- La vista `Accounts` esta disponible como funcionalidad complementaria del dashboard.
- La vista `Accounts` clasifica proyectos o cuentas en categorias como `Rose`, `Bud` y `Thorn`, o en el modelo de clasificacion que se apruebe para esta fase.
- La vista `Accounts` permite abrir el detalle o actividad del proyecto desde cada tarjeta o fila mostrada.
- La vista `Accounts` refleja el estado derivado de los KRs y del analisis disponible para cada proyecto.
- La vista `Insights` esta disponible como funcionalidad de analisis complementario del portafolio.
- La vista `Insights` presenta una lectura sintetica del portafolio basada en sus proyectos, categorias, metricas y estados agregados.
- La vista `Insights` muestra una narrativa, resumen o interpretacion ejecutiva del portafolio cuando esa funcionalidad forme parte del alcance aprobado.
- La vista `Insights` utiliza datos consistentes con el resto del dashboard y no genera contradicciones con el home o la historia del proyecto.
- La vista `Trends` esta disponible como funcionalidad de analisis historico agregado.
- La vista `Trends` permite consultar tendencias agregadas del comportamiento historico de OKRs en distintos rangos de tiempo.
- La vista `Trends` muestra graficas o visualizaciones que permitan identificar evolucion, estabilidad o deterioro del portafolio o de los KRs agregados.
- Las vistas complementarias reutilizan, cuando sea posible, las mismas reglas de negocio, transformaciones y fuentes de datos del flujo core.
- Las integraciones de IA secundarias o complementarias han sido revisadas funcionalmente.
- Cada integracion de IA incluida en fase 2 tiene un comportamiento claro, consistente y util para el usuario final.
- Las integraciones de IA que no aporten valor suficiente, presenten errores o generen resultados ambiguos han sido corregidas, simplificadas o descartadas.
- Se han eliminado o reducido rutas, componentes, estados y logica legacy que ya no aportan valor despues de la consolidacion del dashboard.
- La solucion presenta menor duplicidad tecnica que la implementacion original.
- Las rutas complementarias y sus componentes quedan alineados con la arquitectura final del modulo.
- La navegacion entre vistas complementarias y el flujo core no rompe la experiencia principal ya implementada en fase 1.
- La performance del modulo fue revisada y optimizada en consultas, cache, renderizado o manejo de datos donde sea necesario.
- Las vistas agregadas e historicas cargan de forma razonable y consistente con el volumen de datos esperado.
- El modulo resultante es mas mantenible y mas facil de evolucionar que la version original.
- Si durante esta fase se redefine autenticacion, sesiones o roles complementarios, dichos cambios no deben romper el acceso ni el flujo principal del dashboard.
- La fase 2 complementa y extiende el valor del dashboard sin afectar negativamente la operacion principal ya estabilizada en fase 1.
