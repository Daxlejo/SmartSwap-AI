# Reporte de puerta: Fase 4c

```
FASE: 4c — Flujo de propuesta, navegación y pulido de la 4a
RAMA / PR: feat/proposal-flow — ver el PR de la rama (sin fusionar)
COMMITS: commits atómicos, listados con git log --oneline fa6cf77..feat/proposal-flow
```

**Base de la rama.** El PR #23 (4a) seguía abierto, así que `feat/proposal-flow` sale de `feat/ux-first-use` (fa6cf77) con `origin/main` unido (solo trae el commit del plan, de contenido idéntico). Cuando se fusione el #23, el PR de la 4c queda solo con lo suyo.

## Checks
| Comando | Resultado |
|---|---|
| `npm run typecheck` | api y mobile en verde |
| `npm run test:api` | 22 suites, 214 tests en verde (193 al cerrar la 4a) |
| `npm run test:mobile` | 24 archivos, 248 tests en verde (231 al cerrar la 4a) |
| `npm run test:e2e` | 7 suites, 40 tests en verde (nuevo: `direct-proposal.e2e-spec.ts`) |
| `npm run e2e:flow` (nuevo) | 10/10 flujos en navegador en verde (ver abajo) |
| `npm run openapi:check` | "OpenAPI contract is up to date." (`POST /routes/direct`, `wantedItemId`, `minSteps`, `excludeOwnerId`, 404/409 de la búsqueda) |
| `npm run audit:ui` | 39 pantallas × claro/oscuro × 100/130 % = 156 corridas, todas en 0, exit 0 |
| `npm run graphify` | `CODE_MAP.md` y `CODE_GRAPH.json` regenerados y commiteados (el mapa ya nombra el detalle, el flujo de 3 pasos, el anillo de ejemplo, el scroll y `e2e:flow`) |
| `npm --workspace=mobile run lint` | 1 advertencia heredada de `react-refresh` en `PublishScreen.tsx` (la misma de la 4a; dejarla en verde es tarea de la 4b-F) |

## Lo que se hizo, punto por punto
**3. Búsqueda sin saltos ni bucles (prioridad 1).**
- "Buscando" ya no navega sola. Con anillos muestra "Ver N rutas"; sin anillos, "No hay un anillo por ahora" con "Proponer canje directo" y "Volver"; si falla, reintentar y "Volver"; si el artículo ya no está disponible (la API responde 404/409/400), lo dice y no ofrece un directo imposible.
- Lo que sigue a "Buscando" (resultados o confirmación directa) la **reemplaza** en el historial: atrás desde resultados vuelve al paso 3 y nunca relanza la búsqueda. Además, la búsqueda se hace una sola vez por visita (en desarrollo, el doble montaje de React la lanzaba dos veces).
- "Propuesta enviada" reemplaza a "Confirmar", y su flecha y el botón atrás de Android van a Inicio (`isFlowEnd` en `layouts/navigation.ts`). El primer uso ya usaba `replace`.
- Test e2e del botón atrás: `scripts/e2e-flow.mjs` usa `history.back()`, lo mismo que corre el botón de Android en una pantalla secundaria.

**1. Proponer desde el detalle.** Nueva pantalla `/item/:itemId` ("Detalle del artículo"). Las tarjetas de Explorar son un solo botón que abre el detalle, sin "Proponer". Explorar y la búsqueda no muestran artículos propios: `excludeOwnerId` en `GET /items` y filtro también en el cliente. Un artículo propio abierto desde Perfil solo muestra "Eliminar mi publicación".

**2. Nuevo canje en 3 pasos.** Las elecciones viven en la URL (`?step=&have=&want=&fixed=&mode=`), así que atrás recorre los pasos sin perder nada.
- (1) Lo que ofreces: viene elegido si hay uno solo.
- (2) Lo que recibes: desde el detalle, fijo; desde Inicio, buscar o tocar un deseado.
- (3) Tipo: *Directo* o *Circular*.
- Fuera "RED INTELIGENTE SMARTSWAP" e "INTERCAMBIO INTELIGENTE".
- **API:**
  - `POST /routes/direct` crea un anillo de 2 personas sin exigir que el artículo esté en los deseos del dueño. Valida dueño (403), artículo propio (400), existencia (404) y reserva (409), y avisa al dueño con "Te proponen cambiar tu X por Y".
  - La búsqueda circular recibe `wantedItemId` y `minSteps: 3`: solo devuelve anillos de 3 o 4 que terminan en ese artículo (el caso del control de PS5 que entregaba una Switch). El artículo elegido entra al catálogo aunque esté fuera de la zona.

