# SmartSwap AI: plan de cierre en fases con puertas de aprobación

**Ventana:** lunes 2 de noviembre a miércoles 11 de noviembre de 2026. La entrega se supone el jueves 12; si la fecha real es otra, se corre el calendario.
**Orquestador:** Claude, en el chat del Project "App Mobile". **Ejecutor:** Claude Code en el PC de David.
**Meta:** un APK release firmado, instalado en un celular Android físico, sin datos falsos visibles, legible para adultos mayores y con el anillo de intercambio como elemento distintivo.

## Alcance acordado (2 de noviembre)
| Entra | No entra |
|---|---|
| Escala tipográfica nueva: ningún texto por debajo de 14 px, cuerpo en 16 px o más | Medidor de justicia |
| Áreas táctiles de al menos 44 px (48 px en acciones principales) | Cuenta regresiva de 48 h |
| Cero nombres truncados con elipsis | Toggle de texto grande (se compensa con la escala base y con el tamaño de fuente del sistema Android) |
| Componente **Anillo de intercambio** (`SwapRing`) | Upgrades mayores por `npm audit` (Nest 12, zod 4): quedan como deuda documentada |
| Eliminar todos los mocks; seed real con estados vacíos bien diseñados | |
| Fusionar las 6 ramas apiladas a `main`; desde ahí, una rama y un PR por fase | |

## Regla de las puertas
1. Solo hay una fase **ACTIVA** a la vez. Claude Code no empieza la siguiente aunque le sobre tiempo.
2. Al cerrar una fase, David pega en el chat el **Reporte de puerta** (plantilla al final) con evidencia real: salidas de comandos y capturas. Un "ya quedó" no cuenta como evidencia.
3. El orquestador responde **APROBADA** (y entrega el prompt de la siguiente fase) o **RECHAZADA** (con la lista exacta de lo que falta).
4. El PR de la fase se fusiona a `main` solo después de la aprobación.
5. En la Fase 0 se agrega a `CLAUDE.md` esta regla para el ejecutor: *"Trabaja solo en la fase marcada ACTIVA en docs/plan/ORQUESTACION.md. Al cumplir los criterios de salida, detente y genera el Reporte de puerta. No cambies el estado de ninguna fase."*

## Tablero
| Fase | Día | Rama | Estado |
|---|---|---|---|
| 0. Línea base, integración y APK de humo | lun 2 | `main` (PR por rama apilada) | **ACTIVA** |
| 1. Datos reales y estados vacíos | mar 3 | `feat/real-data` | Bloqueada |
| 2. Tipografía, táctil y contraste | mié 4 – jue 5 | `feat/ui-type-scale` | Bloqueada |
| 3. Anillo de intercambio | vie 6 – sáb 7 | `feat/swap-ring` | Bloqueada |
| 4. Pulido de flujos y comportamiento nativo Android | dom 8 | `feat/ui-polish` | Bloqueada |
| 5. APK release firmado | lun 9 | `chore/release-apk` | Bloqueada |
| 6. Arquitectura 4+1 y guion de demo | mar 10 | `docs/architecture` | Bloqueada |
| 7. Congelación, tag v1.0.0 y ensayo | mié 11 | `main` | Bloqueada |

---

## Fase 0: Línea base, integración y APK de humo (lun 2)
**Por qué va primero:** el APK no se ha compilado desde que se agregó geolocalización. Si la cadena de Android falla, hay que saberlo el día 1 y no el día 10.

