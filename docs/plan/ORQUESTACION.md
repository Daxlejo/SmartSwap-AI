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

## Regla de las puertas (actualizada el 10 de noviembre)
1. Hay como máximo **dos fases ACTIVAS** a la vez, y solo si no tocan los mismos archivos. En la práctica: una fase de código más la Fase 6 (solo `docs/`). Cada fase activa corre en su propio worktree (`git worktree add ../smartswap-<fase> <rama>`) y en su propia sesión de Claude Code.
2. Al cerrar una fase, David pega en el chat el **Reporte de puerta** (plantilla al final) con evidencia real: salidas de comandos y capturas. Un "ya quedó" no cuenta como evidencia.
3. El orquestador responde **APROBADA** (y entrega el prompt de la siguiente fase) o **RECHAZADA** (con la lista exacta de lo que falta).
4. Antes de pegar el reporte de una fase de código (1 a 4), el ejecutor corre la revisión de PR (`/pr-review-toolkit:review-pr`) y corrige o justifica cada hallazgo.
5. El PR de la fase se fusiona a `main` solo después de la aprobación.
6. Regla en `CLAUDE.md` para el ejecutor: *"Trabaja solo en la fase que indica tu prompt, y solo si está marcada ACTIVA en docs/plan/ORQUESTACION.md. Al cumplir los criterios de salida, detente y genera el Reporte de puerta. No cambies el estado de ninguna fase."*

## Tablero
| Fase | Fechas | Rama | Estado |
|---|---|---|---|
| 0. Línea base, integración y APK de humo | lun 2 – mié 11 | `chore/fase-0-integracion` | Aprobada |
| 1. Datos reales y estados vacíos | mié 11 – jue 12 | `feat/real-data` | Aprobada |
| 2. Tipografía, táctil y contraste | jue 12 | `feat/ui-type-scale` | Aprobada |
| 3. Anillo de intercambio | vie 13 | `feat/swap-ring` | **ACTIVA** |
| 4. Pulido de flujos y comportamiento nativo Android | sáb 14 | `feat/ui-polish` | Bloqueada |
| 5. APK release firmado | dom 15 | `chore/release-apk` | Bloqueada |
| Colchón | lun 16 | — | — |
| 6. Arquitectura 4+1 y guion de demo | jue 12, **en paralelo** | `docs/architecture` | Aprobada |
| 7. Congelación, tag v1.0.0 y ensayo | mar 17 | `main` | Bloqueada |

## Plugins y subagentes por fase
Activar solo los de la fase en curso (`/plugin` para habilitar y deshabilitar); con todos activos, Claude Code se vuelve lento y se confunde de herramienta.

| Fase | Plugins y skills | Subagentes |
|---|---|---|
| 0 (cierre) | github (si `gh` no está instalado) | — |
| 1 | supabase (`supabase`, `supabase-postgres-best-practices`) | `silent-failure-hunter` para cazar fallbacks a mock escondidos |
| 2 | Axe, playwright, `design:accessibility-review`, `design:design-system` | — |
| 3 | `frontend-design`, feature-dev | `code-architect` diseña la geometría antes de implementar; `type-design-analyzer` sobre los tipos de `SwapRing` |
| 4 | Snagly (`flow-runner`, `i18n-audit`, `visual-snapshot`), `design:ux-copy` | — |
| 5 | github (tag y Release) | — |
| 6 | feature-dev | `code-explorer` más tres subagentes propios en `.claude/agents/`: `diagramas-4mas1`, `adr-readme`, `guion-demo` |
| 7 | Snagly (`visual-regression` contra la línea base de la Fase 4) | — |
| Todas las fases de código | pr-review-toolkit (`/pr-review-toolkit:review-pr`) | revisores del toolkit |

---

## Fase 0: Línea base, integración y APK de humo
**Por qué va primero:** el APK no se ha compilado desde que se agregó geolocalización. Si la cadena de Android falla, hay que saberlo ya.