**7. Errores de Publicar.**
- El aviso de arriba dice el error en palabras ("Debes agregar al menos 1 artículo que aceptarías a cambio."); con varios, una lista de frases (`utils/formAlert.ts`).
- Se mantienen el scroll y el foco.
- Fuera la línea roja repetida en Fotos y en Acepto; el recuadro "Aún no agregas ninguno" quedó neutro.

**4. Scroll.**
- `layouts/ScrollManager.tsx` reemplaza a `ScrollRestoration`: cada pantalla abre arriba y Explorar vuelve a su posición. Al elegir una opción dentro de un paso no salta.
- En Explorar, tras bajar más de una pantalla, aparece "Volver arriba": flecha de 44 px abajo a la derecha, sobre la BottomNav, con `aria-label`.

**5. Inicio.** Se quitó la sección de artículos. La tarjeta "Busca un canje" ahora es "Nuevo canje", con el anillo de ejemplo y "Empezar un canje", que abre el flujo de 3 pasos. El estado vacío de rutas se mantiene.

**6. Anillo del primer uso.** Ver la sección siguiente.

**8. Ideas de la IA en Acepto.**
- "Ideas para empezar" era una lista fija (Cámara, iPad, Laptop…): se eliminó.
- Las ideas del análisis de foto solo se muestran si vienen de OpenAI (`source: 'openai'`). Las plantillas de respaldo del servidor (Tablet, Smartphone, Auriculares…) ya no se envían.
- El prompt ahora pide "3 artículos concretos que el dueño de ESTE artículo aceptaría a cambio".

## Anillo del primer uso: 2 variantes y la elegida
Se hicieron 2 variantes con `frontend-design` y se compararon en capturas (`evidencia/fase-4c/variantes-anillo/`):
- **A · Trazo:** línea fina que se dibuja arco por arco e insignias blancas con borde teal.
- **B · Entrega:** pista suave y ancha en la que cada artículo, en una insignia naranja mango, viaja por su arco desde quien lo da hasta quien lo recibe.

**Se eligió B.** Muestra literalmente que cada persona entrega su objeto a la siguiente, y el mango es el color de marca para el ciclo de canje.

Cómo quedó (`components/ExampleRing.tsx` y `utils/exampleRing.ts`, usado en el primer uso y en Inicio):
- **Composición:** un solo anillo, sin el círculo naranja exterior ni la píldora "Ejemplo". Tres personas a 120°, con iniciales en colores estables y distintos (`distinctAvatarColors`) y el nombre debajo; "Tú" no tapa el avatar.
- **Artículos y flechas:** íconos según el artículo (bicicleta, guitarra, cafetera). Flechas en un solo sentido al final de cada arco; los tests de geometría verifican que no chocan con las insignias ni con las personas.
- **Centro:** sin disco, una línea corta, "3 personas, 1 canje".
- **Animación:** los arcos se dibujan en orden, cada artículo viaja, aparecen los checks y el anillo se cierra en verde. Con `prefers-reduced-motion` se muestra directamente el anillo cerrado.
- **Respaldo:** si el WebView no soporta `offset-path`, la insignia aparece quieta a mitad del arco.
- **Pantalla:** título y texto visibles sin scroll al 100 %. Claro, oscuro y 130 % en 0 en `audit:ui`.
- **Video:** `evidencia/fase-4c/anillo-primer-uso-light.webm` y `-dark.webm`; captura con movimiento reducido en `anillo-primer-uso-movimiento-reducido.png`.

