# Como funciona el Asistente de Revision TW

## Resumen

El `Asistente de Revision TW` es un copiloto conversacional para ayudar a un evaluador humano a revisar una sugerencia de Trustworthiness ya generada.

No calcula la evaluacion desde cero. Su funcion es explicar, ajustar y mantener trazabilidad sobre una propuesta activa usando el contexto recibido: datos del talento, periodo evaluado, sugerencia TW, puntajes por pilar, feedback actual, reuniones, transcriptos, topics, action items, metricas e historial reciente de conversacion.

## Caso de uso

El agente se usa cuando existe una sugerencia inicial de Trustworthiness y el evaluador necesita:

- Entender por que se propuso un score global o un puntaje por pilar.
- Consultar que evidencia respalda una conclusion.
- Ajustar un pilar especifico.
- Reescribir o mejorar el feedback general.
- Distinguir si un cambio viene de evidencia del modelo, criterio humano o una mezcla de ambos.
- Preparar una confirmacion final antes de guardar.

## Alcance

Una conversacion debe representar un solo caso:

- Un talento.
- Un periodo de evaluacion.
- Una sugerencia TW activa.

Si cambia el talento, el periodo o la sugerencia activa, se debe abrir una nueva sesion o reconstruir completamente el contexto enviado al agente.

## Componentes principales

### `agent.config.json`

Define la configuracion recomendada del agente:

- Identificador, nombre, version y estado.
- Modelo recomendado y modelo fallback.
- Parametros de generacion.
- Idioma de respuesta del asistente.
- Idioma del feedback profesional.
- Archivos que componen el prompt y los contratos.
- Acciones soportadas por el agente.
- Guardrails operativos.

Configuracion clave:

- El asistente responde en espanol.
- El campo `proposal.feedback` debe mantenerse en ingles profesional.
- La salida debe seguir un `json_schema`.
- Siempre debe devolver la propuesta completa, aunque no haya cambios.

### `system-prompt.md`

Contiene las instrucciones base del agente.

Define que el agente debe:

- Explicar la sugerencia actual.
- Responder preguntas sobre evidencia ya suministrada.
- Proponer cambios solo cuando el evaluador los pida.
- Mantener toda recomendacion trazable a evidencia.
- No afirmar que un cambio ya fue guardado.
- No inventar reuniones, hechos, metricas, personas, resultados ni citas.
- Respetar la autoridad final del evaluador humano.

Tambien define como mapear la intencion del usuario hacia una accion:

- `clarify`: explicar logica, score o evidencia.
- `edit_pillar`: ajustar un pilar.
- `edit_feedback`: ajustar el feedback general.
- `review`: continuar revisando sin aprobar ni guardar.
- `save`: indicar que el usuario aprobo y el sistema puede continuar con guardado.

### `context-template.json`

Describe el contrato de entrada que debe recibir el agente en cada sesion.

Incluye:

- `record`: informacion del talento, rol, proyecto, estado y periodo.
- `twSuggestion`: sugerencia TW generada, score global y pilares.
- `proposal`: propuesta activa editable.
- `meetings`: evidencia disponible desde reuniones.
- `history`: historial reciente de conversacion.
- `latestUserMessage`: ultimo mensaje del evaluador.

Este contexto es la unica fuente que el agente puede usar para razonar. Si la evidencia no esta en el contexto, el agente no debe inventarla.

### `response-schema.json`

Define el contrato estructurado de salida.

La respuesta del agente debe incluir:

- `message`: mensaje en espanol para mostrar al evaluador.
- `nextIntent`: accion recomendada para el flujo.
- `focusArea`: pilar o seccion afectada.
- `proposal`: propuesta completa actualizada o sin cambios.
- `proposalChanged`: indica si hubo cambios.
- `changeSource`: origen del cambio.
- `needsOptionalEvidence`: indica si conviene pedir una justificacion humana opcional.
- `evidenceQuestion`: pregunta opcional, si aplica.
- `citations`: evidencia de reuniones realmente usada.

## Flujo de funcionamiento

1. El backend o frontend construye el contexto usando el contrato de `context-template.json`.
2. Se envia al modelo el `system-prompt.md`, el contexto del caso y el ultimo mensaje del usuario.
3. El agente interpreta la intencion del evaluador.
4. El agente responde en JSON siguiendo `response-schema.json`.
5. La aplicacion muestra `message` al evaluador.
6. La aplicacion usa `proposal` como la nueva propuesta activa.
7. Si `nextIntent` es `save`, la aplicacion puede continuar con su flujo de confirmacion o guardado.

## Reglas de edicion

Cuando el evaluador pide un cambio explicito de puntaje:

- El agente debe aplicarlo si esta dentro del rango 1 a 10.
- No debe bloquear el cambio por falta de evidencia.
- Debe marcar el origen como `human_override` si depende del criterio humano.
- Puede pedir una evidencia breve opcional para trazabilidad, pero no como requisito.

Cuando el cambio esta respaldado por evidencia suministrada:

- Puede marcar `changeSource` como `model_evidence`.
- Debe citar solo reuniones presentes en el contexto.

Cuando hay evidencia y criterio humano:

- Debe marcar `changeSource` como `mixed`.

Si no hay cambios:

- Debe devolver `proposalChanged: false`.
- Debe usar `changeSource: "none"`.
- Debe devolver la propuesta completa igualmente.

## Guardrails

El agente no debe:

- Inventar evidencia faltante.
- Guardar cambios por si mismo.
- Reemplazar el juicio del evaluador.
- Mezclar varios talentos o periodos en una misma conversacion.
- Afirmar que una accion ya fue persistida.
- Crear conclusiones no soportadas por el contexto.

El agente si debe:

- Ser claro cuando la evidencia es parcial, debil o ambigua.
- Separar evidencia observada de inferencia.
- Mantener el feedback alineado con los puntajes vigentes.
- Mantener el feedback final en ingles profesional.
- Mantener trazabilidad entre propuesta y evidencia.

## Ejemplo conceptual

Si el evaluador pregunta:

```text
Explicame por que Reliability esta en 6.
```

El agente deberia:

- Responder en espanol.
- Explicar la razon usando los datos disponibles.
- Citar reuniones relevantes si existen en el contexto.
- No modificar la propuesta.
- Devolver `nextIntent: "clarify"`.
- Devolver `proposalChanged: false`.

Si el evaluador dice:

```text
Sube Reliability a 8 porque yo vi mejor seguimiento en el ultimo sprint.
```

El agente deberia:

- Aplicar el cambio si el puntaje esta dentro de 1 a 10.
- Ajustar el feedback en ingles para reflejar la nueva calibracion.
- Marcar `changeSource: "human_override"` o `mixed`, segun la evidencia disponible.
- Opcionalmente pedir una frase breve para trazabilidad.
- Devolver la propuesta completa actualizada.

## Integracion recomendada

La aplicacion deberia tratar la respuesta del agente como una propuesta estructurada, no como persistencia final.

Responsabilidades recomendadas:

- El agente propone y explica.
- El frontend muestra el mensaje, cambios, evidencia y preguntas opcionales.
- El evaluador aprueba o ajusta.
- El backend valida y guarda solo cuando el flujo de producto lo permita.

