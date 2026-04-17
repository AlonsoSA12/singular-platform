# Monthly Trustworthiness Reference

Este documento resume como funciona la tabla `Monthly Trustworthiness Exams` en Airtable.

Fuentes usadas:

- Schema exportado en [monthly-trustworthiness-schema.json](/Users/alonsosantamaria/Documents/SS Arquitecture/docs/monthly-trustworthiness-schema.json)
- Registros reales observados en Airtable el `2026-04-16` (`3867` registros)

Importante:

- El schema exportado si contiene los nombres de campos, tipos y la descripcion de la formula general de `Trustworthiness`.
- El schema exportado no incluye el cuerpo exacto de las formulas de `Reliability Meaning`, `Intimacy Meaning`, `Group Thinking Meaning`, `Credibility Meaning` ni `Trustworthiness Meaning`.
- Por eso, los textos de significados y rangos de este documento fueron reconstruidos a partir de los valores reales observados en la tabla.

## 1. Campos que alimentan el TW

Los 4 inputs numericos del TW son:

- `Reliability Points` (rating, max 10)
- `Intimacy Points` (rating, max 10)
- `Group Thinking Points` (rating, max 10)
- `Credibility Points` (rating, max 10)

Cada uno tiene:

- una pregunta dinamica (`... Question`)
- un puntaje editable (`... Points`)
- un significado calculado (`... Meaning`)

## 2. Formula del Trustworthiness

Segun la descripcion del schema:

```text
TW = (Credibility + Reliability + 2*Intimacy + 2*Group Thinking) / 60
```

Reglas:

- `Intimacy` pesa `2x`
- `Group Thinking` pesa `2x`
- `Reliability` pesa `1x`
- `Credibility` pesa `1x`
- Si falta cualquiera de los 4 puntajes, `Trustworthiness` devuelve vacio

Notas:

- El minimo teorico es `6 / 60 = 0.10` si todos los pilares reciben `1`
- El maximo teorico es `60 / 60 = 1.00` si todos los pilares reciben `10`

## 3. Buckets observados de Trustworthiness Meaning

En los registros observados, `Trustworthiness Meaning` cae en estos rangos:

| Meaning | Rango observado de TW |
| --- | --- |
| `Initial Trust Development` | `0.1000` a `0.1833` |
| `Basic Trust` | `0.2000` a `0.3833` |
| `Moderate Trust` | `0.4000` a `0.5833` |
| `High Trust` | `0.6000` a `0.7833` |
| `Excellence in Trust` | `0.8000` a `1.0000` |

Estos rangos estan basados en datos observados. Coinciden con cortes por bloques de `0.20`.

## 4. Comportamiento general de las preguntas

Cada campo `... Question` cambia segun el contexto:

- pregunta para evaluar al talento
- pregunta para evaluar al cliente
- vacio si no hay rol asignado

En los registros observados aparecieron estas variantes:

### Reliability Question

- Talento: `Does the talent meet with excellence the commitments and deadlines?`
- Cliente: `Does the client provide resources and support to keep the project on track in terms of time?`

### Intimacy Question

- Talento: `Does the talent demonstrate understanding of the client's needs, fostering a close, empathetic, and trustworthy relationship?`
- Cliente: `How would you rate the level of openness and communication of the client in creating an effective relationship with our team?`

### Group Thinking Question

- Talento: `Does the talent collaborate with the team and prioritize collective interests over individual ones?`
- Cliente: `How would you rate the client's openness to collaborate and positively receive value propositions offered to them, as well as actively engage in discussions to enhance the project's success?`

### Credibility Question

- Talento: `Does the talent demonstrate the knowledge and competence necessary to effectively perform their role?`
- Cliente: `Does the client provide more details about their goals and specific needs for the project's success?`

## 5. Reliability

Peso en la formula: `1x`