## e2e en navegador (`npm run e2e:flow`, 10/10)
Playwright a 360×800 sobre los fixtures de `audit:ui` (sin base de datos):
1. Explorar → detalle → 3 pasos → directo → enviada. Verifica 1 `POST /routes/direct` con los dos ids, que no se busca ningún anillo y que la flecha de "Propuesta enviada" va a Inicio.
2. Inicio → 3 pasos → circular. "Buscando" espera 5 s sin moverse; la búsqueda lleva `wantedItemId` y `minSteps: 3`; luego "Ver rutas". Atrás recorre resultados → paso 3 (con "Circular" aún elegido) → paso 2 → paso 1, con **una sola** búsqueda.
3. Un anillo encontrado se envía como anillo (`/routes/propose`), nunca como directo.
4. Sin anillos: "Proponer canje directo" reemplaza a "Buscando"; atrás vuelve al paso 3; al enviar, el directo lleva los dos artículos elegidos.
5. Sin anillos: "Volver" lleva al paso 3.
6. Artículo pedido ya reservado (409): lo dice y no ofrece directo.
7. Artículo ofrecido que ya no está: vuelve al paso 1 con aviso.
8. Artículo propio desde Perfil: solo "Eliminar mi publicación".
9. Scroll: el detalle abre arriba, Explorar vuelve a su posición y "Volver arriba" funciona.
10. Explorar pide `excludeOwnerId` y no muestra artículos propios.

## Revisión de PR (`/pr-review-toolkit:review-pr`)
Cuatro revisores: código, fallas silenciosas, cobertura de tests y comentarios/tipos. Cómo se resolvió cada hallazgo:

| Hallazgo | Resolución |
|---|---|
| (Código, importante) El artículo elegido podía quedar fuera del catálogo si estaba fuera de la zona, y salía "no hay anillos" | Corregido: entra al catálogo con `OR: [zona, {id}]` + test |
| (Fallas, alta) Un artículo pedido eliminado, propio o reservado se mostraba como "no hay anillos" | Corregido: la búsqueda responde 404/400/409 y "Buscando" muestra "Este artículo ya no está disponible", sin directo + tests unit/e2e |
| Buscando ignoraba si los dos artículos se pudieron cargar | Corregido: si falta alguno, mismo estado "no disponible" |
| Nuevo canje mostraba un error de red como "artículo eliminado" | Corregido: `ErrorState` con reintentar |
| Un artículo ofrecido reservado o eliminado dejaba "Siguiente" apagado sin explicación | Corregido: vuelve al paso 1 con aviso + e2e |
| Confirmar descartaba la propuesta directa si la sesión aún se restauraba | Corregido: espera la sesión |
| `catch` vacío en la vista previa de zona de Explorar | Corregido: registra el error (el botón sigue diciendo "Aplicar") |
| (Tests) Faltaba enviar el anillo circular y el directo desde el vacío | Agregados a `e2e:flow` |
| (Tests) No se probaba que el artículo recibido en un directo también queda reservado | Agregado al e2e de la API (409 para otro usuario, también al buscar anillos hacia él) |
| (Tipos) `useItem` devolvía un estado viejo al cambiar de id | Corregido: la respuesta se guarda con su id y el tipo es una unión discriminada |
| (Tipos) `SwapSearchState` duplicaba el estado de Resultados y no se leía | Eliminado: la búsqueda circular viaja solo en la URL (`buildCircularSearchPath`); Resultados usa la tolerancia común |
| (Comentarios) DTO directo ("Their wants"), aviso 1 a 1, `useItem` "missing" | Corregidos |
| `DirectProposalDraft` permite un artículo sin dueño | Justificado: la API siempre manda `owner`; sin dueño, Confirmar redirige al flujo. Se deja así |
| Texto de la notificación en español fijo en el servidor | Heredado (ya era así); fuera del alcance de la 4c |

## Hallazgos propios durante la fase
- `refreshItems` podía cargar el catálogo sin zona ni dueño, porque el efecto de la pantalla corría antes que el que actualiza `viewerRef`. Era un bug previo, que el e2e de `excludeOwnerId` destapó. Corregido pasando el usuario.
- Al 130 %, el campo de Acepto se apretaba (desborde del placeholder). Ahora el botón baja y el ejemplo es corto ("Ej. bicicleta").
- Las fotos de respaldo del flujo y de Explorar usaban solo el ícono de la categoría: la mochila salía como "correr". Ahora usan el nombre del artículo.
- `audit:ui` y `e2e:flow` comparten `scripts/ui-harness.mjs`.

