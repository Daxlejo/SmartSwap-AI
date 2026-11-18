# Reporte de puerta: Fase 5b

```
FASE: 5b — Entrega del canje
RAMA / PR: feat/swap-handoff (worktree .claude/worktrees/swap-handoff, desde main 896fc3d) — https://github.com/Daxlejo/SmartSwap-AI/pull/28 (abierto, sin fusionar)
PARTES: 1, 2 y 3 completas.
```

## Commits (`git log --oneline main..HEAD`)

```
cd44d66 docs(docs): regenerar el grafo de código tras las correcciones
595816a fix(mobile): sondeo sin respuestas viejas y salida del canje en el chat
1d84739 fix(routes): cerrar los huecos del cierre del canje
39dbeff docs(docs): regenerar el mapa de código con la entrega del canje
1e31c82 feat(mobile): completar canje y reportar un problema desde el chat
156be29 feat(routes): cierre del canje al leer y reporte de problema
5899ac3 feat(mobile): pantalla del chat de entrega
61bc986 feat(routes): chat de entrega con fecha y lugar acordados
a07ae08 fix(mobile): quitar el bucle entre Tu ruta y Canjes
8d50ffa feat(mobile): pestaña En canje en Perfil e historial de intercambiados
7e37e4f fix(routes): no cancelar un canje cuya entrega ya confirmó alguien
6e9f152 feat(routes): reservar los artículos cuando todos aceptan el canje
```

Cada parte se subió al terminarla: Parte 1 (6e9f152 a a07ae08), Parte 2 (61bc986, 5899ac3), Parte 3 (156be29, 1e31c82), correcciones del revisor (1d84739, 595816a).

## Checks (después del último commit de código)

| Check | Resultado |
|---|---|
| `npm run typecheck` | exit 0 (mobile y api) |
| `npm run test:api` | 25 suites, **240/240** |
| `npm run test:e2e` (API, Prisma en memoria) | 8 suites, **52/52** |
| `npm run test:mobile` | 30 archivos, **290/290** |
| `npm run openapi:check` | "OpenAPI contract is up to date." (44 rutas) |
| `npm --workspace=mobile run lint` | 0 avisos |
| `npm run e2e:flow` (navegador, 360×800) | **13/13 flujos** |
| `npm run graphify` | CODE_MAP.md 89 líneas, 51 endpoints |

## Migraciones de Prisma (todas aditivas)

1. `20261117000000_add_reserved_item_status`: `ALTER TYPE "ItemStatus" ADD VALUE IF NOT EXISTS 'RESERVED'` (en su propio archivo, así el valor no se usa en la misma transacción).
2. `20261117010000_add_swap_handoff_chat`: columnas anulables `meetingAt`, `meetingPlace`, `meetingProposedById`, `meetingConfirmedAt` en `swap_routes`; `meetingConfirmed BOOLEAN NOT NULL DEFAULT false` en `swap_route_steps`; tabla nueva `swap_messages` (`body VARCHAR(500)`, FK con cascade, índice `routeId, createdAt`).
3. `20261117020000_add_swap_handoff_closing`: columnas anulables `problemReportedAt`, `problemReportedById`, `problemReason`, `completedAt`.

Ninguna borra ni cambia columnas existentes. Las dos últimas las generó `prisma migrate diff` desde el esquema anterior.

## Criterios

### Parte 1
- [x] Cuando todos aceptan, los artículos pasan a `RESERVED` **en la misma transacción** que confirma la ruta (antes de releerla).
- [x] Salen de Explorar (`GET /items` filtra AVAILABLE), de la búsqueda y de rutas nuevas (el motor los excluye); no se pueden ofrecer (409) ni borrar (409). Probado en `api/test/swap-handoff.e2e-spec.ts`.
- [x] Perfil: pestaña "En canje" con la etiqueta "Propuesta pendiente" o "En canje"; ya no aparecen en Activos. Historial muestra los intercambiados. El detalle de un artículo en canje no ofrece eliminarlo ni proponerlo.
- [x] Si el canje se cancela, los artículos vuelven a Activos. Lo puede cancelar cualquier participante de un canje confirmado mientras nadie entregó, o después de reportar un problema.
- [x] "Responder en Canjes" solo aparece si falta tu respuesta. Ya respondida: "Esperando respuestas" deshabilitado. Aceptada por todos: "Abrir chat de entrega".
- [x] Sin bucle: abierta desde Canjes, "Responder en Canjes" vuelve atrás en vez de apilar otra pantalla; desde una notificación abre Canjes → Recibidas. e2e "Your route and Swaps never form a loop": dos idas y vueltas, el historial crece en 1.

### Parte 2
- [x] Un hilo por canje, solo para sus participantes: los demás reciben 404 al leer, escribir o proponer fecha.
- [x] Solo texto, máximo 500 caracteres: Zod `.strict()` en la API, con 400 para vacío, más de 500 o campos extra. La app corta en 500 y muestra el contador.
- [x] Sin websockets: `useHandoff` consulta `GET /routes/:id/handoff` cada 5 s mientras el chat está abierto y la app visible. El e2e comprueba que llega un sondeo nuevo en 5,6 s.
- [x] Aviso fijo arriba con el texto pedido, sticky bajo la barra superior. El e2e comprueba que sigue visible después de hacer scroll.
- [x] "Fecha y lugar acordados": cualquiera propone y los demás confirman. Si alguien cambia la propuesta, todos vuelven a confirmar.
- [x] Al confirmarse empieza el periodo de entrega y se muestra "Se completa automáticamente el <fecha>" (fecha acordada + `SWAP_HANDOFF_DAYS`).