| Points | Talent / internal meaning | Client meaning |
| --- | --- | --- |
| `1` | `Never fulfills commitments, affecting reliability.` | `Not observed in Airtable records.` |
| `2` | `Rarely keeps promises; frequently misses deadlines.` | `Not observed in Airtable records.` |
| `3` | `Fulfills some commitments, but is unreliable in most cases.` | `Low: Reliability is low. The client provides some resources and limited support to keep the project on track in terms of time, although there are significant areas that require improvement to ensure timeliness.` |
| `4` | `Occasionally meets deadlines, but lack of consistency raises concerns.` | `Below Average: Reliability is below average. The client offers resources and support, but they are not sufficient to consistently keep the project on track in terms of time, resulting in occasional delays.` |
| `5` | `Moderately meets deadlines, although often delays or fails to fulfill completely.` | `Average: Reliability is average. The client provides adequate resources and support to keep the project on track in terms of time, with generally punctual execution and minor challenges.` |
| `6` | `Generally meets commitments, although there are times when he/she does not.` | `Satisfactory: Reliability is satisfactory. The client offers adequate resources and consistent support to keep the project on track in terms of time, with punctual execution and few issues.` |
| `7` | `Is reliable and meets most established deadlines.` | `Moderately High: Reliability is moderately high. The client provides solid resources and consistent support to keep the project on track in terms of time, with punctual execution and few delays.` |
| `8` | `Consistently fulfills commitments and is considered reliable by the team.` | `High: Reliability is high. The client offers significant resources and solid support to keep the project on track in terms of time, with punctual execution and few, if any, delays.` |
| `9` | `Always meets deadlines and is considered highly reliable.` | `Very High: Reliability is very high. The client provides abundant resources and exceptional support to keep the project on track in terms of time, with extremely punctual execution and rarely occurring delays.` |
| `10` | `Not only fulfills commitments but exceeds expectations, being an example of reliability.` | `Outstanding: Reliability is outstanding. The client offers exceptional resources and extraordinary support to keep the project on track in terms of time, with impeccably punctual execution and virtually no delays.` |

## 6. Intimacy

Peso en la formula: `2x`

| Points | Talent / internal meaning | Client meaning |
| --- | --- | --- |
| `1` | `Does not demonstrate the ability to understand or connect with the client.` | `Not observed in Airtable records.` |
| `2` | `Minimum understanding and superficial connection with the client.` | `Not observed in Airtable records.` |
| `3` | `Basic understanding and limited emotional connection.` | `Low: Intimacy is low. The client shows some openness and communication, but it is insufficient to establish an effective and meaningful relationship with our team.` |
| `4` | `Moderate understanding and occasional empathetic connection.` | `Below Average: Intimacy is below average. Although the client provides some openness and communication, it is not consistent or deep enough to significantly improve the relationship with our team.` |
| `5` | `Clear understanding and regular empathetic, trustworthy relationship.` | `Average: Intimacy is average. The client offers a moderate level of openness and communication, modestly contributing to the creation of an effective relationship with our team.` |
| `6` | `Solid understanding and frequent close, trusting relationship.` | `Satisfactory: Intimacy is satisfactory. The client shows an acceptable level of openness and communication, helping to establish an effective and collaborative relationship with our team.` |
| `7` | `Good understanding and consistent close, empathetic connection.` | `Moderately High: Intimacy is moderately high. The client offers a notable level of openness and communication, greatly contributing to the creation of a solid and productive relationship with our team.` |
| `8` | `Deep understanding and frequent empathetic, trustworthy relationship.` | `High: Intimacy is high. The client shows great openness and communication, facilitating the creation of a very effective and trustful relationship with our team.` |
| `9` | `Exceptional understanding and deep, empathetic trust-based relationships.` | `Very High: Intimacy is very high. The client provides an exceptional level of openness and communication, resulting in a deeply connected and collaborative relationship with our team.` |
| `10` | `Outstanding understanding and authentic, lasting emotional connection.` | `Outstanding: Intimacy is outstanding. The client goes above and beyond by demonstrating exceptional openness and communication, establishing an exceptionally strong and trustful relationship with our team.` |

## 7. Group Thinking

Peso en la formula: `2x`

| Points | Talent / internal meaning | Client meaning |
| --- | --- | --- |
| `1` | `Does not collaborate at all and acts solely in self-interest.` | `Not observed in Airtable records.` |
| `2` | `Rarely collaborates, prioritizing personal interests.` | `Not observed in Airtable records.` |
| `3` | `Shows little willingness to collaborate and acts in an individualistic manner.` | `Low: Group thinking is low. The client shows some openness to collaborate and receive value propositions, but in a limited manner. They participate minimally in discussions to enhance the project's success.` |
| `4` | `Sometimes collaborates, but prioritizes personal interests over the team's.` | `Below Average: Group thinking is below average. Although the client shows some openness to collaborate and receive value propositions, as well as occasional participation in discussions, it is not sufficient to significantly drive the project's success.` |
| `5` | `Has a moderately collaborative attitude, although does not always prioritize the common good.` | `Average: Group thinking is average. The client demonstrates moderate openness to collaborate and receive value propositions, and occasionally participates in discussions to enhance the project's success, albeit inconsistently.` |
| `6` | `Generally collaborates, though in some situations individual interests are evident.` | `Satisfactory: Group thinking is satisfactory. The client displays acceptable openness to collaborate and receive value propositions, and regularly participates in discussions to enhance the project's success, contributing positively.` |
| `7` | `Actively collaborates in most decisions and tends to prioritize team interests.` | `Moderately High: Group thinking is moderately high. The client exhibits good openness to collaborate and receive value propositions, and actively engages in discussions to enhance the project's success, greatly benefiting its realization.` |
| `8` | `Is collaborative and prioritizes the group's well-being over personal interests.` | `High: Group thinking is high. The client shows strong openness to collaborate and receive value propositions, and enthusiastically participates in discussions to enhance the project's success, significantly driving its progress.` |
| `9` | `Always collaborates effectively and advocates for group thinking, prioritizing collective well-being.` | `Very High: Group thinking is very high. The client demonstrates exceptional openness to collaborate and receive value propositions, and actively and proactively engages in discussions to enhance the project's success, acting as a catalyst for advancement.` |
| `10` | `Is an exemplary collaborator, consistently prioritizing team interests and working for the common good.` | `Outstanding: Group thinking is outstanding. The client displays exceptionally high openness to collaborate and receive value propositions, and participates exceptionally in discussions to enhance the project's success, leading and motivating the team towards excellence.` |

