# Estudio del proyecto OKRs para PO y PM

## Proposito del documento

Este documento describe que deberia mostrar y permitir analizar el modulo de OKRs si dejara de ser una maqueta y empezara a trabajar con informacion real.

No es una especificacion tecnica ni una lista de funcionalidades para implementar. Es una guia de producto para entender que valor debe entregar la experiencia, que informacion necesita, como se deberia leer y como la usarian perfiles como Product Owner, Product Manager, Delivery Lead o Account Lead.

## Vision del modulo

El modulo de OKRs debe funcionar como una capa de lectura ejecutiva y operativa sobre el avance de productos, cuentas o iniciativas.

Su objetivo no es solo mostrar metricas. Debe ayudar a responder tres preguntas:

1. Que productos o cuentas estan generando valor.
2. Que productos o cuentas estan en riesgo.
3. Que deberia hacer el PO o PM en la siguiente revision.

La maqueta actual apunta a un modelo de "portfolio review": varias cuentas/productos se agrupan, se comparan y se priorizan usando KRs, estado de salud, tendencia, frescura de datos y analisis narrativo.

## Usuario principal

### Product Owner

El PO necesita una vista clara para administrar la salud de los productos bajo su responsabilidad.

Debe poder:

- Entender si los resultados prometidos al negocio estan avanzando.
- Detectar KRs estancados o deteriorados.
- Preparar conversaciones con clientes, stakeholders o equipos internos.
- Priorizar intervenciones semanales.
- Explicar con evidencia por que una cuenta esta sana, en observacion o en riesgo.

### Product Manager

El PM necesita una lectura mas estrategica.

Debe poder:

- Ver si el producto esta cumpliendo su hipotesis de valor.
- Identificar patrones entre cuentas o segmentos.
- Comparar adopcion, monetizacion, eficiencia y retencion.
- Evaluar si una iniciativa debe seguir en Proving, pasar a Scaling, mantenerse Operated o entrar en Sunset.
- Convertir la informacion de los KRs en decisiones de roadmap.

## Concepto central

Cada cuenta o producto tiene:

- Un objetivo de negocio.
- Un contexto de por que importa.
- Una etapa del producto.
- Tres KRs principales.
- Estado de salud.
- Acciones recomendadas para el PO.
- Analisis narrativo sobre riesgos y oportunidades.

La experiencia debe evitar que el usuario revise metricas aisladas sin contexto. Cada KR debe explicar que significa para el negocio.

## Modelo mental

La maqueta organiza el portfolio en tres categorias:

- Rose: cuentas o productos con senales sanas, momentum y valor visible.
- Bud: cuentas o productos con potencial, pero que todavia necesitan foco para convertirse en valor consistente.
- Thorn: cuentas o productos con riesgo, deterioro o KRs que requieren intervencion.

Este modelo ayuda a que el PO o PM no vea una lista plana de productos, sino una cartera priorizada.

## Informacion esperada por cuenta o producto

Cada registro deberia tener una ficha con informacion suficiente para explicar el estado actual.

### Identidad

- Nombre del producto o cuenta.
- Cliente o sponsor principal.
- Tipo de cliente, por ejemplo SMB, Startup, Enterprise o Internal.
- Etapa del producto, por ejemplo Initiating, Proving, Scaling, Operated o Sunset.
- Owner responsable.

### Objetivo

El objetivo debe explicar el resultado esperado, no solo la actividad.

Ejemplo:

```text
Reducir la carga administrativa de construction managers y aumentar visibilidad de presupuesto en proyectos activos.
```

### Contexto de negocio

Debe responder por que importa.

Ejemplo:

```text
Si la cuenta adopta el flujo de reporting, puede recuperar horas operativas semanalmente y detectar overruns antes de afectar rentabilidad.
```

### Health analysis

Debe resumir el estado en lenguaje ejecutivo:

- Estado: thriving, warning o critical.
- Headline: conclusion corta.
- Insight: explicacion de negocio.

El insight debe conectar los KRs con impacto real: ingresos, ahorro, adopcion, margen, retencion, expansion o riesgo operativo.

## Informacion esperada por KR

Cada KR deberia tener:

- Nombre claro.
- Valor baseline.
- Valor actual.
- Target.
- Benchmark.
- Unidad.
- Estado.
- Historial por sprint o periodo.
- Fecha de ultima actualizacion.
- Lectura narrativa del resultado.

## Estados de KR

La maqueta usa tres estados:

- HOT: el KR muestra avance fuerte o saludable.
- COLD: el KR esta estancado, lento o con avance insuficiente.
- BLEEDING: el KR se deteriora o representa riesgo directo.

Estos estados deben ayudar a priorizar. No deben ser decorativos.

