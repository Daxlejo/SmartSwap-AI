# SmartSwap AI: plan de cierre en fases con puertas de aprobación

**Ventana:** lunes 2 a martes 17 de noviembre de 2026. **Entrega y sustentación: miércoles 18 de noviembre** (el profesor dividió el curso en dos grupos; el de David entrega el 18).
**Orquestador:** Claude, en el chat del Project "App Mobile". **Ejecutor:** Claude Code en el PC de David, con plugins y subagentes por fase.
**Meta:** un APK release firmado, instalado en un celular Android físico, sin datos falsos visibles, legible para adultos mayores y con el anillo de intercambio como elemento distintivo.

## Alcance acordado (2 de noviembre)
| Entra | No entra |
|---|---|
| Escala tipográfica nueva: ningún texto por debajo de 14 px, cuerpo en 16 px o más | Medidor de justicia |
| Áreas táctiles de al menos 44 px (48 px en acciones principales) | Cuenta regresiva de 48 h |
| Cero nombres truncados con elipsis | Toggle de texto grande (se compensa con la escala base y con el tamaño de fuente del sistema Android) |
| Componente **Anillo de intercambio** (`SwapRing`) | Upgrades mayores por `npm audit` (Nest 12, zod 4) y cualquier arreglo que exija `--force`: quedan como deuda documentada |
| Eliminar todos los mocks; seed real con estados vacíos bien diseñados | |
| Fusionar las 6 ramas apiladas a `main` (hecho); desde ahí, una rama y un PR por fase | |

## Regla de las puertas
1. Hay como máximo **dos fases ACTIVAS** a la vez, y solo si no tocan los mismos archivos. Cada fase activa corre en su propio worktree y en su propia sesión de Claude Code.
2. Al cerrar una fase, el ejecutor genera el **Reporte de puerta** (plantilla al final) con evidencia real: salidas de comandos y capturas. Un "ya quedó" no cuenta como evidencia.
3. El orquestador responde **APROBADA** (y entrega el prompt de la siguiente fase) o **RECHAZADA** (con la lista exacta de lo que falta). Cuando el único pendiente es la prueba de David en el celular, la puerta se da por aprobada si esa prueba pasa.
4. Antes de generar el reporte de una fase de código (1 a 4b), el ejecutor corre la revisión de PR (`/pr-review-toolkit:review-pr`) y corrige o justifica cada hallazgo.
5. El PR de la fase se fusiona a `main` solo después de la aprobación.
6. Regla en `CLAUDE.md`: *"Trabaja solo en la fase que indica tu prompt, y solo si está marcada ACTIVA en docs/plan/ORQUESTACION.md. Al cumplir los criterios de salida, detente y genera el Reporte de puerta. No cambies el estado de ninguna fase."* Y: *"Antes de leer código, consulta docs/graph/CODE_MAP.md; abre solo los archivos relevantes. Al cerrar cada fase corre npm run graphify."*
7. **Ahorro de tokens:** `/clear` entre fases; `audit:ui` y la revisión de PR una sola vez, al final de cada fase; un modelo más liviano (`/model`) para tareas mecánicas.