### Parte 3
- [x] Estado calculado al leer, sin cron: `RoutesService.settleDueHandoffs` corre en `GET /routes`, `GET /routes/:id` y `GET /routes/:id/handoff`, y antes de cada acción del chat y de cancelar. Toma el candado de la fila y vuelve a comprobar antes de cerrar.
- [x] Pasados los días desde la fecha acordada sin cancelación ni problema reportado, el canje pasa a Completado.
- [x] "Completar canje" (el botón que ya existía) lo cierra antes solo si todos confirman. Se quitó el atajo que dejaba al iniciador cerrarlo por todos, y se exige fecha acordada.
- [x] Al completarse: los artículos pasan a `SWAPPED` (Historial), cada participante suma 1 en `tradesCompleted`, se borran los mensajes y el canje queda con `completedAt`. Perfil lee los canjes antes que los artículos y el usuario, así el historial y el contador están al día.
- [x] "Reportar un problema" dentro del chat, con motivo opcional: quita el cierre automático y avisa a los demás.
- [x] `SWAP_HANDOFF_DAYS` (5 por defecto; validada en `env.validation.ts` y en `.env.example`). El test con `0` está en `swap-handoff.e2e-spec.ts › closing`, más `handoff.config.spec.ts`.

## Revisión de código (solo el revisor final, como se pidió)

`pr-review-toolkit:code-reviewer` sobre `origin/main...HEAD`. No hubo hallazgos críticos ni violaciones de CLAUDE.md. Los 5 hallazgos importantes están corregidos en 1d84739 y 595816a:

| # | Hallazgo | Resolución |
|---|---|---|
| 1 | Un canje podía quedar atascado con los artículos reservados para siempre (entrega confirmada sin fecha acordada, o problema reportado más cancelación bloqueada), y la app no tenía cómo cancelar un canje confirmado. | `completeRoute` exige `meetingConfirmedAt` (409). Cancelar se permite tras un problema reportado. El chat tiene "Cancelar canje" mientras nadie entregó o tras reportar un problema. "Completar canje" aparece solo con la fecha acordada, en el chat y en Canjes (la ruta expone `meetingConfirmedAt`). e2e nuevo. |
| 2 | Una acción tardía (reportar, nueva fecha, cancelar) podía reabrir un canje ya vencido. | Esas acciones cierran primero los canjes vencidos. e2e "closes a swap past its handoff period before any late action…". |
| 3 | Un mensaje enviado justo al completarse sobrevivía al borrado del chat. | `sendMessage` toma el candado de la ruta. |
| 4 | La fecha de cierre automático seguía visible en canjes completados o cancelados. | El mapper la informa solo si el estado es CONFIRMED, y la UI solo con el chat abierto. Lo verifica un e2e. |
| 5 | Un sondeo lento podía pisar el resultado de una acción. | `useHandoff` numera cada sondeo y cada acción, y solo aplica el resultado más reciente. |

El revisor de seguridad automático señaló, después del primer commit, que se podía cancelar un canje con la entrega ya confirmada. Se corrigió en 7e37e4f y se afinó en el hallazgo 1.

## Audit UI y evidencia
- `audit:ui` no se corrió: el prompt pidió solo el revisor de código al final.
- No hay capturas del celular. Los flujos están cubiertos por el e2e de navegador a 360×800 (13/13). Falta la prueba de David en el celular.

## Desvíos
- **La fase no está en el tablero de `ORQUESTACION.md`.** La 5b no figura y la regla de CLAUDE.md pide trabajar solo en fases ACTIVAS. Se ejecutó por el prompt directo del orquestador y no se cambió el estado de ninguna fase.
- **"Responder en Canjes"** se mantiene cuando falta tu respuesta (es la única forma de responder), pero ya no forma bucle.
- **Los artículos se bloquean desde la propuesta**, como antes (`PENDING_SWAP`), y pasan a `RESERVED` al aceptar todos. Perfil muestra ambos en "En canje" con etiquetas distintas.
- **La fecha de cierre** se cuenta desde la fecha acordada, no desde el momento en que todos confirman. Para la demo con `SWAP_HANDOFF_DAYS=0`, se acuerda una hora ya pasada de hoy (se aceptan fechas de hasta 24 h atrás).
- **Cancelar un canje confirmado no borra el chat**; solo completarlo lo borra, como dice el prompt.
- **`tradesCompleted`** se actualiza al leer canjes (Canjes, Inicio, Perfil y chat), no al pedir solo `/auth/me`.

## Pendientes
- Desplegar las 3 migraciones en Render/Supabase (`prisma migrate deploy`) y, si se quiere demo inmediata, definir `SWAP_HANDOFF_DAYS=0` en Render.
- Prueba en el celular: aceptar con 2 cuentas, ver "En canje" en Perfil, chatear, acordar la fecha, reportar un problema o completar, y ver Historial y "Canjes completados".
- `audit:ui` (claro/oscuro, 100 % y 130 %) de las pantallas nuevas.
- El chat guarda los últimos 200 mensajes y no tiene paginación.