## 8. Credibility

Peso en la formula: `1x`

| Points | Talent / internal meaning | Client meaning |
| --- | --- | --- |
| `1` | `Shows a lack of knowledge and competence; contributions are erroneous.` | `Not observed in Airtable records.` |
| `2` | `Has deficiencies in the necessary knowledge, affecting performance.` | `Not observed in Airtable records.` |
| `3` | `Presents shortcomings in knowledge, generating doubts about capability.` | `Low: Credibility is low. The client provides some details about their goals and specific needs for the project's success, which does not allow for reasonable planning and execution.` |
| `4` | `Possesses some knowledge, but competence is limited and requires supervision.` | `Below Average: Credibility is unacceptable. The client does not provide clear and precise details about their goals and specific needs for the project's success.` |
| `5` | `Has basic knowledge, but is inconsistent in its application.` | `Average: Credibility is acceptable. The client provides an average amount of details about their goals and specific needs for the project's success, enabling precise and focused planning and execution.` |
| `6` | `Possesses acceptable competence, though does not fully master the role.` | `Satisfactory: Credibility is very good. The client provides an exceptional amount of details about their goals and specific needs for the project's success, facilitating highly effective and seamless planning and execution.` |
| `7` | `Demonstrates a good level of knowledge and competence, being reliable in most situations.` | `Moderately High: Credibility is excellent. The client offers a deep and comprehensive understanding of their goals and specific needs for the project's success, enabling exceptional planning and execution with absolute clarity.` |
| `8` | `Has a high level of competence, is reliable, and consistently adds value.` | `High: Credibility is high. The client provides detailed and exhaustive documentation of their goals and specific needs for the project's success, demonstrating an exceptional level of commitment and clarity in communication.` |
| `9` | `Is very competent, with respected contributions and rarely questioned judgment.` | `Very High: Credibility is very high. The client goes above and beyond by providing extremely detailed and precise information about their goals and specific needs for the project's success, demonstrating an extraordinary level of trust and transparency in the working relationship.` |
| `10` | `Is exceptional in knowledge and competence, a reference within the team whose decisions are valued.` | `Exceptional: Credibility is exceptionally high. The client sets an exceptional standard by providing impeccable and comprehensive understanding of their goals and specific needs for the project's success, evidencing unwavering commitment and exceptionally clear and precise communication.` |

## 9. Lectura practica del modelo

El modelo de Monthly TW combina 4 pilares:

- `Reliability`: cumplimiento y consistencia
- `Intimacy`: cercania, empatia y nivel de relacion
- `Group Thinking`: colaboracion y prioridad del bien comun
- `Credibility`: conocimiento, competencia y claridad

Pero no los pondera igual:

- `Intimacy` y `Group Thinking` pesan el doble
- `Reliability` y `Credibility` pesan normal

Eso significa que una caida en `Intimacy` o `Group Thinking` mueve mas el resultado final que una caida equivalente en `Reliability` o `Credibility`.

## 10. Observaciones importantes

- Las variantes de `Meaning` cambian segun el tipo de pregunta activa. En la practica hay dos familias de texto:
  - una familia para evaluar talento / contexto interno
  - una familia para evaluar cliente / contexto externo
- En los registros reales, la variante de cliente solo aparecio con puntajes `3` a `10`.
- No se observaron significados de cliente para `1` ni `2`. Eso no prueba que sean imposibles; solo significa que no aparecieron en los datos consultados.
- `Trustworthiness Meaning` parece usar buckets por rango del score final, no por combinacion textual de pilares.

