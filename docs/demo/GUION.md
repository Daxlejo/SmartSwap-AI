# Guion de la sustentación: SmartSwap AI

**Borrador.** Duración objetivo: **9 minutos** (mínimo 7, máximo 10). Sustentación: miércoles 18 de noviembre de 2026.
Lo marcado **[PENDIENTE F3]** depende del componente `SwapRing` (anillo de intercambio, Fase 3) y se ajusta cuando esa fase se apruebe.

**Quién habla:** **D** = David. **B** y **C** = [completar con los nombres de los compañeros]. Quien no habla maneja el celular y la proyección.

## Antes de entrar (checklist)
- [ ] **Seed dentro de las 48 h previas.** La propuesta en curso `SW-4821` vence 48 h después de correr el seed. Correr `npm --workspace=api run db:seed` contra Supabase el martes 17 en la noche o el miércoles en la mañana. Correrlo también **después de cada ensayo**: el seed restaura SW-4821, libera los objetos bloqueados y borra las rutas que se crearon al ensayar.
- [ ] **Calentar Render 10 minutos antes:** `curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://<servicio>.onrender.com/api/v1/health` debe dar `200` en menos de 1 s. Repetirlo justo antes de empezar.
- [ ] APK release instalado. Celular con brillo al máximo, en modo No molestar, con 100 % de batería y el **hotspot propio** encendido y probado.
- [ ] Selector de cuentas demo visible (build con `VITE_DEMO_PASSWORD`) y sesión iniciada como **Alex**.
- [ ] Una mochila o un libro físico a la mano para fotografiarlo en vivo (F2).
- [ ] Video de respaldo en el portátil, abierto y pausado en 0:00. Diagramas de `docs/architecture/` abiertos en pestañas.
- [ ] Proyección del celular (scrcpy o cable) probada en el salón.

## Bloques cronometrados

| Tiempo | Bloque | Habla | Cuenta | Qué se muestra / qué se dice |
|---|---|---|---|---|
| 0:00 – 0:45 | 1. Problema | D | — | El trueque directo casi nunca coincide: yo quiero tu guitarra, pero tú no quieres mi bicicleta. SmartSwap busca **anillos de 2 a 4 personas** en Nariño, sin dinero, con valores en COP para que el cambio sea justo, y con una UI pensada para adultos mayores. |
| 0:45 – 2:00 | 2. Arquitectura en 4+1 | B | — | Vista de **contexto** (APK, API en Render, Supabase, OpenAI) y vista de **despliegue**. Una frase por vista: lógica (módulos Nest, motor `SwapGraphEngine`) y desarrollo (monorepo mobile/api con contrato OpenAPI). No leer las cajas: señalarlas. |
| 2:00 – 3:45 | 3. Flujo 1: buscar una ruta completa y proponer | C (D maneja) | **Alex** | Home → "Configurar intercambio" → ofrece **Audífonos Sony**, objetivo **"Tablet"** → pantalla de búsqueda → resultado: **ciclo de 3** Alex → Mateo → Camila. Abrir el detalle: explicación de la IA y valores (700.000 / 680.000 / 720.000 COP). **[PENDIENTE F3]** el anillo `full` en RouteDetail con 3 avatares y los arcos punteados. Tocar "Proponer" y mostrar ProposalSent. |
| 3:45 – 5:00 | 4. Consenso: se cierra el anillo | D | **Diego** (selector de cuentas) | Mostrar que hay una propuesta en curso, **SW-4821** (Mochila → Zapatillas → Parlante): Alex y Mateo ya aceptaron. Cambiar a Diego → Notificaciones → abrir SW-4821 → **Aceptar** → la ruta pasa a **CONFIRMADA**. **[PENDIENTE F3]** en Trades, pestaña "En curso", el último arco se vuelve sólido y aparece el halo. Explicar en una frase: todas las personas tienen que aceptar; si una rechaza, los objetos se liberan. Hay transacción y bloqueo de fila, así que dos aceptaciones simultáneas no se pisan. |
| 5:00 – 6:15 | 5. Flujo 2: publicar un objeto | B (C maneja) | **Camila** | Publicar → tomar la foto del objeto físico en vivo → la IA propone nombre, categoría y estado → valor sugerido en COP → publicar. Se ve en "Mis objetos". Recalcar que la foto se guarda en Supabase Storage y que la clave de OpenAI nunca está en el celular. |
| 6:15 – 7:15 | 6. Flujo 3: explorar y proponer | C | **Valeria** | Explorar → filtrar por municipio (Pasto) → elegir la **Bicicleta Trek** de Alex → proponer → aparece el **ciclo de 2** Valeria ↔ Alex (guitarra por bicicleta). **[PENDIENTE F3]** anillo `compact` con 2 avatares. |
| 7:15 – 8:30 | 7. Cómo funciona por dentro | D | — | Diagrama del algoritmo: los objetos son nodos y hay una arista cuando el dueño del siguiente objeto lo quiere. DFS de profundidad 4, cada persona una sola vez, tolerancia de valor del 45 % y un puntaje que premia los ciclos cortos. Tres decisiones: **Capacitor** en vez de React Native, **COP en enteros** y **ciclos de máximo 4**. Una frase honesta sobre la deuda: el E2E corre sobre un doble en memoria, hay vulnerabilidades que exigen `--force` y dependemos del plan free de Render. |
| 8:30 – 9:00 | 8. Cierre | B | — | Lo que se logró en una frase, y abrir preguntas. |
| 9:00 – 10:00 | Colchón | — | — | Margen para preguntas o para un plan B. |

