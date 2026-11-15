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

## Tablero (actualizado el 15 de noviembre)
| Fase | Fechas | Rama | Estado |
|---|---|---|---|
| 0. Línea base, integración y APK de humo | lun 2 – jue 12 | `chore/fase-0-*` | Aprobada |
| 1. Datos reales y estados vacíos | mié 11 – jue 12 | `feat/real-data` | Aprobada |
| 2. Legibilidad, densidad y tema oscuro | jue 12 | `feat/ui-type-scale` | Aprobada |
| 6. Arquitectura 4+1 y guion de demo | jue 12 (en paralelo) | `docs/architecture` | Aprobada |
| 3. Bloque 0 (correcciones del celular) y anillo de intercambio | vie 13 – dom 15 | `feat/swap-ring` | Aprobada |
| 4a. Primer uso, perfil, filtros y publicar | dom 15 | `feat/ux-first-use` | **ACTIVA** |
| 4b. Comportamiento nativo Android, flujos y limpieza | dom 15 – lun 16 | `feat/ui-polish` | Bloqueada |
| 5. APK release firmado | lun 16 | `chore/release-apk` | Bloqueada |
| Colchón | lun 16 (tarde) | — | — |
| 7. Congelación, seed, tag v1.0.0 y ensayos | mar 17 | `main` | Bloqueada |

## Plugins por fase
Activar solo los de la fase en curso (`/plugin`). Los plugins son del usuario: lo que se activa aplica a todas las terminales.

| Fase | Activos |
|---|---|
| 3 | frontend-design, design, playwright, pr-review-toolkit |
| 4a | design (`ux-copy`), frontend-design, playwright, pr-review-toolkit |
| 4b | Snagly (`flow-runner`, `i18n-audit`, `visual-snapshot`), playwright, pr-review-toolkit |
| 5 | ninguno especial (`gh` para tag y Release) |
| 7 | Snagly (`visual-regression`), playwright |

---

## Fases aprobadas (resumen)
- **0:** suites en verde (157 api, 89 mobile, 34 e2e); 6 ramas integradas; geolocalización registrada en Android; Render desplegando `main` (2f4ea75, sin migraciones pendientes, `/health` 200; el servicio no se durmió en 21 min, así que el arranque en frío queda "no observado" y se mitiga con el ping de la 4b); APK debug probado en un Android físico; `gradle.properties` sin la ruta de Java de otra máquina (JAVA_HOME de usuario en Temurin 21).
- **1:** sin mocks fuera de tests; seed idempotente con 6 cuentas de Nariño y ciclos reales de 2, 3 y 4; estados vacíos; búsqueda bloqueada sin artículos publicados; `npm run smoke:demo`.
- **2:** tokens de tipografía y táctiles; scroll corregido de raíz; modo oscuro con tokens propios; fuera las promesas falsas (custodia, verificado, Modo Seguro, ticker, CO₂, calificación y nivel por defecto); `audit:ui` en 0.
- **6:** vistas 4+1 en Mermaid, secuencia de consenso, algoritmo de ciclos, ER, ADRs, README con deuda conocida y `docs/demo/GUION.md`. El ensayo cronometrado pasó a la Fase 7.

## Fase 3: Bloque 0 y anillo de intercambio (Aprobada)
**Bloque 0 (hecho, pendiente de prueba en el celular):** hoja "Tomar foto / Elegir de la galería" con permisos; geolocalización con mensajes específicos (permiso, ubicación apagada, tiempo agotado); sin barra superior en las 4 pestañas principales, con la campana solo en Inicio; BottomNav visible en Canjes; botón atrás de Android (pestaña → Inicio → salir); Nuevo canje sin artículos sin botón tapando; fuente al 130 % sin pisarse; `audit:ui` con métricas de "tapado" y "desborde" y corrida al 130 %.

**Anillo (componente y tests hechos; falta integración):**
- `SwapRing` en SVG de 2 a 4 participantes (tupla tipada), variantes `compact` (260 px) y `full` (320 px). Estado calculado de las respuestas: esperando, cerrado o rechazado.
- Ajustes aprobados: tocar un avatar resalta su línea; disco central con una palabra y "N personas"; en `compact` solo el ícono o la foto del objeto; "Tú" siempre arriba, con borde teal y primero en la lista; un rechazo deja el arco abierto con la acción "Buscar otra ruta".
- Falta: usarlo en Home (compact), RouteDetail, ProposalConfirm, ProposalSent (full) y en "En curso" de Canjes; conectar "Buscar otra ruta"; revisar el render en claro, oscuro y 130 %; actualizar las marcas [PENDIENTE F3] del guion.