**Estado al 10 de noviembre:** las suites están en verde sobre `main` (157 de api, 89 de mobile y 34 de e2e). Las 6 ramas ya estaban fusionadas, hasta el PR #16. Se corrigió el registro de `@capacitor/geolocation` en Android. Falta lo siguiente:
- Render: el servicio no se ha redesplegado desde el merge de #16 (lleva unos 4,6 días arriba). Tampoco están verificadas las migraciones ni medido el arranque en frío.
- APK: la máquina no tiene Java ni el Android SDK configurados.
- Subir `chore/fase-0-integracion` y fusionarla con un PR.

**Desvío aceptado:** `npm audit fix` sin `--force` falla por un conflicto de peer dependencies y no cambia nada. Las vulnerabilidades (@nestjs/core, body-parser, ajv, esbuild, vitest) pasan a la deuda documentada del README en la Fase 6.

**Criterios de salida**
- [x] Las 6 suites en verde sobre `main`, con conteo de tests
- [x] 6 PR fusionados y `main` con la punta de `feat/media-and-profile`
- [ ] Render desplegando `main` (commit del último deploy), migraciones confirmadas en los logs, `/health` en 200 y tiempo de arranque en frío medido
- [ ] APK debug instalado; login y geolocalización funcionan en el celular físico (con capturas)
- [ ] Regla de puertas en `CLAUDE.md` **fusionada a `main`** mediante PR

## Fase 1: Datos reales y estados vacíos
- Quitar todos los restos de demo: `mockSwapRoute` de Home, "1,420 usuarios activos" y los porcentajes de los presets en ConfigureSwap, el fallback mock de "En curso" en Trades, notificaciones e items mock sin sesión, y los mocks de `AppContext`, `RouteDetailScreen`, `ProposalConfirmScreen`, `ProposalSentScreen`, `swapService.ts` y `routes.service.ts`.
- Seed idempotente con cuentas demo en municipios cercanos de Nariño, objetos con foto en Supabase y precio en COP. El motor debe encontrar de verdad al menos un ciclo de 2, uno de 3 y uno de 4, y debe quedar una propuesta en curso.
- Estados vacíos diseñados (ilustración, una frase y una acción) en Home, las 3 pestañas de Trades, Notificaciones y Explorar.
- Verificar de punta a punta el selector de cuentas demo con `VITE_DEMO_PASSWORD`.

**Criterios de salida:** `rg -n -i "mock" api/src mobile/src` solo devuelve tests y fixtures; el seed corre dos veces sin duplicar datos; capturas de un usuario nuevo con estados vacíos y de un usuario demo con una ruta real; cambio de cuenta probado; suites en verde; revisión de PR sin hallazgos abiertos.

## Fase 2: Tipografía, área táctil y contraste - Aprobada
- Tokens en Tailwind: `caption` 14 px, `body` 16 px, `body-lg` 18 px y títulos de 20, 24 y 28 px, con interlineado de 1,5 en el cuerpo. Se prohíben `text-xs` y los tamaños arbitrarios menores de 14 px; si se puede, con una regla de lint.
- Áreas táctiles: `min-h-11 min-w-11` en todo lo que se pueda tocar y 48 px en las acciones principales.
- Nombres y títulos de objetos: `line-clamp-2` en lugar de `truncate`.
- **Contraste (calculado el 2 de noviembre):** el teal `#00685f` sobre blanco da 6,68:1 y pasa. El mango `#fd761a` sobre blanco da **2,70:1 y falla AA**, tanto para texto como para texto blanco sobre un botón mango. Los botones mango llevan texto `slate-900` (6,62:1), y el mango nunca se usa como color de texto sobre fondo claro. `slate-400` sobre blanco da 2,56:1 y tampoco sirve para texto; `slate-500` da 4,76:1 y es el gris más claro permitido.
- Script de auditoría con Playwright a 360×800, tema claro y oscuro, en todas las pantallas. Cuenta textos de menos de 14 px, objetivos táctiles de menos de 44 px y elementos con elipsis, y corre axe-core para contraste. Debe quedar como `npm run audit:ui` para repetirlo en cada fase.

