# Reporte de puerta: Fase 3

```
FASE: 3 — Anillo de intercambio (con el Bloque 0 de correcciones en Android)
RAMA / PR: feat/swap-ring — https://github.com/Daxlejo/SmartSwap-AI/pull/22 (sin fusionar)
COMMITS: commits atómicos, listados con git log --oneline main..feat/swap-ring
```

## Checks
| Comando | Resultado |
|---|---|
| `npm run typecheck` | api y mobile en verde |
| `npm run test:api` | 18 suites, 162 tests en verde |
| `npm run test:mobile` | 20 archivos, 208 tests en verde (157 antes de la fase) |
| `npm run test:e2e` | 6 suites, 34 tests en verde |
| `npm run openapi:check` | "OpenAPI contract is up to date." |
| `npm run graphify` | `CODE_MAP.md` y `CODE_GRAPH.json` regenerados y commiteados |
| `npm --workspace=mobile run lint` | 1 advertencia de `react-refresh` en `PublishScreen.tsx` que ya estaba en `main`; dejar el lint en verde es tarea de la Fase 4 |

## Revisión de PR (`/pr-review-toolkit:review-pr`)
Corrieron cuatro revisores: código, fallas silenciosas, diseño de tipos y cobertura de tests.

| Hallazgo | Revisor | Resolución |
|---|---|---|
| Si Ajustes no abre, el botón desaparecía o se mostraba un error que no tenía nada que ver | fallas silenciosas | Ahora hay un mensaje propio ("No pudimos abrir Ajustes…") y el error se registra (`21b7cc4`) |
| Tras un tiempo agotado, un fallo vago del GPS hacía perder el consejo útil | fallas silenciosas | Se conserva el aviso de tiempo agotado (`65636ae`) |
| Con solo la ubicación por red apagada no se intentaba el GPS | fallas silenciosas | Solo cortan el reintento el permiso negado, la ubicación apagada y el diálogo de activar ubicación descartado (`65636ae`) |
| Los fallos de foto no dejaban código en logcat; el permiso de galería usaba el texto del de cámara | fallas silenciosas | Se registra el código nativo y hay un mensaje `galleryDenied` (`dfcff9c`) |
| Al volver de Ajustes seguía el aviso viejo | fallas silenciosas | Hook `useAppResume`: limpia el aviso y vuelve a detectar la ubicación (`21b7cc4`) |
| `AppSettingsPlugin` solo atrapaba `ActivityNotFoundException` | fallas silenciosas | Atrapa cualquier `Exception` y rechaza la promesa (`59973b3`) |
| Doble toque en la foto de perfil abría dos cámaras | fallas silenciosas | Estado ocupado mientras la cámara o la galería están abiertas (`21b7cc4`) |
| El anillo confiaba en `stepOrder` sin comprobar que formara un ciclo, y rellenaba nombres vacíos | tipos | `toRingParticipants` devuelve `null` si quien recibe no es quien entrega después, si una persona aparece dos veces o si falta un nombre (`f9f8aa7`) |
| `rejectedBy` era un id que había que buscar de nuevo; `in` aceptaba claves heredadas | tipos | `rejectedBy` guarda la persona; se usa `hasOwnProperty`; `RingLayout` es `readonly` (`f9f8aa7`, `65636ae`, `dfcff9c`) |
| Faltaban tests: los dos intentos de ubicación fallando, qué arco queda abierto, rutas de foto solo con `uri`, anillo de 2, texto sin quien mira, salidas del botón atrás | tests | Agregados (`65636ae`, `dfcff9c`, `16b403f`) |
| La pista "Publica un artículo" de Nuevo canje ya no se podía mostrar | código | Eliminada (`e0f3b72`) |
| La flecha atrás no hacía nada si la pantalla era la primera del historial | código | Vuelve a Inicio (`efeff31`) |

**Revisor general:** no encontró ningún bug con al menos 80 % de confianza.

**No se aplicaron** porque no traen un riesgo real para la demo:
- Tipar las claves de i18n: los textos del anillo están cubiertos por tests.
- Devolver la cancelación de una foto como resultado en vez de error: hay dos llamadas y las dos la ignoran correctamente.
- Mensajes propios para los errores de Google Play Services: ya quedan registrados con su código en logcat.