Un KR HOT deberia responder:

```text
Que esta funcionando y por que es importante protegerlo?
```

Un KR COLD deberia responder:

```text
Que esta trabando el avance y que evidencia necesitamos revisar?
```

Un KR BLEEDING deberia responder:

```text
Que decision o intervencion se necesita ahora?
```

## Frescura de datos

La experiencia debe mostrar si un KR esta desactualizado.

Para un PO o PM, un dato viejo no solo es un problema de reporting. Es una perdida de confianza para tomar decisiones.

La maqueta considera stale un KR con 7 o mas dias sin actualizar. En un producto real, este umbral podria variar por cadencia:

- Diario para productos operativos o growth.
- Semanal para revisiones de sprint.
- Quincenal o mensual para metricas financieras o de adopcion lenta.

La vista deberia mostrar:

- Que KRs estan stale.
- Cuantos dias llevan sin actualizarse.
- Quien deberia actualizarlos.
- Que decision queda bloqueada o debilitada por falta de datos.

## Vista 1: Dashboard de portfolio

La vista de portfolio debe responder:

- Como esta el conjunto completo de cuentas/productos.
- Cuantos KRs estan HOT, COLD o BLEEDING.
- Que score o grade resume la salud del portfolio.
- Como viene la tendencia en los ultimos sprints.
- Cuales son las cuentas mas fuertes.
- Cuales necesitan atencion inmediata.

El dashboard debe ser util para una revision semanal con leadership.

La informacion esperada:

- Portfolio Grade.
- Health Trend por sprint.
- Total de cuentas.
- Total de KRs.
- Distribucion HOT/COLD/BLEEDING.
- Analisis ejecutivo del portfolio.
- Senales positivas.
- Riesgos principales.
- Focos recomendados.

## Vista 2: Accounts o cartera por categoria

La vista de Accounts debe organizar las cuentas por Rose, Bud y Thorn.

Para un PO o PM, esta vista sirve para decidir donde invertir tiempo.

Rose:

- Que cuentas estan funcionando.
- Que patron deberia replicarse.
- Que expansion o siguiente paso vale la pena perseguir.

Bud:

- Que cuentas tienen traccion parcial.
- Que falta para convertir traccion en resultado.
- Que accion podria desbloquear el siguiente nivel.

Thorn:

- Que cuentas estan en riesgo.
- Que KR esta afectando el valor.
- Que intervencion debe ocurrir antes de la siguiente revision.

Cada tarjeta deberia mostrar:

- Nombre de la cuenta/producto.
- Cliente o sponsor.
- Categoria.
- Grade.
- Etapa.
- Tipo de cliente.
- Razon corta de clasificacion.

## Vista 3: Detalle de cuenta o producto

El detalle debe permitir una lectura profunda de una cuenta.

Debe mostrar:

- Objetivo.
- Descripcion.
- Categoria.
- Etapa.
- Tipo de cliente.
- Numero de KRs stale.
- Health analysis.
- Contexto de negocio.
- PO Focus o siguientes acciones.
- Cards por KR con valor actual, target, benchmark, tendencia y verdict.

Esta vista es la que un PO o PM usaria antes de una reunion con cliente, squad o leadership.

## PO Focus

El bloque PO Focus debe ser una lista concreta de acciones.

No deberia decir solo "mejorar adopcion". Deberia decir que conversacion, decision o experimento ejecutar.

Ejemplos:

- Ejecutar sesion de enablement con usuarios no activos.
- Revisar workflow de captura de presupuesto con el client lead.
- Reconfirmar criterios de exito para la reduccion de overruns.
- Analizar el motivo de estancamiento en conversion premium.
- Preparar plan de expansion para cuentas con KRs comerciales fuertes.

El PO Focus debe estar conectado a KRs especificos.

## Chat o asistente de revision

La maqueta tiene un chat mock. En una version con informacion real, el asistente deberia servir para acelerar lectura y priorizacion.

Preguntas utiles para el dashboard:

- En que deberiamos enfocarnos esta semana?
- Cual es el mayor riesgo del portfolio?
- Que cuenta esta sosteniendo mejor el portfolio?
- Que KRs estan debilitando la lectura general?

Preguntas utiles para cuentas:

- Que cuentas requieren atencion primero?
- Resume Rose, Bud y Thorn.
- Que deberiamos revisar antes del proximo sync?

Preguntas utiles para detalle:

- Cual es el KR mas debil?
- Que deberia hacer el PO ahora?
- Que evidencia soporta esta conclusion?
- Que dato esta stale y como afecta la confianza?

El asistente no deberia reemplazar la decision del PO o PM. Debe explicar, resumir, priorizar y conectar metricas con acciones.

## Paso a paso para un PO

