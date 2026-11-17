# Reporte de puerta: Fase 4b-N

```
FASE: 4b-N — Nativo Android (en paralelo con la 4c)
RAMA / PR: feat/android-native — sin PR (no se fusiona hasta la aprobación)
COMMITS: git log --oneline main..feat/android-native (commits atómicos)
```

## Qué se hizo
| Punto del plan | Resultado |
|---|---|
| Barras del sistema según el tema, también en vivo | `ThemeBarsPlugin` (Java, plugin local) pinta el fondo de las barras, el color de las barras en Android < 15 y el estilo de íconos con el tema **de la app**. `src/native/systemBars.ts` lee `--color-surface` y la clase `dark` de `<html>` y se lo pasa al arrancar y en cada cambio de tema (MutationObserver), así que no hubo que tocar `ThemeContext`. La última elección se guarda en SharedPreferences: la app arranca con las barras correctas antes de cargar la web |
| Causa de las barras blancas en oscuro | El `SystemBars` de Capacitor 8 solo cambia el estilo de los íconos y pinta el fondo de las barras con el `windowBackground` del tema del sistema (blanco). Además la navegación de 3 botones ponía un velo de contraste blanco. Las dos cosas se corrigen en `ThemeBarsPlugin` |
| Ícono | Fuentes en `mobile/assets/` (1024 px) hechas con las flechas de `src/assets/logo.svg`; generado con `@capacitor/assets@3.0.5 generate --android` (legado, redondo y adaptativo en todas las densidades). Antes era un ícono genérico de "sync" en blanco |
| Splash | Splash nativo de Android (androidx core-splashscreen): flechas sobre teal, en vector para que no se vea borroso. `MainActivity` lo mantiene hasta que carga la app web (máximo 3 s), así no hay destello blanco |
| Nombre "SmartSwap" | `app_name` ya era "SmartSwap"; confirmado en la info de la app y en los diálogos de permisos |
| Textos en español en los permisos | Android no permite personalizar el texto de sus diálogos: salen en el idioma del teléfono con el nombre de la app ("¿Permitir que SmartSwap…?"). Confirmado en el celular |
| Teclado (`resize`) | `adjustResize` en la actividad y `SystemBars` con `insetsHandling: 'css'`: el contenido se encoge hasta el borde del teclado. Se quitaron de `capacitor.config` las secciones `SplashScreen` y `StatusBar`, que configuraban plugins no instalados |
| Ping de calentamiento a `/health` | `src/native/serverWarmup.ts`: antes de montar React y en cada `resume` de Android (Render se duerme a los 15 min), máximo uno por minuto, vía `healthService` → `apiClient` |
| Encontrado en el celular | En Android 15 el WebView dibuja de borde a borde: en pantallas sin barra superior (Perfil, Crear cuenta) el contenido se veía detrás de la hora al hacer scroll (`04-…antes-de-la-franja`). `ThemeBarsPlugin` agrega una franja opaca del color del tema con la altura exacta de la barra de estado (`09-…sin-solape`) |

Enganche único en `main.tsx`: `initNative()` justo después de aplicar el tema guardado. Cada pieza va en su propio `try/catch`: un fallo nativo nunca impide montar React.

## Checks
| Comando | Resultado |
|---|---|
| `npm run typecheck` | api y mobile en verde |
| `npm run test:mobile` | 23 archivos, 227 tests en verde (19 nuevos en `src/native/`) |
| `eslint src/native src/main.tsx --max-warnings 0` | en verde |
| `./gradlew assembleDebug` | BUILD SUCCESSFUL, `app-debug.apk` de 13,9 MB, instalado en el celular |
| `npm run graphify` | `CODE_GRAPH.json` regenerado y commiteado |
| `test:api`, `test:e2e`, `openapi:check`, `audit:ui` | No aplican: la fase no toca la API ni la UI web |

