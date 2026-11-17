# Reporte de puerta: Fase 4a

```
FASE: 4a — Primer uso, perfil, filtros y publicar
RAMA / PR: feat/ux-first-use — https://github.com/Daxlejo/SmartSwap-AI/pull/23 (sin fusionar)
COMMITS: commits atómicos, listados con git log --oneline main..feat/ux-first-use
```

## Checks
| Comando | Resultado |
|---|---|
| `npm run typecheck` | api y mobile en verde |
| `npm run test:api` | 21 suites, 193 tests en verde (183 antes de la revisión de PR, 162 al cerrar la Fase 3) |
| `npm run test:mobile` | 23 archivos, 231 tests en verde (208 al cerrar la Fase 3) |
| `npm run test:e2e` | 6 suites, 34 tests en verde |
| `npm run openapi:check` | "OpenAPI contract is up to date." (incluye `minPrice`/`maxPrice` y los límites 60/500) |
| `npm run graphify` | `CODE_MAP.md` y `CODE_GRAPH.json` regenerados y commiteados |
| `npm --workspace=mobile run lint` | 1 advertencia de `react-refresh` en `PublishScreen.tsx`, la misma que hay en `main`; dejarlo en verde es tarea de la 4b |

## Precio estimado: origen y los tres casos
**De dónde salía el número.** Había dos fallas juntas:
1. El móvil mandaba la condición como etiqueta ("Excelente estado") a `/ai/estimate-value`, que espera `LIKE_NEW | EXCELLENT | GOOD | FOR_PARTS`. La API respondía 400 y el `catch` vacío lo ocultaba.
2. Por eso el precio salía siempre de `/items/analyze-photo`, cuyo prompt pide catalogar la foto y de paso un valor, sin pedir el precio de mercado en Colombia. Sin clave, unos arquetipos fijos tasaban todo lo que dijera "ps5" como una consola (1.080.000 × factor de estado).

**Ahora** (`api/src/modules/ai/services/ai-price.service.ts`, `price-bounds.ts`):
- El prompt lleva título, descripción, categoría, estado y "precio de mercado en Colombia, en COP", y aclara que un accesorio no vale lo que el equipo completo.
- La salida se valida con Zod. El rango debe ser coherente (mín ≤ estimado ≤ máx), con máx ≤ 2 × mín y dentro de los límites de su categoría (por ejemplo, Videojuegos de 20.000 a 5.000.000).
- Si algo falla (sin IA, respuesta inválida, baja confianza o fuera de rango), responde `available: false` y la app no muestra sugerencia: dice "No pudimos estimar un precio confiable".
- En Publicar se muestra como "Precio estimado (COP)", editable, con el rango y la razón. El análisis de foto ya no pone precio, y una estimación automática no reemplaza un precio que el usuario ya escribió.

**Casos con OpenAI real** (`npm --workspace=api run price:cases`, 16 de noviembre):

| Caso | Rango | Estimado | Razón del modelo |
|---|---|---|---|
| Control PS5 nuevo | $ 300.000 a $ 400.000 | $ 350.000 | "El control DualSense para PS5 nuevo y sellado tiene un precio de mercado que varía entre 300,000 y 400,000 COP." |
| Bicicleta rodado 29 usada | $ 600.000 a $ 1.000.000 | $ 800.000 | "El precio estimado se basa en el estado de la bicicleta y su categoría en el mercado colombiano." |
| iPhone 12 usado | $ 1.000.000 a $ 1.400.000 | $ 1.200.000 | "El iPhone 12 en buen estado y con batería al 84% tiene un valor de mercado que se ajusta a este rango en Colombia." |

## Revisión de PR (`/pr-review-toolkit:review-pr`)
Corrieron cuatro revisores: código, fallas silenciosas, cobertura de tests y diseño de tipos.