**Criterios de salida:** tabla antes/después de la auditoría con 0 en las cuatro métricas y en ambos temas; capturas de Home, Trades y RouteDetail a 360 px en claro y oscuro; prueba en el celular con "Tamaño de fuente" del sistema en grande sin que se rompa el layout.

### Alcance ampliado (12 de noviembre): legibilidad, densidad y tema oscuro
**A. Bloqueante, va primero (encontrado en un Android real)**
- En Iniciar sesión/Crear cuenta y en Publicar no se puede hacer scroll. Se busca la causa raíz (overflow hidden, `h-screen` o `100vh`, contenedores fijos) y se corrige de forma global, no pantalla por pantalla.
- El contenido queda tapado por la BottomNav y el botón Publicar: padding inferior que corresponda.
- En Explorar, el encabezado fijo (buscador y filtros) se monta sobre las tarjetas: fondo opaco y z-index correcto.
- Comprobación con Playwright a 360×800 de que en cada pantalla se llega al final con scroll.

**B. Lo que ya decía el plan:** tokens de tipografía (nada menor de 14 px), áreas táctiles de 44 y 48 px, `line-clamp-2` en lugar de `truncate`, y títulos del encabezado que no se corten ("Configurar C…", "Buscando Ru…"): títulos más cortos o en dos líneas.

**C. Modo oscuro rediseñado:** tokens propios para fondo, superficies, bordes, texto principal y secundario, un teal que se lea bien sobre oscuro, y el mango. Sin degradados claros en oscuro (el hero del Home pasa a azul claro). Contraste AA verificado con axe en los dos temas.

**D. Densidad y honestidad**
- Menos texto: máximo una línea de apoyo por tarjeta; se quitan los subtítulos decorativos.
- Se quita toda promesa de algo que no existe: "Garantía de Depósito en Custodia", "Intercambio verificado", "Modo Seguro", el ticker "CANJE EN VIVO" si no es real y cualquier cifra de CO₂ que no salga de datos reales. Si el CO₂ se calcula, la fórmula queda documentada.
- Skills `design:design-critique` sobre capturas de antes y después, y `design:ux-copy` para los textos en es y en.

**E. `npm run audit:ui`** a 360×800 en los dos temas. Cuenta textos de menos de 14 px, objetivos táctiles de menos de 44 px, elipsis, contraste (axe) y pantallas donde no se llega al final con scroll. La meta es 0 en todo.

**Cierre ampliado:** suites, graphify, `/pr-review-toolkit:review-pr` (corregir o justificar cada hallazgo), APK debug con `VITE_API_URL` de Render y PR hacia `main` sin fusionar. Reporte de puerta con la tabla de `audit:ui` antes y después, capturas a 360 px en claro y oscuro de Home, Explorar, Publicar, Registro y Trades, y espacio para las pruebas en el celular (scroll y tamaño de fuente del sistema en grande).

## Fase 3: Anillo de intercambio - ACTIVA
- Componente `SwapRing` en SVG. Recibe de 2 a 4 participantes (nombre, avatar, objeto que entrega y estado: pendiente, aceptó o rechazó) y tiene variante `compact` y `full`.
- Geometría: los avatares van repartidos en el círculo empezando arriba. Cada arco de órbita lleva una flecha en el sentido de la entrega y una insignia del objeto en su punto medio. En el centro, un disco con "3 personas" y el estado. Los arcos son punteados mientras alguien no ha aceptado y se vuelven sólidos al aceptar; cuando todos aceptan, el anillo se cierra y aparece el halo.
- Accesibilidad: `role="img"` con un `aria-label` que narra el ciclo completo, y debajo una lista en texto ("Tú entregas la bicicleta a Laura"), porque un adulto mayor puede no leer el diagrama. Cada avatar es un botón de 48 px. Con `prefers-reduced-motion` no hay animación. Solo se animan `transform` y `stroke-dashoffset`.
- Se usa en Home (compact), RouteDetail (full), ProposalConfirm, ProposalSent y la pestaña "En curso" de Trades (con el estado de cada persona).
- Tests de geometría para n = 2, 3 y 4, de estados y del texto accesible.