## Tablero (actualizado el 16 de noviembre)
| Fase | Fechas | Rama | Estado |
|---|---|---|---|
| 0. Línea base, integración y APK de humo | lun 2 – jue 12 | `chore/fase-0-*` | Aprobada |
| 1. Datos reales y estados vacíos | mié 11 – jue 12 | `feat/real-data` | Aprobada |
| 2. Legibilidad, densidad y tema oscuro | jue 12 | `feat/ui-type-scale` | Aprobada |
| 6. Arquitectura 4+1 y guion de demo | jue 12 (en paralelo) | `docs/architecture` | Aprobada |
| 3. Bloque 0 (correcciones del celular) y anillo de intercambio | vie 13 – dom 15 | `feat/swap-ring` | Aprobada (PR #22 fusionado) |
| 4a. Primer uso, perfil, filtros, publicar e identidad en el anillo | dom 15 – lun 16 | `feat/ux-first-use` | Aprobada; lo que encontró la prueba en el celular pasa a la 4c (PR #23 se fusiona) |
| 4c. Flujo de propuesta, navegación y pulido de la 4a | lun 16 – mar 17 | `feat/proposal-flow` | Aprobada si pasa la prueba en el celular (PR #24; se fusiona después del #23) |
| 4b-N. Nativo Android (en paralelo con la 4c) | lun 16 – mar 17 | `feat/android-native` | **ACTIVA** (falta fusionar `main`, recompilar y tomar capturas) |
| 4b-F. Bugs del celular, lint y término único | mar 17 | `feat/ui-polish` | Aprobada si pasa la prueba en el celular (PR #26). Recortada: sin flow-runner, i18n-audit, visual-snapshot ni skeletons |
| 5. APK release firmado | mar 17 (noche) | `chore/release-apk` | **ACTIVA** (después de fusionar 4b-N y 4b-F) |
| 7. Congelación, seed, tag v1.0.0 y ensayos | mar 17 (noche) – mié 18 (mañana) | `main` | Bloqueada (sin visual-regression: no hay línea base) |

## Plugins por fase
Activar solo los de la fase en curso (`/plugin`). Los plugins son del usuario: lo que se activa aplica a todas las terminales.

| Fase | Activos |
|---|---|
| 3 | frontend-design, design, playwright, pr-review-toolkit |
| 4a | design (`ux-copy`), frontend-design, playwright, pr-review-toolkit |
| 4c | frontend-design, design, playwright, pr-review-toolkit |
| 4b-N | ninguno especial |
| 4b-F | Snagly (`flow-runner`, `i18n-audit`, `visual-snapshot`), playwright, pr-review-toolkit |
| 5 | ninguno especial (`gh` para tag y Release) |
| 7 | Snagly (`visual-regression`), playwright |

---

## Fases aprobadas (resumen)
- **0:** suites en verde (157 api, 89 mobile, 34 e2e); 6 ramas integradas; geolocalización registrada en Android; Render desplegando `main` (2f4ea75, sin migraciones pendientes, `/health` 200; el servicio no se durmió en 21 min, así que el arranque en frío queda "no observado" y se mitiga con el ping de la 4b); APK debug probado en un Android físico; `gradle.properties` sin la ruta de Java de otra máquina (JAVA_HOME de usuario en Temurin 21).
- **1:** sin mocks fuera de tests; seed idempotente con 6 cuentas de Nariño y ciclos reales de 2, 3 y 4; estados vacíos; búsqueda bloqueada sin artículos publicados; `npm run smoke:demo`.
- **2:** tokens de tipografía y táctiles; scroll corregido de raíz; modo oscuro con tokens propios; fuera las promesas falsas (custodia, verificado, Modo Seguro, ticker, CO₂, calificación y nivel por defecto); `audit:ui` en 0.
- **3:** Bloque 0 (cámara/galería, geolocalización con mensajes específicos, pestañas sin barra superior, botón atrás de Android, 130 % sin pisarse) y `SwapRing` de 2 a 4 participantes integrado en Home, RouteDetail, ProposalConfirm, ProposalSent y "En curso" de Canjes. PR #22 fusionado a `main` con merge commit.
- **4a (condicional):** PR #23, 35 commits. Suites en verde (193 api, 231 mobile, 34 e2e), `openapi:check` al día, `audit:ui` en 0 (100 % y 130 %, los dos temas). Precio estimado corregido de raíz: el estado se mandaba en un formato que la API rechazaba y el error se ocultaba, así que salían valores fijos. Ahora el prompt va con contexto y COP, el JSON se valida (máximo ≤ 2 × mínimo y límites por categoría) y, si falla, no hay sugerencia. Control PS5 nuevo: $300.000–$400.000. Revisión de PR con 4 revisores y 10 hallazgos corregidos. Desvíos aceptados: introducción de 4 pasos; "Sugerencias populares" pasó a "Ideas para empezar"; filtro de Explorar en el cliente (se verifica en la 4b); 1 advertencia de lint pasa a la 4b. Prueba en el celular del 16 de noviembre: lo que funciona se fusiona; lo que falló o faltaba (anillo del primer uso, mensaje de error de Publicar, artículos propios en Explorar, scroll, bucle del botón atrás, flujo de propuesta) pasa a la 4c. El precio estimado se prueba en la 4b-F, con `main` desplegado.

## Fase 4a: Primer uso, perfil, filtros, publicar e identidad en el anillo (encontrado en el celular el 15 de noviembre)
1. **Errores de formulario visibles:** al haber un error (p. ej. "Este correo ya está registrado"), scroll suave al aviso, foco con `aria-live` y error también debajo del campo. Mismo patrón en Iniciar sesión y Publicar.
2. **Primer uso:** introducción de 3 a 4 pasos, no invasiva ("Saltar" siempre visible; una vez por usuario): qué es SmartSwap, publica lo que no usas, cómo funciona el anillo (SwapRing estático de ejemplo), propones y todos aceptan; al final, foto de perfil opcional. Inicio sin artículos: acción principal "Publica tu primer objeto"; "Buscar canje" secundaria con su razón hasta tener al menos 1 artículo activo.
3. **Perfil:** avatar con iniciales sin foto; insignia de lápiz que abre "Editar perfil" (foto, nombre, ubicación); se elimina la sección "Cuenta"; idioma con selector "Español | English" en lugar de interruptor.
4. **Filtros de Explorar estilo marketplace:** buscador y botón "Filtros (N)"; hoja inferior con zona, categoría, estado, precio en COP (mín/máx) y ordenar; "Limpiar" y "Aplicar (X resultados)"; nada cambia hasta Aplicar; chips de filtros activos que se pueden quitar. `minPrice` y `maxPrice` en la API si no existen.
5. **Publicar:** título de máximo 60 caracteres con contador y descripción de máximo 500 (también en el DTO); "Artículos aceptados" empieza vacío (fuera Tablet Samsung, Xiaomi y Auriculares precargados y la etiqueta "Variedad óptima"); precio estimado realista (un control de PS5 nuevo dio 2–3 M COP y debe rondar 200–400 mil): se busca el origen, prompt con contexto y COP, JSON validado, rango razonable con límites por categoría y, si falla, sin sugerencia.
6. **Identidad en el anillo:** los avatares del SwapRing usan la foto de perfil o, si no hay, las iniciales con un color estable por usuario (ya no el avatar de caricatura igual para todos). Las insignias de los arcos muestran la foto del artículo, y el ícono de categoría solo cuando no hay foto (hoy "Mochila" y "Bicicleta" muestran un balón y "Cafetera" un sofá).

**Criterios de salida:** capturas de cada punto; los 3 casos de precio (control PS5 nuevo, bicicleta rodado 29 usada, iPhone 12 usado) con su resultado; `audit:ui` en 0 (100 % y 130 %, los dos temas); suites; revisión de PR; prueba en el celular.

## Fase 4c: Flujo de propuesta, navegación y pulido de la 4a (aprobada si pasa la prueba en el celular; encontrado en el celular el 16 de noviembre)
**Resultado:** PR #24. 214 api, 248 mobile, 40 e2e y 10 de 10 flujos de navegador en verde; `openapi:check` al día; `audit:ui` en 0 en 39 pantallas (156 corridas); 12 hallazgos de revisión corregidos y 2 justificados. Nuevo `POST /routes/direct`; la ruta circular solo devuelve anillos de 3 o 4 que terminan en el artículo elegido; artículo eliminado, reservado o propio → "Este artículo ya no está disponible". Anillo del primer uso: variante B ("Entrega", el objeto viaja en una insignia naranja). La rama sale de la 4a, así que se fusiona después del PR #23.

1. **Proponer desde el detalle:** las tarjetas de Explorar ya no tienen "Proponer"; tocar la tarjeta abre "Detalle del artículo" y ahí está "Proponer canje". Explorar y la búsqueda no muestran artículos propios (filtro en la API y en el cliente). Un artículo propio abierto desde Perfil solo muestra "Eliminar mi publicación".
2. **Nuevo canje en 3 pasos**, con dos entradas (detalle del artículo e Inicio): (1) **Lo que ofreces:** tus artículos activos; si hay uno, ya viene elegido. (2) **Lo que recibes:** desde el detalle, el artículo visto, fijo; desde Inicio, se busca o se elige de los deseados. (3) **Tipo de canje:** *Directo*, propuesta 1 a 1 al dueño aunque tu artículo no esté en su lista de aceptados (es una propuesta; él decide); o *Circular*, la IA busca anillos de 3 o 4 en los que tú recibes ese artículo. Después, confirmar y enviar. Fuera los rótulos "RED INTELIGENTE SMARTSWAP" e "INTERCAMBIO INTELIGENTE". La ruta circular debe respetar el artículo elegido (en la prueba se buscó un control PS5 y la ruta entregaba una Nintendo Switch OLED).
3. **Búsqueda sin saltos ni bucles:** "Analizando rutas" no navega sola. Al terminar, con rutas muestra "Ver N rutas"; sin rutas, un estado vacío con "Proponer canje directo" y "Volver". La pantalla de carga se reemplaza en el historial, así que atrás desde resultados vuelve al paso 3 y nunca relanza la búsqueda. Mismo patrón en todas las pantallas transitorias (cargas, "Propuesta enviada", primer uso). Test e2e del botón atrás.
4. **Scroll:** cada pantalla abre arriba. Excepción: Explorar conserva su posición al volver y, tras bajar más de una pantalla, muestra un botón pequeño de "Volver arriba" (flecha de 44 px, esquina inferior derecha sobre la BottomNav, discreto, con `aria-label`).
5. **Inicio:** queda hasta el estado vacío de rutas ("Aún no tienes rutas…" y "Buscar una ruta"); se quita la sección de artículos; la tarjeta "Busca un canje" se reemplaza por una con el SwapRing que abre el flujo de 3 pasos.
6. **Anillo del primer uso rediseñado:** un solo anillo (fuera el círculo naranja exterior y la píldora "Ejemplo" encima); 3 nodos a 120° con iniciales en colores estables y distintos, nombre debajo ("Tú" sin tapar el avatar); artículos reconocibles en los arcos (nada de íconos que no correspondan); flechas en un solo sentido que no choquen con las insignias; centro sin disco relleno con texto partido (máximo una línea corta, p. ej. "3 personas, 1 canje"). Animación breve: los arcos se dibujan en orden, aparecen los checks y el anillo se cierra (sin animación con `prefers-reduced-motion`). Título y texto del paso visibles sin scroll al 100 %. Claro, oscuro y 130 %.
7. **Errores de Publicar:** el aviso de arriba dice el error en palabras: "Debes agregar al menos 1 artículo que aceptarías a cambio." (nunca "Revisa: Acepto."); se mantienen el scroll y el foco. Se quita la línea roja repetida de abajo y el recuadro de "Aún no agregas ninguno" pasa a ser un estado vacío neutro, no rojo. Mismo criterio en todos los pasos.
8. **"Ideas de la IA" en Acepto:** verificar que salgan de la IA y tengan relación con el artículo; si son una lista fija de respaldo (Tablet, Smartphone, Auriculares), no se muestran.

**Criterios de salida:** capturas antes y después de cada punto (claro, oscuro y 130 %); e2e del flujo de 3 pasos (directo y circular) y del botón atrás; suites en verde; `openapi:check`; `audit:ui` en 0; revisión de PR; video corto del anillo del primer uso; prueba en el celular.

## Fase 4b-N: Nativo Android (ACTIVA, en paralelo con la 4c)
Solo puede tocar `mobile/android/`, `capacitor.config.*`, los recursos de ícono y splash, y archivos nuevos en `mobile/src/native/` con un único punto de enganche en `main.tsx`. Si necesita tocar otro archivo de `src`, lo anota en el reporte y no lo hace.
- Color de la barra de estado y de la barra de navegación de Android según el tema (hoy queda blanca en modo oscuro), también al cambiar de tema en vivo.
- Ícono y splash con `@capacitor/assets`; nombre "SmartSwap"; textos en español en los permisos de cámara y ubicación; configuración del teclado (`resize`).
- Ping de calentamiento a `/health` al abrir la app.

**Criterios de salida:** capturas del celular con las barras del sistema en claro y oscuro, ícono, splash y los dos diálogos de permisos; APK debug compilado.

## Fase 4b-F: Flujos, limpieza y línea base (después de la 4c)
- **Limpieza:** `npm run lint` del mobile en verde (incluida la advertencia heredada de la 4a); un solo término, "artículo" u "objeto", en toda la UI (es y en); zonas seguras; campos que el teclado no tape.
- **Carga:** skeletons en las listas (se recorta primero si falta tiempo).
- **Heredado de la 4a:** (a) el filtro de Explorar en el cliente cuenta sobre todos los resultados, no solo sobre la primera página. (b) Con `main` desplegado en Render, los 3 casos de precio desde el APK.
- **Flujos:** `flow-runner` sobre Login → ruta → propuesta, Publicar y Explorar → detalle → proponer (directo y circular), más foto de perfil, idioma, tema y selector de cuentas; `i18n-audit` es/en; línea base con `visual-snapshot` para la Fase 7.

**Criterios de salida:** reportes de `flow-runner` e `i18n-audit` sin fallos; lint en verde; bugs en 0 abiertos o aceptados por el orquestador.

## Fase 5: APK release firmado
- `versionName` 1.0.0 y `versionCode` 1. Keystore fuera del repo, `keystore.properties` en `.gitignore` y copia de respaldo del keystore.
- Build de producción contra Render por HTTPS sin cleartext, `cap sync` y `./gradlew assembleRelease` con firma.
- Decidir si el APK lleva el selector de cuentas demo (`VITE_DEMO_PASSWORD`): ayuda en la demo, pero la contraseña demo queda dentro del APK. Solo aceptable si esas cuentas son exclusivamente de demo.
- Desinstalar la versión anterior, instalar limpio y probar con datos móviles, no solo con wifi. Si es posible, instalarlo en los celulares de los compañeros para cerrar un anillo de 3 personas en vivo.

**Criterios de salida:** `apksigner verify`, `aapt dump badging` (versión y permisos), tamaño del APK y grabación de un flujo completo en el celular.

## Fase 7: Congelación y ensayo (mar 17)
- Code freeze. Suite completa más `audit:ui` en `main`, `visual-regression` contra la línea base de la 4b, tag `v1.0.0` y GitHub Release con el APK adjunto.
- **Correr el seed el 17** (la propuesta en curso vence a las 48 h).
- Dos ensayos completos en el celular, cronometrados con `docs/demo/GUION.md` (7 a 10 minutos). Nombres de los compañeros completos en el guion.
- Video de respaldo grabado. APK instalado en al menos 2 celulares. Límite de gasto mensual configurado en OpenAI.

**Criterios de salida:** release publicado y checklist del día de la sustentación marcado.

---

## Plantilla del Reporte de puerta
```
FASE: <n> — <nombre>
RAMA / PR: <rama> — <link del PR>
COMMITS: <git log --oneline main..HEAD>
CHECKS: typecheck / test:api / test:mobile / test:e2e / openapi:check (resumen de cada uno)
REVISIÓN PR: <hallazgos de /pr-review-toolkit:review-pr y cómo se resolvió cada uno>
AUDIT UI: <tabla de npm run audit:ui, 100 % y 130 %, claro y oscuro>
EVIDENCIA: <capturas o video del celular>
CRITERIOS: <checkboxes de la fase marcados [x] o [ ]>
DESVÍOS: <lo que se hizo distinto al plan y por qué>
PENDIENTES: <lo que quedó abierto>
```