**Tareas**
- Verificar que el árbol esté limpio y correr en `feat/media-and-profile`: `typecheck`, `test:api`, `test:mobile`, `test:e2e`, `openapi:check`, `graphify` y el build de `mobile`. Corregir lo que falle en commits atómicos.
- Fusionar a `main` en orden: notifications-and-hardening → i18n-theme → ux-resilience → e2e-contract → colombia-location → media-and-profile. Un PR por rama con descripción corta; después de cada merge se cambia la base del siguiente PR a `main`.
- Confirmar que Render despliega `main`: migraciones aplicadas (incluida la conversión USD→COP, que no debe correr dos veces) y `/health` responde. Medir cuánto tarda el primer request después de que el servicio está dormido.
- `npm audit fix` **sin** `--force`, solo si todo sigue en verde. Si algo se rompe, se revierte.
- APK de humo: `vite build` con `VITE_API_URL` de Render, `npx cap sync android`, `./gradlew assembleDebug`, instalar en el celular, hacer login con una cuenta demo y abrir el mapa con permiso de ubicación.
- Copiar este plan a `docs/plan/ORQUESTACION.md` y agregar la regla de puertas a `CLAUDE.md`.

**Criterios de salida**
- [ ] Las 6 suites en verde sobre `main`, con conteo de tests
- [ ] 6 PR fusionados y `main` igual a la punta de `feat/media-and-profile` (más los arreglos)
- [ ] Render sano en `main`, con el tiempo de arranque en frío medido
- [ ] APK debug instalado; login y geolocalización funcionan en el celular físico
- [ ] Regla de puertas incluida en `CLAUDE.md`

## Fase 1: Datos reales y estados vacíos (mar 3)
- Quitar todos los restos de demo: `mockSwapRoute` de Home, "1,420 usuarios activos" y los porcentajes de los presets en ConfigureSwap, el fallback mock de "En curso" en Trades, notificaciones e items mock sin sesión, y los mocks de `AppContext`, `RouteDetailScreen`, `ProposalConfirmScreen`, `ProposalSentScreen`, `swapService.ts` y `routes.service.ts`.
- Seed idempotente con cuentas demo en municipios cercanos de Nariño, objetos con foto en Supabase y precio en COP. El motor debe encontrar de verdad al menos un ciclo de 2, uno de 3 y uno de 4, y debe quedar una propuesta en curso.
- Estados vacíos diseñados (ilustración, una frase y una acción) en Home, las 3 pestañas de Trades, Notificaciones y Explorar.
- Verificar de punta a punta el selector de cuentas demo con `VITE_DEMO_PASSWORD`.

**Criterios de salida:** `rg -n -i "mock" api/src mobile/src` solo devuelve tests y fixtures; el seed corre dos veces sin duplicar datos; capturas de un usuario nuevo con estados vacíos y de un usuario demo con una ruta real; cambio de cuenta probado; suites en verde.

## Fase 2: Tipografía, área táctil y contraste (mié 4 – jue 5)
- Tokens en Tailwind: `caption` 14 px, `body` 16 px, `body-lg` 18 px y títulos de 20, 24 y 28 px, con interlineado de 1,5 en el cuerpo. Se prohíben `text-xs` y los tamaños arbitrarios menores de 14 px; si se puede, con una regla de lint.
- Áreas táctiles: `min-h-11 min-w-11` en todo lo que se pueda tocar y 48 px en las acciones principales.
- Nombres y títulos de objetos: `line-clamp-2` en lugar de `truncate`.
- **Contraste (calculado el 2 de noviembre):** el teal `#00685f` sobre blanco da 6,68:1 y pasa. El mango `#fd761a` sobre blanco da **2,70:1 y falla AA**, tanto para texto como para texto blanco sobre un botón mango. Los botones mango llevan texto `slate-900` (6,62:1), y el mango nunca se usa como color de texto sobre fondo claro. `slate-400` sobre blanco da 2,56:1 y tampoco sirve para texto; `slate-500` da 4,76:1 y es el gris más claro permitido.
- Script de auditoría con Playwright a 360×800, tema claro y oscuro, en todas las pantallas. Cuenta textos de menos de 14 px, objetivos táctiles de menos de 44 px y elementos con elipsis, y corre axe-core para contraste. Debe quedar como `npm run audit:ui` para repetirlo en cada fase.