1. Entrar al dashboard de OKRs.
2. Revisar el Portfolio Grade y la tendencia.
3. Leer el analisis ejecutivo.
4. Identificar KRs HOT, COLD y BLEEDING.
5. Abrir Accounts para ver Rose, Bud y Thorn.
6. Entrar primero a las cuentas Thorn.
7. Revisar el detalle de KRs, freshness y health analysis.
8. Definir las acciones de PO Focus para la semana.
9. Preparar comunicacion para cliente, squad o stakeholder.
10. Actualizar KRs despues de tener nueva evidencia.

## Paso a paso para un PM

1. Revisar el dashboard para entender salud general.
2. Identificar patrones por etapa de producto.
3. Comparar cuentas Proving vs Scaling.
4. Revisar si los KRs reflejan outcome real, no solo actividad.
5. Detectar cuentas que deberian cambiar de estrategia.
6. Revisar si algun Bud puede convertirse en Rose con una decision de roadmap.
7. Revisar si algun Thorn requiere intervencion, renegociacion de objetivo o Sunset.
8. Convertir hallazgos en decisiones de roadmap, experimentos o discovery.
9. Preparar narrativa ejecutiva para leadership.

## Cadencia recomendada

### Revision semanal

Objetivo: detectar cambios y acciones inmediatas.

Debe revisar:

- KRs stale.
- Nuevos BLEEDING.
- Cuentas Thorn.
- Cambios de tendencia.
- Acciones PO Focus.

### Revision de sprint

Objetivo: entender avance contra target.

Debe revisar:

- Evolucion de cada KR.
- Relacion entre outputs del equipo y outcomes del negocio.
- Bloqueos de adopcion, revenue, retencion o eficiencia.

### Revision mensual o trimestral

Objetivo: tomar decisiones estrategicas.

Debe revisar:

- Cambio de etapa del producto.
- Continuidad o ajuste de KRs.
- Expansion, pausa, pivote o Sunset.
- Aprendizajes replicables entre cuentas.

## Criterios para buenos OKRs en este modulo

Un buen objetivo debe:

- Expresar un resultado de negocio.
- Ser entendible por PO, PM, cliente y leadership.
- Estar conectado a una decision.
- Evitar lenguaje generico.

Un buen KR debe:

- Tener baseline, current y target.
- Medir resultado, no tarea.
- Tener fuente de datos.
- Tener frecuencia de actualizacion.
- Permitir detectar avance, estancamiento o deterioro.

Ejemplos de KRs utiles:

- Monthly Active Users.
- Annual Recurring Revenue.
- Budget Overrun Reduction.
- Weekly Time Saved per User.
- Conversion Rate.
- Retention.
- Cost per Transaction.
- Fill Rate.
- Delivery Time.
- Customer Satisfaction Score.

Ejemplos de KRs debiles:

- "Mejorar el producto".
- "Hablar con clientes".
- "Hacer mas features".
- "Optimizar experiencia".

Esos pueden ser actividades o iniciativas, pero no KRs por si solos.

## Informacion que deberia existir en una version real

Para que el modulo tenga valor, necesita datos confiables:

- Cuentas o productos activos.
- Owner responsable.
- Etapa del producto.
- Objetivo vigente.
- KRs vigentes.
- Baseline, current, target y benchmark.
- Historial por periodo.
- Fecha de actualizacion.
- Fuente de datos.
- Comentario cualitativo o evidencia.
- Acciones recomendadas.
- Estado de salud.
- Relacion con cliente, squad o iniciativa.

## Decisiones que el modulo debe habilitar

El modulo debe ayudar a tomar decisiones como:

- Que cuenta revisar primero.
- Que KR necesita intervencion.
- Que producto tiene senales para escalar.
- Que producto debe volver a discovery.
- Que objetivo necesita recalibracion.
- Que metricas estan desactualizadas.
- Que narrativa presentar a stakeholders.
- Que acciones ejecutar antes de la siguiente revision.

## Que no deberia ser

El modulo no deberia convertirse en:

- Una tabla estatica de metricas.
- Un reporte decorativo para leadership.
- Un lugar donde se cargan numeros sin decision asociada.
- Un reemplazo del criterio del PO o PM.
- Un dashboard que premia actividad en vez de resultado.

## Resultado esperado

El resultado esperado es que un PO o PM pueda abrir el modulo y salir con una lectura accionable:

- Donde estamos bien.
- Donde estamos en riesgo.
- Que cambio desde la ultima revision.
- Que dato falta.
- Que accion se debe tomar.
- Que historia se debe contar al cliente o leadership.

La maqueta actual ya sugiere una direccion clara: convertir OKRs en una herramienta de decision, no solo de seguimiento.