## Revisión de PR (`/pr-review-toolkit:review-pr`: código, errores y tests)
| Hallazgo | Revisor | Resolución |
|---|---|---|
| `initNative()` sin protección antes de montar React: un error futuro dejaría la app en blanco | errores (medio) | `try/catch` por pieza en `src/native/index.ts` (`36f9f27`) |
| Fallo de `ThemeBars.apply` y del listener de `resume` sin rastro | errores (bajo) | `console.warn` con el detalle (`36f9f27`) |
| `applyNow` en el hilo principal sin protección | errores (bajo) | `applySafely`: registra en logcat y rechaza la llamada (`36f9f27`) |
| No se comprobaba qué observa el MutationObserver, ni que tras `stop` se ignoren cambios, ni el plugin por defecto `ThemeBars` | tests (5–6/10) | Tests agregados; también respaldos de color con token vacío o mal formado y `initNative` aislando fallos (`437f8d3`, `36f9f27`) |

**No se aplicaron**, con la razón:
- **Reintentar si falla la primera pintada:** queda el color guardado del arranque anterior y el siguiente cambio de tema reintenta.
- **En Android ≤ 11 las barras teal del splash no se ven:** es solo estético.
- **Al abrir salen dos pings a `/health` (el del arranque y el del aviso de estado):** el primero es a propósito, antes de React.

El revisor general no encontró bugs ni violaciones de `CLAUDE.md`.

## Evidencia (Redmi Note 13, 23129RA5FL, Android 15, WebView 157)
Carpeta `evidencia/fase-4b-n/`:

| Captura | Muestra |
|---|---|
| `01-splash.png` | Splash: flechas de la marca sobre teal, nítidas |
| `02-claro-inicio.png` | Barras en claro: superficie clara (`#f8fafc`) con íconos oscuros, arriba y abajo |
| `05-oscuro-inicio.png` | Barras en oscuro: superficie oscura (`#0f172a`) con íconos claros, arriba y abajo |
| `04-oscuro-perfil-antes-de-la-franja.png` | Cambio a oscuro en vivo desde Perfil; el contenido se veía detrás de la hora al hacer scroll |
| `09-oscuro-scroll-sin-solape.png` | Lo mismo con la franja: el contenido se corta en el borde de la barra |
| `10-oscuro-arranque-en-frio.png` | Arranque en frío con el tema oscuro guardado: barras oscuras desde el inicio |
| `03-icono-info-app.png` | Ícono nuevo y nombre "SmartSwap" en la info de la app |
| `06-permiso-ubicacion.png` | "¿Permitir que SmartSwap acceda a la ubicación de este dispositivo?" |
| `07-permiso-camara.png` | "¿Permitir que SmartSwap tome fotos y grabe videos?" |

Se descartaron las capturas que mostraban datos personales: pantalla de inicio del teléfono, una notificación y el municipio detectado.

## Criterios de salida
- [x] Capturas del celular con las barras del sistema en claro y en oscuro (también en vivo y en arranque en frío)
- [x] Ícono
- [x] Splash
- [x] Los dos diálogos de permisos (ubicación y cámara)
- [x] APK debug compilado
- [x] Revisión de PR con cada hallazgo corregido o justificado

## Desvíos
- **`mobile/assets/` y `docs/`:** además de los archivos permitidos se agregaron las fuentes del ícono (`mobile/assets/`, entrada de `@capacitor/assets`), el grafo y este reporte.
- **`package.json` sin cambios:** `@capacitor/assets` se corrió con `npx`. No se instalaron `@capacitor/status-bar` ni `@capacitor/splash-screen`, porque Capacitor 8 trae `SystemBars` y el splash nativo de Android cubre lo pedido.
- **Splash en oscuro:** el splash es teal en los dos modos. Aparece antes de que la app sepa qué tema eligió el usuario; uno oscuro solo podría seguir el modo oscuro del teléfono (`values-night`).
- **Ningún otro archivo de `src`:** aparte de `main.tsx` y `src/native/`, no se tocó nada.

## Pendientes
- **Campos que el teclado tapa (para la 4b-F, que ya lo tiene en su lista):** el teclado encoge bien el contenido, pero la página no desplaza el campo enfocado a la vista. En Crear cuenta, la contraseña quedó medio tapada. Es trabajo del lado web.
- **Estado del teléfono de prueba:** quedó con la app en modo oscuro y sin sesión (la reinstalación la cerró). Se vuelve a claro desde Perfil.
- **Cuenta creada para la prueba:** David creó durante la prueba una cuenta nueva "Alex" en la base de datos de Render. Conviene borrarla antes de la Fase 7 si no se va a usar.