**Si vamos atrasados al minuto 6:15:** saltar el bloque 6 (F3) y decir "Explorar llega al mismo motor que acabamos de ver". El bloque 7 no se recorta.

## Plan B

| Si pasa esto | Hacemos esto | Quién |
|---|---|---|
| Render tarda en responder (arranque en frío) | El aviso de servidor de la app lo explica. Mientras tanto, B adelanta el bloque 2 de arquitectura. Si en 45 s no responde: pasar al video. | B |
| No hay internet en el salón o el wifi está bloqueado | Pasar el celular al **hotspot propio** (ya probado). Si el plan de datos tampoco responde: video de respaldo. | quien maneja |
| OpenAI falla o tarda (F2) | La explicación de rutas tiene un texto determinista de respaldo. En F2, escribir el nombre a mano y seguir. Decirlo en voz alta: "la IA asiste, no bloquea". | B |
| La búsqueda no encuentra el ciclo (objetos bloqueados por un ensayo) | Es señal de que no se corrió el seed. Mostrar la propuesta SW-4821 si está viva; si no, video. Esto se previene con el checklist. | D |
| El celular o la proyección fallan | **Video de respaldo** (grabación de pantalla de los 3 flujos y del anillo cerrándose, Fase 7), narrado en vivo con el mismo guion. | D |
| Pregunta difícil sobre el algoritmo | Abrir `docs/architecture/07-algoritmo-ciclos.md`: tiene el pseudocódigo y la traza del caso de 3 personas. | D |

## Preguntas probables (respuestas de una línea)
- **¿Por qué máximo 4 personas?** Porque cada persona extra es otro punto de falla en el consenso y en la entrega, y además el DFS queda acotado ([ADR-0003](../architecture/adr/0003-ciclos-de-maximo-4.md)).
- **¿Qué pasa si dos personas aceptan al mismo tiempo?** La respuesta bloquea la fila de la ruta dentro de una transacción, así que las aceptaciones se procesan una tras otra ([secuencia](../architecture/06-secuencia-consenso.md)).
- **¿Por qué no React Native?** Ya teníamos la UI en React web, y Capacitor la empaqueta sin reescribirla ([ADR-0001](../architecture/adr/0001-capacitor-frente-a-react-native.md)).
- **¿Guardan la ubicación?** No. Solo el municipio DANE; las coordenadas GPS se descartan al resolverlo.
- **¿Qué no funciona todavía?** La sección "Deuda conocida" del [README](../../README.md#deuda-conocida).

## Ensayo cronometrado (criterio de salida de la Fase 6)
| Ensayo | Fecha | Duración real | Bloque que se pasó | Ajuste |
|---|---|---|---|---|
| 1 | [pendiente] | | | |
| 2 | [pendiente] | | | |