| Hallazgo | Revisor | Resolución |
|---|---|---|
| Mientras cargaban los artículos (o si fallaban), un usuario con artículos veía "Publica tu primer objeto" | código | El modo primer objeto se decide solo con los artículos cargados (`9d82b00`) |
| Sin `OPENAI_API_KEY` las estimaciones fallaban sin dejar rastro en los logs | fallas silenciosas | Advertencia una vez por proceso (`77b9437`) |
| Un rechazo del modelo (`estimatedValue: null`) se registraba como respuesta rota | fallas silenciosas | Razón propia `low_confidence`, registrada en debug (`77b9437`) |
| Un 4xx de la estimación (bug de contrato) se veía igual que "sin sugerencia" | fallas silenciosas | Se registra en consola en dev y ante cualquier 4xx (`074b087`) |
| Si la foto se subía y el perfil fallaba, el mensaje hacía pensar que la foto se perdió | fallas silenciosas | "Tu foto quedó guardada, pero no pudimos guardar el nombre o la ubicación" (`b1c2083`) |
| `toAiCondition` adivinaba `'GOOD'` ante una etiqueta desconocida | tipos | Uniones cerradas, sin respaldo: una etiqueta nueva sin mapear no compila (`074b087`) |
| La estimación automática podía pisar un precio que el usuario estaba escribiendo | código (bajo el umbral) | Solo "Estimar con IA" reemplaza un precio escrito (`074b087`) |
| `?maxPrice=` vacío se convertía en 0 y vaciaba la lista | tests | Vacío significa sin límite, con test (`f7c9222`) |
| `chatJsonOrNull` y el respaldo de `chatJson` no tenían pruebas | tests | Spec con `fetch` simulado: clave de relleno, HTTP 500, contenido vacío, no-JSON, abortado, arreglo (`5823eba`) |
| La redirección tras registrarse a `/welcome` o `/home` no tenía prueba | tests | `postRegisterRoute` con test (`4e4ca27`) |

**No se aplicaron** porque no traen un riesgo real para la demo:
- Marcar con un tipo de marca el rango ya validado (`CheckedPriceRange`): hay un solo llamador.
- Agrupar `minPrice`/`maxPrice` de los filtros en un objeto: la regla mín ≤ máx ya se valida en la hoja (desactiva Aplicar) y en la API.
- Exponer la razón de `available: false` en la app: hoy todos los casos se muestran igual ("sin sugerencia").
- Mover el recorte a 60/500 a un util con test: el `maxLength` del input y el DTO de la API ya lo garantizan.

## `audit:ui` (360 × 800)
| | texto<14 | táctil<44 | elipsis | contraste | scroll | barras | tapado | desborde | errores |
|---|---|---|---|---|---|---|---|---|---|
| 100 % y 130 %, claro y oscuro | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

- **Corridas:** 120 (30 pantallas × 2 temas × 2 tamaños de fuente).
- **Pantallas nuevas:** `register-error`, `publish-error`, `publish-price`, `profile-edit`, `explore-filters`, `explore-chips`, `onboarding`, `onboarding-ring` y `onboarding-photo`.
- **Hojas inferiores:** `profile-edit` y `explore-filters` son hojas abiertas (`modal: true`). En ellas el scroll se mide dentro de la hoja, porque la página de atrás queda bloqueada a propósito.
- **Probando las pantallas nuevas salieron tres fallas, ya corregidas:**
  - El botón cerrar de las hojas medía 32 × 40 px (`abf13a9`).
  - El buscador de Explorar se apretaba al 130 % (`36754b0`).
  - La introducción mandaba al login mientras se restauraba la sesión (`4b065b4`).
- **Después de la corrida completa:**
  - Hubo cambios de lógica de la revisión de PR, que no cambian el layout.
  - Se movió la insignia del lápiz (`358ad24`). `profile`, `profile-edit`, `home` y `home-empty` se volvieron a auditar en 0.
- **Tabla completa:** `evidencia/fase-4a/audit-ui.md`.

## Evidencia por punto
Cada hoja muestra claro, oscuro y 130 %; las capturas sueltas están en la misma carpeta.

