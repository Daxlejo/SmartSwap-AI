# Reporte de puerta â€” Fase 5

```
FASE: 5 â€” APK release firmado
RAMA / PR: chore/release-apk â€” https://github.com/Daxlejo/SmartSwap-AI/pull/27
```

## Commits (`git log --oneline main..HEAD`)
```
46b5e12 docs(docs): regenerar el mapa de cÃ³digo con /items/similar
5f25aa9 docs(docs): anotar como deuda la bÃºsqueda y los artÃ­culos parecidos en memoria
6286334 test(mobile): e2e del atrÃ¡s en Publicar paso a paso
2675e4b fix(mobile): atrÃ¡s en Publicar vuelve al paso anterior y pide confirmar al salir con datos
533f0fb feat(mobile): sugerir artÃ­culos parecidos cuando la bÃºsqueda no encuentra nada
3531248 fix(mobile): Explorar y Nuevo canje buscan sin distinguir tildes
11d78b1 fix(items): acotar las lecturas en memoria y limitar GET /items/similar
441090c feat(items): bÃºsqueda sin tildes y GET /items/similar por embeddings
1489cd0 docs(docs): regenerar el grafo de cÃ³digo con el test del selector demo
bd6e247 docs(docs): documentar el APK release firmado y sin contraseÃ±as
e1dc74d test(mobile): el selector de cuentas demo no se muestra sin VITE_DEMO_PASSWORD
42810e8 build(mobile): prohibir trÃ¡fico cleartext en el APK
38b18d7 build(mobile): versiÃ³n 1.0.0 y firma release desde keystore.properties
```

## Checks
| Check | Resultado |
|---|---|
| `npm run typecheck` | Sin errores (api y mobile) |
| `npm run test:api` | 222/222 |
| `npm run test:mobile` | 288/288 |
| `npm run test:e2e` | 40/40 (7 suites) |
| `npm run e2e:flow` | 11/11 flujos, incluido el nuevo "Publish: back walks the steps and asks before discarding" |
| `npm run openapi:check` | Contrato al dÃ­a (se agregÃ³ `GET /items/similar`) |
| ESLint en `mobile/src` | Sin problemas |

## APK release
| VerificaciÃ³n | Resultado |
|---|---|
| Archivo | `mobile/android/app/build/outputs/apk/release/app-release.apk` |
| `apksigner verify --print-certs` | Firma vÃ¡lida con el esquema v2. Un firmante, `CN=SmartSwap, O=SmartSwap, C=CO`, RSA 2048, SHA-256 del certificado `11730d4e628f3305c04d2e7116f2f13b1cc2f4051e6c6a6c97ec8f8fa65e7dbf`. La firma v1 sale `false`, y no hace falta porque minSdk es 24 |
| `aapt dump badging` | `com.smartswap.app`, `versionCode=1`, `versionName=1.0.0`, minSdk 24, targetSdk 36, etiqueta `SmartSwap` |
| Permisos | INTERNET, ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION, CAMERA, ACCESS_NETWORK_STATE, y `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, que agrega AndroidX |
| HTTP sin cifrar | `usesCleartextTraffic=false` en el manifiesto compilado. El bundle apunta a `https://smartswap-api.onrender.com/api/v1`, y las Ãºnicas cadenas `http://` son identificadores de espacios de nombres XML (w3.org) |
| TamaÃ±o | 10,36 MB (10.860.674 bytes), SHA-256 del APK `3BFCE016â€¦AAA3` |
| ContraseÃ±as | Ninguna. Se compilÃ³ con `VITE_DEMO_PASSWORD` vacÃ­a, asÃ­ que no hay selector de cuentas demo (lo comprueba un test). En la sustentaciÃ³n se usan cuentas reales y no se corre el seed |

El keystore estÃ¡ fuera del repositorio, en `C:\Users\CABEZAS\smartswap-keys\`. `mobile/android/keystore.properties` y `mobile/.env.production` estÃ¡n en `.gitignore`, verificado con `git check-ignore`.

## Bugs del celular corregidos en esta fase
1. **BÃºsqueda "Camara" no encontraba "CÃ¡mara".** La bÃºsqueda de Explorar y la del paso 2 de Nuevo canje filtran en el celular, no en la API. Explorar comparaba con tildes; Nuevo canje ya las quitaba. Las dos usan ahora `normalizeSearchText`.
   - (a) La API tambiÃ©n normaliza `GET /items?search=`, con un test de "camara" â†’ "CÃ¡mara".
   - (b) Si la bÃºsqueda por texto no encuentra nada, se llama a `GET /items/similar`: el embedding de la consulta contra los artÃ­culos activos de otros usuarios, con umbral de similitud 0,42, hasta 500 candidatos y 20 llamadas por minuto. Los resultados aparecen bajo "ArtÃ­culos parecidos". Si la IA o la red fallan, se ve el estado vacÃ­o de siempre.
2. **AtrÃ¡s en Publicar.** El botÃ³n atrÃ¡s de Android y la flecha superior pasan por `useBlocker`. En los pasos 2 a 4 vuelven al paso anterior. En el paso 1 con datos preguntan "Â¿Descartar la publicaciÃ³n?". Nuevo canje ya guardaba cada paso en la URL, asÃ­ que el atrÃ¡s recorre 3 â†’ 2 â†’ 1. Hay tests unitarios de los dos casos y un flujo e2e en el navegador.

**Hay cambios en la API** (`GET /items?search=` y `GET /items/similar`). La bÃºsqueda sin tildes y el atrÃ¡s funcionan en el APK desde ya. "ArtÃ­culos parecidos" llega al celular cuando se fusione a `main` y Render despliegue. Hasta entonces el endpoint responde 404 y la app muestra el estado vacÃ­o.

## RevisiÃ³n
Una revisiÃ³n automÃ¡tica de seguridad seÃ±alÃ³ dos lecturas sin lÃ­mite: la bÃºsqueda en memoria y el ranking semÃ¡ntico, que ademÃ¡s puede pagar un embedding por llamada. Se resolvieron con el commit `11d78b1`, que acota cada lectura a 500 filas y limita `/items/similar` a 20 llamadas por minuto. La soluciÃ³n de fondo (`unaccent` y `pgvector`) quedÃ³ como deuda 6 en el README.

## Evidencia
- InstalaciÃ³n y prueba en el celular: **pendiente de confirmar por el usuario**. Hay que desinstalar la versiÃ³n debug, instalar `app-release.apk` y probar con datos mÃ³viles.
- Video del flujo login â†’ Explorar â†’ detalle â†’ proponer directo: **pendiente**.

## Criterios de salida
- [x] `versionName` 1.0.0 y `versionCode` 1
- [x] Keystore fuera del repo, `keystore.properties` en `.gitignore` (verificado con `git check-ignore`)
- [ ] Copia de respaldo del keystore (USB o Drive): la tiene que confirmar el usuario
- [x] Build de producciÃ³n contra Render por HTTPS, sin cleartext
- [x] DecisiÃ³n sobre el selector demo: no se incluye y el APK no lleva contraseÃ±as
- [x] `apksigner verify`, `aapt dump badging` y tamaÃ±o del APK
- [ ] Desinstalar la versiÃ³n debug, instalar la release y probar con datos mÃ³viles: lo hace el usuario
- [ ] GrabaciÃ³n del flujo completo en el celular: la hace el usuario