## AUDIT UI
Tabla completa en `evidencia/fase-4c/audit-ui.md`. Totales (texto<14, táctil<44, elipsis, contraste, scroll, barras, tapado, desborde, errores):

| Tema | Texto | Todas las métricas | Revisar (axe incompleto, no cuenta) |
|---|---|---|---|
| claro | 100 % | 0 | 25 |
| oscuro | 100 % | 0 | 24 |
| claro | 130 % | 0 | 34 |
| oscuro | 130 % | 0 | 34 |

Pantallas nuevas en el audit: `item-detail`, `item-detail-own`, `configure-receive`, `configure-receive-list`, `configure-type`, `configure-type-ring`, `searching-empty`, `proposal-confirm-direct`, `publish-wants-error`. Después de corregir el ícono de las fotos de respaldo se repitieron Explorar y los 5 pasos de Nuevo canje en los 4 modos: siguen en 0.

## EVIDENCIA (`docs/plan/reportes/evidencia/fase-4c/`)
- **Antes | después**, en claro, oscuro, claro 130 % y oscuro 130 %:
  - `1-explorar-a-detalle-*`
  - `2-nuevo-canje-*`
  - `3-buscando-*`
  - `5-inicio-*`
  - `6-anillo-primer-uso-*`
  - `7-publicar-errores-*`
- **Solo después:** `despues-*`, con el propio, la búsqueda, el paso 3 circular, buscando, resultados, la confirmación directa y la propuesta enviada.
- **Anillo:** las 2 variantes, el video en claro y oscuro, y la captura con movimiento reducido.
- **Punto 4:** el scroll se demuestra con el e2e, no con una captura.
- **Punto 8:** se ve en `7-publicar-errores-*`, donde ya no aparece "Ideas para empezar".
- **Pendiente:** la prueba de David en el celular.

## CRITERIOS
- [x] Capturas antes y después de cada punto (claro, oscuro y 130 %); el 4 con e2e
- [x] e2e del flujo de 3 pasos (directo y circular) y del botón atrás (`e2e:flow` + `direct-proposal.e2e-spec.ts`)
- [x] Suites en verde (214 api, 248 mobile, 40 e2e, 10 flujos en navegador)
- [x] `openapi:check`
- [x] `audit:ui` en 0
- [x] Revisión de PR, con cada hallazgo corregido o justificado
- [x] Video corto del anillo del primer uso
- [ ] Prueba en el celular (David)

## DESVÍOS
- **Base de la rama:** `feat/ux-first-use` + `origin/main`, en vez de `main` con la 4a fusionada (el #23 seguía abierto y la 4c no fusiona).
- **Directo por defecto en el paso 3:** el texto explica cada opción. Circular busca solo anillos de 3 o 4, porque el 1 a 1 ya es el directo.
- **Paso 2 desde el detalle:** se muestra (fijo) para mantener los 3 pasos del plan. Cuesta un toque más.
- **Atrás de Android:** el e2e corre en navegador con `history.back()`, que es lo que hace el botón en una pantalla secundaria. La regla nueva de "Propuesta enviada → Inicio" tiene test unitario. En el celular falta la prueba manual.
- **Inicio:** se mantienen las tarjetas "Publicar" y "Mis canjes" debajo del anillo; el plan solo pedía quitar la sección de artículos.
- **`ffmpeg` de Playwright:** se instaló para grabar el video (solo en esta máquina, fuera del repo).

## PENDIENTES
- Prueba en el celular: el flujo completo, el botón atrás real de Android y la animación en el WebView.
- Lo heredado para la 4b-F sigue igual (lint en verde, conteo del filtro de Explorar, precio en el APK con `main` desplegado).
- Render despliega `main`: `/routes/direct`, `excludeOwnerId` y la búsqueda hacia un artículo solo llegan al celular después de fusionar el #23 y este PR.