**Criterios de salida:** tabla antes/después de la auditoría con 0 en las cuatro métricas y en ambos temas; capturas de Home, Trades y RouteDetail a 360 px en claro y oscuro; prueba en el celular con "Tamaño de fuente" del sistema en grande sin que se rompa el layout.

## Fase 3: Anillo de intercambio (vie 6 – sáb 7)
- Componente `SwapRing` en SVG. Recibe de 2 a 4 participantes (nombre, avatar, objeto que entrega y estado: pendiente, aceptó o rechazó) y tiene variante `compact` y `full`.
- Geometría: los avatares van repartidos en el círculo empezando arriba. Cada arco de órbita lleva una flecha en el sentido de la entrega y una insignia del objeto en su punto medio. En el centro, un disco con "3 personas" y el estado. Los arcos son punteados mientras alguien no ha aceptado y se vuelven sólidos al aceptar; cuando todos aceptan, el anillo se cierra y aparece el halo.
- Accesibilidad: `role="img"` con un `aria-label` que narra el ciclo completo, y debajo una lista en texto ("Tú entregas la bicicleta a Laura"), porque un adulto mayor puede no leer el diagrama. Cada avatar es un botón de 48 px. Con `prefers-reduced-motion` no hay animación. Solo se animan `transform` y `stroke-dashoffset`.
- Se usa en Home (compact), RouteDetail (full), ProposalConfirm, ProposalSent y la pestaña "En curso" de Trades (con el estado de cada persona).
- Tests de geometría para n = 2, 3 y 4, de estados y del texto accesible.

**Criterios de salida:** capturas de n = 2, 3 y 4 en cada estado y en ambos temas; video corto en el celular del anillo cerrándose; `audit:ui` sigue en 0; suites en verde.

## Fase 4: Pulido de flujos y comportamiento nativo Android (dom 8)
- Recorrer en el celular los 3 flujos obligatorios: Login → ruta completa → propuesta; Publicar objeto; Explorar → proponer. También foto de perfil, cambio de idioma, cambio de tema y selector de cuentas.
- Comportamiento nativo: botón atrás de Android (`@capacitor/app`, que salga de la app solo desde Home), color de la barra de estado por tema, zonas seguras, teclado que no tape los campos, ícono y splash con `@capacitor/assets`, nombre "SmartSwap" y textos en español al pedir permisos de cámara y ubicación.
- Skeletons de carga y mitigación del arranque en frío de Render (el banner de servidor ya existe; se agrega un ping de calentamiento al abrir la app).

**Criterios de salida:** checklist de cada flujo con captura desde el celular; lista de bugs encontrados en 0 abiertos o aceptados explícitamente por el orquestador.

## Fase 5: APK release firmado (lun 9)
- `versionName` 1.0.0 y `versionCode` 1. Keystore generado fuera del repo, `keystore.properties` en `.gitignore` y copia de respaldo del keystore.
- Build de producción contra Render por HTTPS sin cleartext, `cap sync` y `./gradlew assembleRelease` con firma.
- Desinstalar la versión anterior, instalar limpio y probar con datos móviles, no solo con wifi.
- Si es posible, instalarlo también en los celulares de los compañeros para cerrar un anillo de 3 personas en vivo.

**Criterios de salida:** salida de `apksigner verify`, `aapt dump badging` (versión y permisos), tamaño del APK y grabación de pantalla de un flujo completo en el celular.