| Punto | Captura |
|---|---|
| 1. Errores visibles (Crear cuenta y Publicar) | `evidencia/fase-4a/1-errores.jpg` |
| 2a. Introducción (qué es, anillo de ejemplo, foto opcional) | `evidencia/fase-4a/2a-introduccion.jpg` |
| 2b. Inicio sin artículos | `evidencia/fase-4a/2b-inicio-sin-articulos.jpg` (antes: `antes-home-empty-light.jpg`) |
| 3. Perfil con iniciales, lápiz y Editar perfil | `evidencia/fase-4a/3-perfil.jpg` |
| 4. Explorar: botón Filtros, hoja y chips | `evidencia/fase-4a/4-filtros.jpg` |
| 5. Publicar: precio estimado, contadores 0/60 y 0/500 | `evidencia/fase-4a/5-publicar.jpg` |
| 6. Anillo con iniciales de colores e íconos por artículo | `evidencia/fase-4a/6-anillo.jpg` |

## APK debug
`mobile/android/app/build/outputs/apk/debug/app-debug.apk`: 14,3 MB, apunta a `https://smartswap-api.onrender.com/api/v1`.

**Ojo:** Render despliega `main`, así que hasta fusionar este PR la API en línea no tiene el contrato nuevo de `/ai/estimate-value` ni `minPrice`/`maxPrice`. Con este APK, "Estimar con IA" va a decir "No pudimos estimar un precio confiable" (es el caso seguro). Todo lo demás de la fase vive en la app y se puede probar ya. El precio real se prueba en el celular después de fusionar y de que Render despliegue.

## Criterios de salida
- [x] Capturas de cada punto
- [x] Los 3 casos de precio con su resultado
- [x] `audit:ui` en 0 (100 % y 130 %, los dos temas)
- [x] Suites en verde
- [x] Revisión de PR, con cada hallazgo corregido o justificado
- [ ] Prueba en el celular (David)

## Desvíos
- **Alcance en el plan:** el alcance de la 4a ya estaba en `ORQUESTACION.md` (commit `c819bee`), así que no hubo que agregarlo. No se cambió el estado de ninguna fase.
- **Introducción en 4 pasos:** "Qué es SmartSwap" y "Publica lo que no usas" van juntos en el primer paso, para que con la foto queden 4 pasos y no 5.
- **"Buscar canje" sin artículos:** sigue activo como botón secundario. Lleva a Nuevo canje, que ya explica que hace falta un artículo.
- **Filtros:** Explorar filtra en el teléfono la lista que ya cargó la API para la zona elegida, así el "Aplicar (X resultados)" es instantáneo. Al cambiar de zona en la hoja, se pide esa zona a la API para que el conteo sea real. `minPrice` y `maxPrice` quedan disponibles en la API.
- **Íconos del anillo:** el ícono sale primero del nombre del artículo (bicicleta, mochila, cafetera…) y si no, de la categoría. Deportes pasó de balón a una persona corriendo y Hogar de sofá a casa. Si en el celular no aparece la foto de los artículos del seed, conviene revisar que las fotos estén subidas a Supabase: el anillo ya usa `imageUrl` cuando existe.
- **"Sugerencias populares" de Publicar:** pasó a llamarse "Ideas para empezar", porque no se calcula ninguna popularidad. Las ideas de la IA se ofrecen como chips aparte y no se agregan solas.

## Pruebas en el celular (David)
| Prueba | Resultado | Evidencia |
|---|---|---|
| Crear cuenta con un correo ya registrado: el aviso aparece donde estás, con el error bajo el correo | | |
| Iniciar sesión con contraseña mala: aviso y error bajo los campos | | |
| Publicar sin foto y con campos vacíos: aviso arriba y errores por campo; contador 60/500 | | |
| Crear cuenta nueva: introducción de 4 pasos, "Saltar", anillo de ejemplo y foto con "Ahora no"; no vuelve a aparecer | | |
| Inicio de cuenta nueva: "Publica tu primer objeto" y "Buscar canje" secundario | | |
| Perfil: lápiz → foto (cámara y galería), nombre y municipio; selector Español / English | | |
| Explorar: Filtros, cambiar zona, precio mín/máx, Aplicar (X), quitar chips | | |
| Anillo: iniciales de colores (o foto) y fotos o íconos correctos de los artículos | | |
| Después de fusionar y desplegar en Render: "Estimar con IA" para un control de PS5 | | |

## Pendientes
- Pruebas en el celular (tabla de arriba).
- Precio estimado en el celular: necesita el PR fusionado y Render desplegado.
- Lint del mobile en verde (Fase 4b).