## Bloque 0: antes y después
| Punto | Antes | Después |
|---|---|---|
| 0.1 Fotos | `<input capture="environment">`: abría la cámara directo, sin galería | Hoja "Tomar foto / Elegir de la galería"; la galería permite varias fotos hasta completar 4 (selector de fotos del sistema). Antes de abrir la cámara se piden permisos con `checkPermissions`/`requestPermissions`; si se niegan, se explica por qué y hay botón a Ajustes. Manifest con `CAMERA`, sin `READ_MEDIA_IMAGES` |
| 0.2 Ubicación | Los códigos `OS-PLUG-GLOC-XXXX` se clasificaban por el texto: "Request to enable location was denied" salía como permiso negado y el tiempo agotado como fallo genérico. Un solo intento, de baja precisión | Clasificación por código: permiso negado, ubicación apagada, tiempo agotado y no disponible, cada uno con su mensaje y botón a Ajustes. Permisos antes de leer, baja precisión y luego GPS, y nueva detección al volver de Ajustes. Plugin registrado (`capacitor.plugins.json`) y `ACCESS_COARSE/FINE_LOCATION` en el manifest |
| 0.3 Navegación | Barra fija con flecha atrás en las 4 pestañas; Canjes sin BottomNav por un `startsWith('/swap')` | Título dentro del contenido y campana con número de no leídas solo en Inicio; BottomNav en Canjes; atrás en una pestaña lleva a Inicio y desde Inicio sale de la app |
| 0.4 Nuevo canje vacío | Barra fija más alta que el espacio reservado: tapaba el estado vacío | Barras `sticky` al final del flujo; sin artículos solo queda el estado vacío con "Publicar un artículo" |
| 0.5 Fuente grande | "ExplorarPublicar", "En curso 0" fuera de la pestaña, placeholders y chips cortados, nombres con elipsis | Cada etiqueta con su espacio, pestañas en dos líneas, placeholders cortos, chips en otra fila, sin `line-clamp` |
| 0.6 `audit:ui` | Daba 0 y no veía 0.4 ni 0.5 | Métricas `tapado` y `desborde` (incluye palabras partidas y textos que chocan), fuente al 130 %, escenario de usuario nuevo y pantallas del anillo |

Capturas del antes y el después al 130 %: `evidencia/fase-3/bloque-0/`.

## `audit:ui` (360 × 800)
| | texto<14 | táctil<44 | elipsis | contraste | scroll | barras | tapado | desborde | errores |
|---|---|---|---|---|---|---|---|---|---|
| Antes, 100 % (claro / oscuro) | 0 / 0 | 0 / 0 | 3 / 3 | 1 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 11 / 11 | 0 / 0 |
| Antes, 130 % (claro / oscuro) | 0 / 0 | 0 / 0 | 14 / 14 | 1 / 0 | 1 / 1 | 0 / 0 | 1 / 1 | 26 / 26 | 0 / 0 |
| **Después, 100 % y 130 %, ambos temas** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

Notas sobre la tabla:
- El "antes" se midió sobre `main` limpio con el script nuevo, pero sin la detección de palabras partidas, que se agregó después; el desborde real era algo mayor.
- El "después" son 84 corridas: 21 pantallas × 2 temas × 2 tamaños de fuente.
- Tablas completas: `evidencia/fase-3/audit-ui-antes.md` y `audit-ui-despues.md`.

## Anillo: capturas
- Matriz de n = 2, 3 y 4 × esperando, cerrado y rechazado × claro y oscuro: `evidencia/fase-3/anillo/matriz-anillo.jpg`.
- Cada caso por separado: `evidencia/fase-3/anillo/ring-n<N>-<estado>-<tema>.jpg`.

## Tamaño del APK: de 8,1 a 14,3 MB
Viene del plugin de cámara, como esperabas. Las dependencias que trae `@capacitor/camera` (salida de `gradlew :capacitor-camera:dependencies`) son:
- `ioncamera-android`
- `androidx.camera:camera-core`, con una librería nativa `libimage_processing_util_jni.so` por cada arquitectura
- Material Components: 925 archivos en `res/` y un `resources.arsc` de 1,3 MB
- gson y exifinterface

La fuente de íconos (3,2 MB) ya estaba antes. El APK es debug, sin R8 ni reducción de recursos; el release firmado de la Fase 5 debería quedar bastante más liviano.

## APK debug final
`mobile/android/app/build/outputs/apk/debug/app-debug.apk`: 14,3 MB, apunta a `https://smartswap-api.onrender.com/api/v1`.

## Criterios de salida
- [x] Capturas de n = 2, 3 y 4 en cada estado y en ambos temas
- [ ] Video corto en el celular del anillo cerrándose (lo graba David)
- [x] `audit:ui` en 0, también con la fuente al 130 %
- [x] Suites en verde

## Desvíos
- **Nombres en los arcos de `full`:** muestran solo la primera palabra del objeto, por fuera del anillo. Con el nombre completo, al 130 % las etiquetas se partían y se montaban sobre la lista. El nombre completo queda en la lista.
- **Tamaños:** `full` mide 320 px y `compact` 260 px, en vez de 300 y 240, para que "Tú" no toque el disco al 130 %.
- **Posición de quien mira:** el anillo se rota para que siempre quede arriba.
- **RouteDetail:** en vez de la explicación en texto muestra el anillo y una lista "Lo que se entrega" con los valores en COP.
- **Ubicación:** no hay celular conectado a este PC, así que la causa raíz de 0.2 sale de leer el código del plugin, no de una prueba en el dispositivo. Si falla, `adb logcat | findstr geolocation` muestra el código exacto.

## Pruebas en el celular (David)
| Prueba | Resultado | Evidencia |
|---|---|---|
| Publicar: elegir varias fotos de la galería | | |
| Publicar: tomar una foto; negar el permiso y volver desde Ajustes | | |
| Ubicación: detectar con permiso; con la ubicación apagada; negando el permiso | | |
| Navegación: las 4 pestañas sin barra superior, la campana en Inicio y el botón atrás | | |
| Fuente del sistema en grande: BottomNav, Canjes, Explorar y Nuevo canje | | |
| Video corto del anillo cerrándose (Canjes → En curso, aceptar la última respuesta) | | |

## Pendientes
- Video del anillo y pruebas en el celular (tabla de arriba).
- Lint del mobile en verde (Fase 4).