**Criterios de salida:** capturas de n = 2, 3 y 4 en cada estado y en los dos temas; `audit:ui` en 0 (100 % y 130 %); suites en verde; explicación del APK de 14,3 MB (plugin de cámara); prueba en el celular del Bloque 0 y video corto del anillo cerrándose.

## Fase 4a: Primer uso, perfil, filtros y publicar (ACTIVA; encontrado en el celular el 15 de noviembre)
1. **Errores de formulario visibles:** al haber un error (p. ej. "Este correo ya está registrado"), scroll suave al aviso, foco con `aria-live` y error también debajo del campo. Mismo patrón en Iniciar sesión y Publicar.
2. **Primer uso:** introducción de 3 a 4 pasos, no invasiva ("Saltar" siempre visible; una vez por usuario): qué es SmartSwap, publica lo que no usas, cómo funciona el anillo (SwapRing estático de ejemplo), propones y todos aceptan; al final, foto de perfil opcional. Inicio sin artículos: acción principal "Publica tu primer objeto"; "Buscar canje" secundaria con su razón hasta tener al menos 1 artículo activo.
3. **Perfil:** avatar con iniciales sin foto; insignia de lápiz que abre "Editar perfil" (foto, nombre, ubicación); se elimina la sección "Cuenta"; idioma con selector "Español | English" en lugar de interruptor.
4. **Filtros de Explorar estilo marketplace:** buscador y botón "Filtros (N)"; hoja inferior con zona, categoría, estado, precio en COP (mín/máx) y ordenar; "Limpiar" y "Aplicar (X resultados)"; nada cambia hasta Aplicar; chips de filtros activos que se pueden quitar. `minPrice` y `maxPrice` en la API si no existen.
5. **Publicar:** título de máximo 60 caracteres con contador y descripción de máximo 500 (también en el DTO); "Artículos aceptados" empieza vacío (fuera Tablet Samsung, Xiaomi y Auriculares precargados y la etiqueta "Variedad óptima"); precio estimado realista (un control de PS5 nuevo dio 2–3 M COP y debe rondar 200–400 mil): se busca el origen, prompt con contexto y COP, JSON validado, rango razonable con límites por categoría y, si falla, sin sugerencia.
6. **Identidad en el anillo:** los avatares del SwapRing usan la foto de perfil o, si no hay, las iniciales con un color estable por usuario (ya no el avatar de caricatura igual para todos). Las insignias de los arcos muestran la foto del artículo, y el ícono de categoría solo cuando no hay foto (hoy "Mochila" y "Bicicleta" muestran un balón y "Cafetera" un sofá).

**Criterios de salida:** capturas de cada punto; los 3 casos de precio (control PS5 nuevo, bicicleta rodado 29 usada, iPhone 12 usado) con su resultado; `audit:ui` en 0 (100 % y 130 %, los dos temas); suites; revisión de PR; prueba en el celular.

## Fase 4b: Comportamiento nativo Android, flujos y limpieza
- **Nativo:** color de la barra de estado y de la barra de navegación de Android según el tema (hoy queda blanca en modo oscuro); zonas seguras; teclado que no tapa los campos; ícono y splash con `@capacitor/assets`; nombre "SmartSwap"; textos en español en los permisos de cámara y ubicación.
- **Carga y Render:** skeletons de carga y ping de calentamiento a `/health` al abrir la app (el banner de servidor ya existe).
- **Limpieza:** `npm run lint` del mobile en verde; un solo término, "artículo" u "objeto", en toda la UI (es y en).
- **Flujos:** `flow-runner` sobre los 3 flujos obligatorios (Login → ruta → propuesta; Publicar; Explorar → proponer), más foto de perfil, idioma, tema y selector de cuentas; `i18n-audit` es/en; línea base con `visual-snapshot` para la Fase 7.

**Criterios de salida:** reportes de `flow-runner` e `i18n-audit` sin fallos; lint en verde; capturas del celular en claro y oscuro (barras del sistema incluidas); bugs en 0 abiertos o aceptados por el orquestador.

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