## Fase 6: Arquitectura 4+1 y guion de demo (mar 10)
- `docs/architecture/` en Mermaid y dibujable a mano, en el orden del profesor: **Contexto → Funcional (casos de uso) → Lógica (clases y módulos de Nest) → Desarrollo (paquetes del monorepo) → Despliegue (APK, Render, PostgreSQL, Supabase, OpenAI)**. Además: secuencia del consenso de propuestas, explicación del algoritmo de ciclos de 2 a 4, ER desde Prisma y ADRs cortos (Capacitor frente a React Native, COP en enteros, ciclos de máximo 4).
- Actualizar el README y la sección de deuda conocida (las vulnerabilidades, el E2E sobre doble en memoria) dicha con honestidad.
- `docs/demo/GUION.md`: 7 a 10 minutos cronometrados, quién habla en cada parte, qué cuenta usar y un plan B (video de respaldo, hotspot propio, calentar Render 10 minutos antes).

**Criterios de salida:** los diagramas renderizan con `mmdc` sin errores; un ensayo cronometrado dentro del tiempo.

## Fase 7: Congelación y ensayo (mié 11)
- Code freeze. Suite completa más `audit:ui` en `main`, tag `v1.0.0` y GitHub Release con el APK adjunto.
- Dos ensayos completos en el celular. Video de respaldo grabado. APK instalado en al menos 2 celulares.

**Criterios de salida:** release publicado y checklist del día de la sustentación marcado.

---

## Plantilla del Reporte de puerta
```
FASE: <n> — <nombre>
RAMA / PR: <rama> — <link del PR>
COMMITS: <git log --oneline main..HEAD>
CHECKS: typecheck / test:api / test:mobile / test:e2e / openapi:check (pegar el resumen de cada uno)
AUDIT UI: <tabla de npm run audit:ui>  (desde la Fase 2)
EVIDENCIA: <capturas o video del celular>
CRITERIOS: <copiar los checkboxes de la fase marcados [x] o [ ]>
DESVÍOS: <lo que se hizo distinto al plan y por qué>
PENDIENTES: <lo que quedó abierto>
```

---

## Prompt de la Fase 0 (pegar en Claude Code)
```
Eres el ejecutor de la Fase 0 de SmartSwap. Lee primero docs/graph/CODE_MAP.md y respeta las reglas del proyecto: español, TypeScript estricto sin any, el mobile solo usa apiClient.ts, dinero en COP entero con formatCop, commits atómicos convencionales tipo(scope): descripción con mi identidad de autor.

Objetivo: dejar main integrado y verde, y probar que se puede generar el APK.

1. git fetch --all y confirma que el árbol está limpio en feat/media-and-profile.
2. Corre npm run typecheck, test:api, test:mobile, test:e2e, openapi:check y graphify, más el build de mobile. Guarda el resumen de cada uno. Si algo falla, corrígelo con commits atómicos y vuelve a correr todo.
3. Con gh, abre un PR por cada rama apilada, en este orden: feat/notifications-and-hardening (base main), feat/i18n-theme, feat/ux-resilience, test/e2e-contract, feat/colombia-location, feat/media-and-profile. Fusiónalos uno por uno con merge commit; después de cada merge, cambia la base del siguiente a main. No reescribas historia ni uses force-push.
4. Revisa que Render despliegue main: que las migraciones queden aplicadas (la conversión USD→COP no puede correr dos veces) y que /health responda. Mide el tiempo del primer request con el servicio dormido.
5. Corre npm audit fix SIN --force. Si alguna suite se rompe, revierte ese commit.
6. APK de humo: build de mobile con VITE_API_URL apuntando a Render, npx cap sync android, y en mobile/android ./gradlew assembleDebug. Reporta la ruta y el tamaño del APK. Dime cuándo instalarlo para que yo pruebe login y ubicación en el celular.
7. Copia el plan que te paso a docs/plan/ORQUESTACION.md y agrega a CLAUDE.md la regla: "Trabaja solo en la fase marcada ACTIVA en docs/plan/ORQUESTACION.md. Al cumplir los criterios de salida, detente y genera el Reporte de puerta. No cambies el estado de ninguna fase."

Al terminar, DETENTE. No empieces la Fase 1 ni cambies código de UI. Genera el Reporte de puerta con la plantilla del plan.
```
