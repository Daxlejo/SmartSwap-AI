# SmartSwap AI

SmartSwap es una app Android de **trueque circular** para Nariño, Colombia. No hace falta que dos personas quieran justo lo que la otra ofrece: el sistema encuentra **anillos de 2 a 4 personas** (Alex le da la bicicleta a Valeria, Valeria le da la guitarra a Alex; o cadenas de tres y cuatro) y los propone. El anillo solo se cierra si todas las personas aceptan. La IA reconoce el objeto en la foto, sugiere su valor en pesos colombianos (COP) y explica en lenguaje sencillo por qué la ruta es justa. La interfaz está pensada para que también la usen adultos mayores.

## Arquitectura
La documentación completa (modelo 4+1, en Mermaid) está en **[docs/architecture/](docs/architecture/README.md)**:

1. [Contexto](docs/architecture/01-contexto.md) → 2. [Funcional](docs/architecture/02-funcional.md) → 3. [Lógica](docs/architecture/03-logica.md) → 4. [Desarrollo](docs/architecture/04-desarrollo.md) → 5. [Despliegue](docs/architecture/05-despliegue.md)
- [Consenso de una propuesta](docs/architecture/06-secuencia-consenso.md) · [Algoritmo de ciclos](docs/architecture/07-algoritmo-ciclos.md) · [Modelo de datos](docs/architecture/08-modelo-datos.md) · [ADRs](docs/architecture/README.md#decisiones-adr)
- Guion de la sustentación: [docs/demo/GUION.md](docs/demo/GUION.md)
- Contrato HTTP: [docs/contract/openapi.yaml](docs/contract/openapi.yaml) · Mapa del código: [docs/graph/CODE_MAP.md](docs/graph/CODE_MAP.md)

```text
SmartSwap-AI/
├── api/        NestJS 10 + Prisma 5 + Zod. Módulos auth, users, items, routes (motor de ciclos), ai, geo, notifications, health
├── mobile/     React 18 + Vite 5 + Tailwind + Capacitor 8 (Android). Pantallas, AppContext y servicios sobre apiClient
├── docs/       contract/openapi.yaml, graph/CODE_MAP.md, architecture/, demo/, plan/
├── scripts/    graphify.mjs (regenera CODE_MAP), smoke-demo.mjs
└── render.yaml despliegue de la API en Render
```

| Pieza | Dónde corre |
|---|---|
| App | APK Android (WebView de Capacitor, `appId com.smartswap.app`) |
| API | Render, web service `smartswap-api`, plan free, `/api/v1/health` |
| Datos | PostgreSQL en Supabase (Prisma; las migraciones corren con `prisma migrate deploy` al arrancar) |
| Fotos | Supabase Storage, bucket `item-images` |
| IA | OpenAI `gpt-4o-mini` (visión, valoración, explicación) y `text-embedding-3-small` |

## Cómo correrlo

**Requisitos:** Node 20 o superior, npm 10 o superior, y JDK 21 + Android SDK para compilar el APK.

```bash
npm install                      # instala los workspaces mobile y api
npm run dev:api                  # API en http://localhost:3000/api/v1 (necesita api/.env)
npm run dev:mobile               # app en el navegador (Vite)
npm --workspace=api run db:seed  # cuentas demo de Nariño; se puede correr dos veces sin duplicar datos
```

Variables de la API (solo en `api/.env` o en Render, nunca en `mobile/`): `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. Variables de la app: `VITE_API_URL` y, solo en builds de demo, `VITE_DEMO_PASSWORD`, que activa el selector de cuentas demo. La guía paso a paso está en [docs/deployment/SETUP_DIA1.md](docs/deployment/SETUP_DIA1.md).

### APK Android
```powershell
cd mobile
npm run build:apk                # build de Vite + npx cap sync android
cd android
.\gradlew.bat assembleDebug      # app/build/outputs/apk/debug/app-debug.apk
```
Más detalles para el equipo en [mobile/GUIA_EQUIPO.md](mobile/GUIA_EQUIPO.md).

### Verificación
| Comando | Qué revisa |
|---|---|
| `npm run typecheck` | TypeScript estricto en mobile y api |
| `npm run test:api` | Jest: servicios, motor de ciclos, puntaje, datos del seed |
| `npm run test:mobile` | Vitest: servicios, i18n, formato COP, ConfigureSwap |
| `npm run test:e2e` | HTTP de punta a punta: descubrir el ciclo de 3, proponer, bloquear, aceptar, completar, cancelar y expirar |
| `npm run openapi:check` | El contrato `docs/contract/openapi.yaml` coincide con la API |
| `npm run graphify` | Regenera `docs/graph/CODE_MAP.md` |

Al 10 de noviembre de 2026, sobre `main`: 157 tests de api, 89 de mobile y 34 de e2e, todos en verde.

## Cuentas demo
El seed (`api/src/seed/seed-data.ts`) crea seis personas en municipios de Nariño: `alex`, `valeria`, `mateo`, `camila`, `diego` y `laura`, todas con correo `@smartswap.co`. Sus objetos tienen foto y precio en COP. Con esos datos, el motor encuentra para Alex un ciclo de 2 personas (objetivo "Guitarra"), uno de 3 ("Tablet") y uno de 4 ("Consola Nintendo"). Además queda una propuesta en curso entre Alex, Mateo y Diego, en la que falta que Diego responda. La contraseña no está en el repositorio. Detalle en [el algoritmo de ciclos](docs/architecture/07-algoritmo-ciclos.md).

## Deuda conocida
Esto es lo que sabemos que no está bien y decidimos no arreglar antes de la entrega del 18 de noviembre:

1. **Vulnerabilidades de `npm audit` que solo se arreglan con `--force`.** Al 12 de noviembre, `npm audit` reporta 51 vulnerabilidades: 2 críticas, 14 altas, 24 moderadas y 11 bajas. Las principales están en `@nestjs/core` ≤ 11.1.17 (y en `body-parser` y `multer`, que llegan a través de él), `zod` < 4.6.6, `ajv`, `esbuild`, `vitest`/`tinypool` (una de las críticas) y `webpack`/`tmp` dentro de `@nestjs/cli`. `npm audit fix` sin `--force` no cambia nada por un conflicto de peer dependencies. Con `--force` instala versiones mayores (Nest 12, zod 4, Vitest 4) que rompen la API y los tests, así que se dejó fuera del alcance. Varias afectan solo herramientas de desarrollo (Vitest, esbuild, `@nestjs/cli`) y no el servidor desplegado. Las de Nest, `body-parser`, `multer` y zod sí llegan a producción y son lo primero que hay que atender después de la entrega.
2. **El E2E corre sobre un doble en memoria, no sobre PostgreSQL.** `npm run test:e2e` levanta la app Nest real, pero reemplaza `PrismaService` por `api/test/support/in-memory-prisma.ts` (`overrideProvider`). Ese doble imita solo las consultas que usan los servicios y deshace las transacciones cuando fallan. El E2E **no** prueba el SQL real, los índices, el bloqueo de fila de `lockRouteRow` con concurrencia real ni las migraciones. Eso se verificó a mano contra Supabase y en Render.
3. **`AppContext` no tiene tests unitarios.** `mobile/src/context/AppContext.tsx` concentra la sesión, los objetos, las rutas, las notificaciones y sus estados de carga y error, pero ningún test lo ejercita directamente: en `configureSwap.test.tsx` se reemplaza con `vi.mock`. Los servicios que usa sí tienen tests.
4. **Dependencia del plan free de Render.** El servicio se duerme cuando no tiene tráfico, y la primera petición paga el arranque en frío (Node + `prisma migrate deploy`), que puede tardar decenas de segundos. Tampoco hay cron: las propuestas vencidas (48 h) se marcan como `EXPIRED` de forma perezosa, cuando alguien lista o responde. La app muestra un aviso de servidor (`ServerStatusBanner`) y para la demo calentamos el servicio antes (ver el plan B del [guion](docs/demo/GUION.md)). La solución de fondo es un plan pago.
5. **Dinero como entero por convención.** `items.estimatedValue` es `Float` en la base de datos y el DTO no exige `.int()` ([ADR-0002](docs/architecture/adr/0002-cop-como-entero.md)).

## Reglas del repositorio
Commits convencionales y atómicos (`feat(routes): …`, `docs(docs): …`). Cada fase va en un PR que se fusiona solo después de que se aprueba su puerta ([docs/plan/ORQUESTACION.md](docs/plan/ORQUESTACION.md)). Las reglas para agentes y colaboradores están en [CLAUDE.md](CLAUDE.md).
