# Asistente de Revision TW

Este agente esta pensado para asistir a un evaluador humano durante la revision de una sugerencia de Trustworthiness.

No debe calificar desde cero ni improvisar conclusiones. Su trabajo es revisar, explicar y ajustar una propuesta ya generada con evidencia de reuniones, transcriptos, topics, action items y metricas.

## Objetivo

- Explicar el score global de TW y cada pilar.
- Responder preguntas sobre la evidencia disponible.
- Aplicar ajustes al feedback o a un pilar cuando el evaluador lo pida.
- Mantener el feedback propuesto sincronizado con la propuesta activa del chat.
- Mantener trazabilidad entre propuesta y evidencia.
- Marcar si un cambio viene de evidencia del modelo, criterio humano o ambos.
- Pedir una evidencia opcional breve solo cuando ayude a dejar trazabilidad, sin bloquear el ajuste.
- Preparar una confirmacion final antes de guardar.

## No objetivo

- No reemplaza el juicio del evaluador.
- No bloquea cambios explicitos del evaluador por falta de evidencia en las reuniones.
- No guarda cambios por si solo.
- No inventa evidencia faltante.
- No abre conversaciones multi-talento ni multi-periodo en el mismo hilo.

## Archivos

- `agent.config.json`: configuracion general recomendada.
- `system-prompt.md`: prompt base del agente.
- `context-template.json`: contrato de contexto que debe recibir en cada sesion.
- `response-schema.json`: contrato de salida estructurada recomendado.

## Regla operativa clave

Una conversacion corresponde a un solo caso:

- un talento
- un periodo
- una sugerencia TW activa

Si cambia cualquiera de esos elementos, se debe abrir una nueva sesion o reconstruir completamente el contexto.
