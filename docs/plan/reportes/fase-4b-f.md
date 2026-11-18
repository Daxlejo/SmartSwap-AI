# Reporte de puerta: Fase 4b-F (recortada)

```
FASE: 4b-F — Bugs del celular, lint, término único, teclado (recortada: sin flow-runner, i18n-audit, visual-snapshot ni skeletons)
RAMA / PR: feat/ui-polish — PR_URL (sin fusionar)
COMMITS: 21 commits atómicos, listados con git log --oneline origin/main..feat/ui-polish
```

**Base de la rama.** `feat/ui-polish` sale de `main` en 9aec67c (PR #23 y #24 ya fusionados). No toca `mobile/android/` ni `capacitor.config.*` (son de la 4b-N).

## Checks
| Comando | Resultado |
|---|---|
| `npm run typecheck` | api y mobile en verde |
| `npm --workspace=mobile run lint` | 0 errores, 0 advertencias (la advertencia heredada de `PublishScreen.tsx` quedó resuelta) |
| `npm run test:api` | 218 tests en verde (214 al cerrar la 4c) |
| `npm run test:mobile` | 258 tests en verde (248 al cerrar la 4c) |
| `npm run test:e2e` | 40 tests en verde |
| `npm run e2e:flow` | 10/10 flujos en verde. Sin el arreglo del bug 1, "direct proposal from the item detail" y "no ring: propose direct" fallan (lo comprobé revirtiendo el arreglo de forma temporal) |
| `npm run openapi:check` | "OpenAPI contract is up to date." (nuevo: 409 de `POST /items`) |
| `npm run audit:ui` | Canjes (`trades`, `trades-sent`, `trades-in-progress`, `trades-empty`) × claro/oscuro × 100/130 % = 16 corridas en 0. La corrida completa de todas las pantallas se detuvo por falta de memoria en la máquina y queda pendiente |
| `npm run graphify` | `CODE_GRAPH.json` regenerado y en un commit |

## Bugs de la prueba en el celular
**1. Canje directo roto (dos causas).**
- *Volvía al paso 1.* La API manda el dueño del artículo plano (`ownerId`, `ownerName`, `ownerRating`; `ItemMapper.toResponse`), pero el cliente solo armaba `item.owner` si llegaba un objeto `owner`, como en los fixtures del e2e. Sin dueño, `buildDirectPreviewRoute` devolvía `null` y la confirmación redirigía a `/swap/configure`. Ahora `normalizeItem` arma el dueño con los campos planos. Los fixtures de `audit:ui` y `e2e:flow` mandan el dueño como la API real, así que el e2e ya detecta este caso. Test de regresión en `configureSwap.test.tsx`.
- *"Propuesta cancelada" con "Enviada ahora".* La propuesta no se cancelaba: la API responde `PROPOSED` para una propuesta pendiente (`RouteMapper.mapRouteStatus`) y Enviadas solo trataba `ACTIVE` y `SUGGESTED` como pendientes. Todo lo demás caía en "Propuesta cancelada". `routePhase` (`utils/routeView.ts`) centraliza la lectura del estado para Canjes, la insignia de la barra inferior y Recibidas. En Recibidas, una propuesta vencida ahora cuenta como rechazada y no como pendiente. Tests en `routeView.test.ts`.
- *De punta a punta.* `e2e:flow` recorre Explorar → detalle → 3 pasos → Directo → Revisar propuesta → confirmar → enviada → Canjes → Enviadas. Comprueba que se hace un solo `POST /routes/direct` con los dos artículos y que la tarjeta dice "En revisión", nunca "Propuesta cancelada".

**2. Tarjeta de Canjes ilegible.** Las dos columnas lado a lado ("Ofreces" y "A cambio", `flex-1 min-w-0` con `break-words`) quedaban tan angostas a 360 px y 130 % que el navegador partía las palabras. La nueva `components/TradeCard.tsx` se usa en las tres pestañas:
- arriba, el avatar y el nombre completo, con la píldora de estado pequeña y en una línea debajo del nombre, y luego el código y la hora;
- en el medio, "Ofreces" y "Recibes" en dos filas, cada una con la foto y el nombre completo. El nombre solo se corta entre palabras (`break-normal`) y nunca lleva elipsis;
- abajo, "Ver detalles" como botón de ancho completo, junto con las acciones de cada pestaña (Aceptar y Rechazar, Cancelar propuesta, Completar canje).

En En curso, el anillo pasó a "Ver detalles" (la pantalla de la ruta). `audit:ui` en 0 en Canjes (Recibidas, Enviadas, En curso y vacío) en claro y oscuro, a 100 y 130 %. Se agregó la pantalla `trades-sent` al audit.

**3. Publicaciones repetidas.**
- **API:** `ItemsService.create` compara el título normalizado (`item-title.ts`: minúsculas, sin tildes ni espacios extra) con los artículos del usuario en `PENDING_SWAP` y responde 409 antes de subir fotos inline o generar embeddings. Tests en `items.service.spec.ts` e `item-title.spec.ts`. El 409 está documentado en Swagger y en `openapi.yaml`.
- **App:** `utils/itemTitle.ts`, con la misma normalización. Si hay un gemelo activo, debajo del nombre aparece "Ya publicaste un artículo con este nombre." y se puede continuar. Si el gemelo está en un canje en curso, avisa antes, no sube las fotos al publicar y muestra "Ya tienes este artículo en un canje en curso.". Un 409 de la API muestra ese mismo mensaje.
- **README:** está la regla de negocio y el límite conocido: se comparan títulos, no objetos físicos, y el chequeo no va en la misma transacción que la creación.

## Alcance recortado
- **Lint en verde:** `mergeUniqueWants` pasó a `utils/wantedItems.ts`.
- **Un solo término:** en español, "objeto" y "publicación" pasaron a "artículo"; en inglés, "listing" pasó a "item". Incluye la notificación de bienvenida de la API y los textos esperados por `smoke-demo`, `audit:ui` y `e2e-flow`. Los nombres en el código no cambiaron.
- **Zonas seguras y teclado:** las zonas seguras ya estaban cubiertas. Nuevo `hooks/useKeepFocusedFieldVisible.ts`: centra el campo enfocado 300 ms después de enfocarlo o de que la vista se achique, y no hace nada cuando el teclado se cierra.

## Revisión de PR (`/pr-review-toolkit:review-pr`, solo el revisor de código)
Primera pasada (alcance recortado):
1. `e2e-flow.mjs` seguía buscando "Eliminar mi publicación". **Corregido** (cded510).
2. El hook recentraba el campo cuando el teclado se cerraba. **Corregido** (2b5d358).

Segunda pasada (bugs del celular):

3. Con un gemelo en canje, la app subía las fotos a Storage antes de recibir el 409 y las dejaba huérfanas. **Corregido** (a6997d4): la app corta antes de subir, y el comentario de la API ahora lo explica (3bc7ac8).

Sin hallazgos abiertos.

## EVIDENCIA (`docs/plan/reportes/evidencia/fase-4b-f/`)
`canjes-{recibidas,enviadas,en-curso}-{light,dark}[-130].jpg`: las tres pestañas con la tarjeta nueva, en los dos temas y a 100 y 130 %.

## PENDIENTES
- `audit:ui` completo (todas las pantallas) no se pudo correr: la máquina se quedó sin memoria. Hay que correrlo antes de la Fase 7.
- No verifiqué en un celular el hook del teclado ni la tarjeta nueva. Corresponde a la próxima prueba en el celular.
- Heredados de la 4a que no entraron en el recorte: el conteo del filtro de Explorar sobre todas las páginas y los 3 casos de precio desde el APK con `main` desplegado.
- Ya existía antes de esta fase: En curso ofrece "Completar canje" en rutas que aún no están confirmadas, y la API responde 409.
- Fuera de alcance por decisión del orquestador: `flow-runner`, `i18n-audit`, `visual-snapshot` y skeletons.