**Criterios de salida:** capturas de n = 2, 3 y 4 en cada estado y en ambos temas; video corto en el celular del anillo cerrándose; `audit:ui` sigue en 0; suites en verde.

## Fase 4: Pulido de flujos y comportamiento nativo Android
- Recorrer en el celular los 3 flujos obligatorios: Login → ruta completa → propuesta; Publicar objeto; Explorar → proponer. También foto de perfil, cambio de idioma, cambio de tema y selector de cuentas.
- Comportamiento nativo: botón atrás de Android (`@capacitor/app`, que salga de la app solo desde Home), color de la barra de estado por tema, zonas seguras, teclado que no tape los campos, ícono y splash con `@capacitor/assets`, nombre "SmartSwap" y textos en español al pedir permisos de cámara y ubicación.
- Skeletons de carga y mitigación del arranque en frío de Render (el banner de servidor ya existe; se agrega un ping de calentamiento al abrir la app).
- Capturar con `visual-snapshot` la línea base visual que se compara en la Fase 7.
- `npm run lint` del mobile en verde.
- Unificar "artículo" y "objeto": un solo término en toda la UI (es y en).
- Introducción al crear la cuenta, foto de perfil opcional y avatar con iniciales cuando no hay foto.

**Criterios de salida:** checklist de cada flujo con captura desde el celular; reporte de `flow-runner` e `i18n-audit` (es/en) sin fallos; lista de bugs encontrados en 0 abiertos o aceptados explícitamente por el orquestador.

## Fase 5: APK release firmado
- `versionName` 1.0.0 y `versionCode` 1. Keystore generado fuera del repo, `keystore.properties` en `.gitignore` y copia de respaldo del keystore.
- Build de producción contra Render por HTTPS sin cleartext, `cap sync` y `./gradlew assembleRelease` con firma.
- Desinstalar la versión anterior, instalar limpio y probar con datos móviles, no solo con wifi.
- Si es posible, instalarlo también en los celulares de los compañeros para cerrar un anillo de 3 personas en vivo.

**Criterios de salida:** salida de `apksigner verify`, `aapt dump badging` (versión y permisos), tamaño del APK y grabación de pantalla de un flujo completo en el celular.

## Fase 6: Arquitectura 4+1 y guion de demo (en paralelo, solo `docs/`) - Aprobada
- `docs/architecture/` en Mermaid y dibujable a mano, en el orden del profesor: **Contexto → Funcional (casos de uso) → Lógica (clases y módulos de Nest) → Desarrollo (paquetes del monorepo) → Despliegue (APK, Render, PostgreSQL, Supabase, OpenAI)**. Además: secuencia del consenso de propuestas, explicación del algoritmo de ciclos de 2 a 4, ER desde Prisma y ADRs cortos (Capacitor frente a React Native, COP en enteros, ciclos de máximo 4).
- Actualizar el README y la sección de deuda conocida (las vulnerabilidades que exigen `--force`, el E2E sobre doble en memoria) dicha con honestidad.
- `docs/demo/GUION.md`: 7 a 10 minutos cronometrados, quién habla en cada parte, qué cuenta usar y un plan B (video de respaldo, hotspot propio, calentar Render 10 minutos antes). El guion se ajusta al final con lo que entregue la Fase 3.

**Criterios de salida:** los diagramas renderizan con `mmdc` sin errores. (El ensayo cronometrado pasó a la Fase 7.)

