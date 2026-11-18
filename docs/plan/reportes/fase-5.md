# Reporte de puerta — Fase 5

```
FASE: 5 — APK release firmado
RAMA / PR: chore/release-apk — (enlace del PR al abrirlo)
```

## Commits (`git log --oneline main..HEAD`)
```
46b5e12 docs(docs): regenerar el mapa de código con /items/similar
5f25aa9 docs(docs): anotar como deuda la búsqueda y los artículos parecidos en memoria
6286334 test(mobile): e2e del atrás en Publicar paso a paso
2675e4b fix(mobile): atrás en Publicar vuelve al paso anterior y pide confirmar al salir con datos
533f0fb feat(mobile): sugerir artículos parecidos cuando la búsqueda no encuentra nada
3531248 fix(mobile): Explorar y Nuevo canje buscan sin distinguir tildes
11d78b1 fix(items): acotar las lecturas en memoria y limitar GET /items/similar
441090c feat(items): búsqueda sin tildes y GET /items/similar por embeddings
1489cd0 docs(docs): regenerar el grafo de código con el test del selector demo
bd6e247 docs(docs): documentar el APK release firmado y sin contraseñas
e1dc74d test(mobile): el selector de cuentas demo no se muestra sin VITE_DEMO_PASSWORD
42810e8 build(mobile): prohibir tráfico cleartext en el APK
38b18d7 build(mobile): versión 1.0.0 y firma release desde keystore.properties
```

## Checks
| Check | Resultado |
|---|---|
| `npm run typecheck` | Sin errores (api y mobile) |
| `npm run test:api` | 222/222 |
| `npm run test:mobile` | 288/288 |
| `npm run test:e2e` | 40/40 (7 suites) |
| `npm run e2e:flow` | 11/11 flujos, incluido el nuevo "Publish: back walks the steps and asks before discarding" |
| `npm run openapi:check` | Contrato al día (se agregó `GET /items/similar`) |
| ESLint en `mobile/src` | Sin problemas |

## APK release
| Verificación | Resultado |
|---|---|
| Archivo | `mobile/android/app/build/outputs/apk/release/app-release.apk` |
| `apksigner verify --print-certs` | Firma válida con el esquema v2. Un firmante, `CN=SmartSwap, O=SmartSwap, C=CO`, RSA 2048, SHA-256 del certificado `11730d4e628f3305c04d2e7116f2f13b1cc2f4051e6c6a6c97ec8f8fa65e7dbf`. La firma v1 sale `false`, y no hace falta porque minSdk es 24 |
| `aapt dump badging` | `com.smartswap.app`, `versionCode=1`, `versionName=1.0.0`, minSdk 24, targetSdk 36, etiqueta `SmartSwap` |
| Permisos | INTERNET, ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION, CAMERA, ACCESS_NETWORK_STATE, y `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, que agrega AndroidX |
| HTTP sin cifrar | `usesCleartextTraffic=false` en el manifiesto compilado. El bundle apunta a `https://smartswap-api.onrender.com/api/v1`, y las únicas cadenas `http://` son identificadores de espacios de nombres XML (w3.org) |
| Tamaño | 10,36 MB (10.860.674 bytes), SHA-256 del APK `3BFCE016…AAA3` |
| Contraseñas | Ninguna. Se compiló con `VITE_DEMO_PASSWORD` vacía, así que no hay selector de cuentas demo (lo comprueba un test). En la sustentación se usan cuentas reales y no se corre el seed |

El keystore está fuera del repositorio, en `C:\Users\CABEZAS\smartswap-keys\`. `mobile/android/keystore.properties` y `mobile/.env.production` están en `.gitignore`, verificado con `git check-ignore`.

## Bugs del celular corregidos en esta fase
1. **Búsqueda "Camara" no encontraba "Cámara".** La búsqueda de Explorar y la del paso 2 de Nuevo canje filtran en el celular, no en la API. Explorar comparaba con tildes; Nuevo canje ya las quitaba. Las dos usan ahora `normalizeSearchText`.
   - (a) La API también normaliza `GET /items?search=`, con un test de "camara" → "Cámara".
   - (b) Si la búsqueda por texto no encuentra nada, se llama a `GET /items/similar`: el embedding de la consulta contra los artículos activos de otros usuarios, con umbral de similitud 0,42, hasta 500 candidatos y 20 llamadas por minuto. Los resultados aparecen bajo "Artículos parecidos". Si la IA o la red fallan, se ve el estado vacío de siempre.
2. **Atrás en Publicar.** El botón atrás de Android y la flecha superior pasan por `useBlocker`. En los pasos 2 a 4 vuelven al paso anterior. En el paso 1 con datos preguntan "¿Descartar la publicación?". Nuevo canje ya guardaba cada paso en la URL, así que el atrás recorre 3 → 2 → 1. Hay tests unitarios de los dos casos y un flujo e2e en el navegador.

**Hay cambios en la API** (`GET /items?search=` y `GET /items/similar`). La búsqueda sin tildes y el atrás funcionan en el APK desde ya. "Artículos parecidos" llega al celular cuando se fusione a `main` y Render despliegue. Hasta entonces el endpoint responde 404 y la app muestra el estado vacío.

## Revisión
Una revisión automática de seguridad señaló dos lecturas sin límite: la búsqueda en memoria y el ranking semántico, que además puede pagar un embedding por llamada. Se resolvieron con el commit `11d78b1`, que acota cada lectura a 500 filas y limita `/items/similar` a 20 llamadas por minuto. La solución de fondo (`unaccent` y `pgvector`) quedó como deuda 6 en el README.

## Evidencia
- Instalación y prueba en el celular: **pendiente de confirmar por el usuario**. Hay que desinstalar la versión debug, instalar `app-release.apk` y probar con datos móviles.
- Video del flujo login → Explorar → detalle → proponer directo: **pendiente**.

## Criterios de salida
- [x] `versionName` 1.0.0 y `versionCode` 1
- [x] Keystore fuera del repo, `keystore.properties` en `.gitignore` (verificado con `git check-ignore`)
- [ ] Copia de respaldo del keystore (USB o Drive): la tiene que confirmar el usuario
- [x] Build de producción contra Render por HTTPS, sin cleartext
- [x] Decisión sobre el selector demo: no se incluye y el APK no lleva contraseñas
- [x] `apksigner verify`, `aapt dump badging` y tamaño del APK
- [ ] Desinstalar la versión debug, instalar la release y probar con datos móviles: lo hace el usuario
- [ ] Grabación del flujo completo en el celular: la hace el usuario