## Fase 7: Congelación y ensayo (mar 17)
- Code freeze. Suite completa más `audit:ui` en `main`, `visual-regression` contra la línea base de la Fase 4, tag `v1.0.0` y GitHub Release con el APK adjunto.
- Dos ensayos completos en el celular. Video de respaldo grabado. APK instalado en al menos 2 celulares.
- Ensayo cronometrado del guion de `docs/demo/GUION.md` dentro de los 7 a 10 minutos (viene de la Fase 6).
- Correr el seed el día anterior a la sustentación (la propuesta en curso vence a las 48 h).

**Criterios de salida:** release publicado y checklist del día de la sustentación marcado.

---

## Plantilla del Reporte de puerta
```
FASE: <n> — <nombre>
RAMA / PR: <rama> — <link del PR>
COMMITS: <git log --oneline main..HEAD>
CHECKS: typecheck / test:api / test:mobile / test:e2e / openapi:check (pegar el resumen de cada uno)
REVISIÓN PR: <hallazgos de /pr-review-toolkit:review-pr y cómo se resolvió cada uno>  (fases 1 a 4)
AUDIT UI: <tabla de npm run audit:ui>  (desde la Fase 2)
EVIDENCIA: <capturas o video del celular>
CRITERIOS: <copiar los checkboxes de la fase marcados [x] o [ ]>
DESVÍOS: <lo que se hizo distinto al plan y por qué>
PENDIENTES: <lo que quedó abierto>
```

---

## Prompt de cierre de la Fase 0 (pegar en Claude Code)
```
Sigues siendo el ejecutor de la Fase 0 de SmartSwap. Solo vas a cerrar los criterios que quedaron abiertos. No toques la Fase 1 ni el código de UI.

1. Reemplaza docs/plan/ORQUESTACION.md con el plan actualizado que te paso. Actualiza también la regla de CLAUDE.md con este texto: "Trabaja solo en la fase que indica tu prompt, y solo si está marcada ACTIVA en docs/plan/ORQUESTACION.md. Al cumplir los criterios de salida, detente y genera el Reporte de puerta. No cambies el estado de ninguna fase." Haz un commit atómico para cada cambio.

2. Toolchain de Android. Antes de instalar nada, busca si ya existe una instalación: el JBR de Android Studio (carpeta jbr dentro de la instalación de Android Studio), el SDK en ANDROID_HOME, en ANDROID_SDK_ROOT o en la ruta por defecto (Windows: %LOCALAPPDATA%\Android\Sdk; macOS: ~/Library/Android/sdk; Linux: ~/Android/Sdk), y mobile/android/local.properties. Este proyecto ya generó un APK antes con JBR 21, así que lo más probable es que solo falten las variables en tu shell.
   - Si lo encuentras: exporta JAVA_HOME al jbr y ANDROID_HOME al SDK, verifica con java -version y escribe sdk.dir en local.properties. Ese archivo no se versiona.
   - Si no existe: detente y pídeme que instale Android Studio.

3. APK de humo: build de mobile con VITE_API_URL apuntando a Render, npx cap sync android y, en mobile/android, ./gradlew assembleDebug. Reporta la ruta y el tamaño del APK. Si hay un celular conectado con depuración USB, instálalo con adb install -r. Si no, dime dónde está el archivo para pasarlo al celular.

4. Render: cuando yo te confirme que el último deploy ya es el commit de main, verifica /health. Después mide el arranque en frío: espero al menos 20 minutos sin tráfico y corres curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" <URL>/health. Repite la medición en caliente para comparar.

5. Publica la rama chore/fase-0-integracion y abre el PR hacia main. Si gh no está instalado, usa el plugin github o pídeme que lo instale. No lo fusiones: el merge va después de la aprobación.

6. DETENTE y genera el Reporte de puerta. Incluye el commit del deploy de Render, las líneas de migración del log que yo te pase, los dos tiempos de /health, la ruta y el tamaño del APK y el link del PR. Deja un espacio para mis capturas de login y del mapa en el celular.
```
