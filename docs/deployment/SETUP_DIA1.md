# Guía de Despliegue Cloud en 10 Minutos — SmartSwap (Día 1)

Esta guía paso a paso está diseñada para que David configure la infraestructura cloud completa de **SmartSwap** (Supabase PostgreSQL + Storage, Render Web Service con NestJS/Prisma, y UptimeRobot Keep-Alive) en menos de 10 minutos para la demo universitaria.

---

## 📋 Resumen de Arquitectura y Roles

```
┌────────────────────────────────┐
│   Mobile App (React/Capacitor) │
│   VITE_API_URL                 │
└───────────────┬────────────────┘
                │ HTTPS
                ▼
┌────────────────────────────────┐       Ping /health (10 min)      ┌─────────────┐
│  Render Web Service (NestJS)   │ ◄────────────────────────────────┤ UptimeRobot │
│  smartswap-api (Free Tier)     │                                  └─────────────┘
└───────┬──────────────┬─────────┘
        │              │
        │ Prisma       │ Storage API (Imágenes)
        ▼              ▼
┌────────────────────────────────────────────────────────┐
│                   Supabase Cloud                       │
│  - PostgreSQL (Transaction Pooler :6543 / Direct :5432)│
│  - Storage Bucket ("item-images")                      │
└────────────────────────────────────────────────────────┘
```

---

## ⏱️ Paso 1: Configuración de Supabase (5 minutos)

### 1.1 Crear el Proyecto
1. Ingresa a [supabase.com](https://supabase.com/) e inicia sesión.
2. Haz clic en **"New Project"** y selecciona tu organización.
3. Configura los datos del proyecto:
   - **Name**: `smartswap-prod` (o el nombre de tu preferencia).
   - **Database Password**: Genera una contraseña segura y **guárdala en tu gestor de notas inmediatamente**.
   - **Region**: Selecciona una región cercana a Render (por ejemplo: `East US (North Virginia) - us-east-1` u `Ohio`).
   - **Pricing Plan**: `Free`.
4. Haz clic en **"Create new project"** y espera ~2 minutos a que termine el aprovisionamiento.

---

### 1.2 Obtener las URLs de Conexión para Prisma (`DATABASE_URL` y `DIRECT_URL`)
Prisma en entornos serverless y contenedores cloud requiere **dos URLs**:
- **`DATABASE_URL` (Transaction Pooler - Puerto 6543 con `?pgbouncer=true`)**: Conexión a través de PgBouncer para el tráfico regular de la API, optimizada para soportar múltiples conexiones concurrentes sin agotar los sockets de PostgreSQL.
- **`DIRECT_URL` (Session / Direct Mode - Puerto 5432)**: Conexión directa a PostgreSQL sin pooling intermedio, requerida por el CLI de Prisma para ejecutar migraciones de esquema DDL (`prisma migrate dev` y `prisma migrate deploy`).

**Dónde encontrarlas en el Dashboard de Supabase:**
1. Ve a **Project Settings** (ícono de engranaje abajo a la izquierda) > **Database**.
2. Desplázate hasta la sección **"Connection string"**.
3. Selecciona la pestaña **"URI"**:
   - **Para `DATABASE_URL`**:
     - Activa la casilla **"Use connection pooling"**.
     - Selecciona el modo **Transaction** (Puerto `6543`).
     - Copia la URI. Tendrá el formato:
       ```
       postgresql://postgres.[PROJECT-REF]:[TU-CONTRASEÑA]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
       ```
   - **Para `DIRECT_URL`**:
     - Desmarca la casilla **"Use connection pooling"** (o selecciona el modo **Session** / Direct en el puerto `5432`).
     - Copia la URI. Tendrá el formato:
       ```
       postgresql://postgres.[PROJECT-REF]:[TU-CONTRASEÑA]@aws-0-[REGION].pooler.supabase.com:5432/postgres
       ```
4. **Importante**: Reemplaza `[TU-CONTRASEÑA]` con la contraseña real que definiste en el paso 1.1. Si tu contraseña tiene caracteres especiales (como `@`, `#`, `$`, `/`), debes codificarlos en formato URL (URL-encode).

---

### 1.3 Crear el Bucket Público en Supabase Storage
1. En el menú lateral izquierdo de Supabase, entra a **Storage**.
2. Haz clic en **"New bucket"**.
3. Configura el bucket:
   - **Bucket name**: `item-images` *(debe ser exactamente este nombre)*.
   - **Public bucket**: **Activa este interruptor (ON)**. Esto permite que las URLs de las fotos de los productos puedan ser leídas directamente por la app móvil y navegadores sin requerir tokens firmados de corta duración.
4. Haz clic en **"Save"**.

---

### 1.4 Obtener las Credenciales de Supabase (`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`)
1. Ve a **Project Settings** > **API**.
2. En la sección **"Project URL"**:
   - Copia la URL: será tu `SUPABASE_URL` (ejemplo: `https://abcdefghijklm.supabase.co`).
3. En la sección **"Project API keys"**:
   - Localiza la fila **`service_role`** (Secret).
   - Haz clic en **"Reveal"** y copia el token JWT. Esta es tu `SUPABASE_SERVICE_ROLE_KEY`.
   - ⚠️ **ADVERTENCIA DE SEGURIDAD**: La clave `service_role` tiene permisos de superadministrador y bypass de RLS (Row-Level Security). **NUNCA** debe incluirse en la app móvil (`mobile/`). Solo debe existir en el entorno del backend (`api/.env` y variables de Render).

---

## 🛠️ Paso 2: Migración Local de la Base de Datos a Supabase (2 minutos)

Una vez que Supabase está activo, ejecutamos la migración inicial con Prisma para crear las tablas relacionales en la nube.

### 2.1 Crear el archivo `api/.env`
Copia el archivo de plantilla a tu entorno local:
```bash
cp api/.env.example api/.env
```
*(En Windows PowerShell: `Copy-Item api/.env.example api/.env`)*

Edita `api/.env` y pega tus valores reales obtenidos en el Paso 1:

```env
# Puerto local
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# Conexión a Base de Datos Supabase (Prisma)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[TU-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[TU-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Autenticación JWT
JWT_SECRET="smartswap_secret_production_key_david_demo_2026_super_secure"

# Supabase Storage & Services
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Inteligencia Artificial (OpenAI)
OPENAI_API_KEY="sk-proj-..."
```

---

### 2.2 Ejecutar la Migración de Esquema
Desde la raíz del monorepo, navega a la carpeta de la API y ejecuta la migración:

```bash
cd api
npx prisma migrate dev --name init
```

**¿Qué hace este comando?**
1. Se conecta a Supabase utilizando la `DIRECT_URL` (puerto 5432).
2. Lee el modelo de datos en `prisma/schema.prisma`.
3. Crea y aplica el script SQL en Supabase, generando las **6 tablas principales**:
   - `User` (perfiles de usuarios, coordenadas geográficas, reputación)
   - `Item` (artículos publicados para trueque, categorías, tags)
   - `ItemImage` (referencias a las URLs almacenadas en el bucket `item-images`)
   - `SwapRoute` (rutas circulares encontradas por el algoritmo)
   - `SwapRouteStep` / `Proposal` (intercambios y estados de confirmación entre usuarios del ciclo)
   - `Notification` (notificaciones push y en app)
4. Genera el cliente tipado de Prisma (`@prisma/client`).

**Verificación rápida:**
Abre el **Table Editor** en el dashboard de Supabase: verás las tablas creadas con sus respectivas columnas, índices y claves foráneas.

---

## 🚀 Paso 3: Despliegue en Render (5 minutos)

El repositorio incluye el archivo de infraestructura como código `render.yaml` en la raíz, que automatiza la creación del servicio.

### 3.1 Desplegar con Render Blueprint (Recomendado)
1. Entra a [dashboard.render.com](https://dashboard.render.com) e inicia sesión (con tu cuenta de GitHub).
2. En el panel principal, haz clic en **"New +"** (arriba a la derecha) y selecciona **"Blueprint"**.
3. Conecta y selecciona tu repositorio de GitHub `SmartSwap`.
4. Render leerá automáticamente el archivo `render.yaml` y detectará:
   - **Service Name**: `smartswap-api`
   - **Runtime**: `node`
   - **Root Directory**: `api`
   - **Plan**: `Free`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm run start:prod`
   - **Health Check Path**: `/api/v1/health`
5. En la pantalla de confirmación, Render te pedirá ingresar los valores para las variables secretas marcadas con `sync: false`:
   - `DATABASE_URL`: Tu cadena con `pooler.supabase.com:6543/postgres?pgbouncer=true`.
   - `DIRECT_URL`: Tu cadena con `pooler.supabase.com:5432/postgres`.
   - `JWT_SECRET`: Un string aleatorio de al menos 32 caracteres.
   - `OPENAI_API_KEY`: Tu clave de OpenAI (`sk-proj-...`).
   - `SUPABASE_URL`: `https://[PROJECT-REF].supabase.co`.
   - `SUPABASE_SERVICE_ROLE_KEY`: Tu clave de servicio copiada de Supabase.
6. Haz clic en **"Apply"**.
7. Render iniciará la compilación y despliegue del contenedor.

*(Nota: Si prefieres crearlo como un "Web Service" manual tradicional en lugar de Blueprint, utiliza exactamente los mismos comandos de Build y Start y copia las variables de entorno una por una en la pestaña Environment).*

---

### 3.2 Verificar el Despliegue en Vivo
Render te asignará una URL pública con formato: `https://smartswap-api.onrender.com` (o similar con sufijo aleatorio).

Verifica ambos endpoints en tu navegador o terminal:

1. **Health Check Probe:**
   ```bash
   curl -i https://<tu-app>.onrender.com/api/v1/health
   ```
   **Respuesta esperada (HTTP 200 OK):**
   ```json
   {
     "status": "ok",
     "info": {
       "uptime": 12.34,
       "timestamp": "2026-10-23T18:15:00.000Z"
     }
   }
   ```

2. **Swagger OpenAPI Documentation:**
   Abre en tu navegador:
   ```
   https://<tu-app>.onrender.com/api/docs
   ```
   Verás la interfaz gráfica interactiva de Swagger UI para probar endpoints de registro, autenticación, items y rutas de intercambio circular.

---

## ⏱️ Paso 4: Mantener Render Despierto con UptimeRobot (2 minutos)

### ¿Por qué es fundamental para la Demo?
En el Free Tier de Render, los servicios web entran en modo de suspensión (**"Spin down"**) tras 15 minutos sin recibir peticiones. Al despertar, tardan entre **45 y 75 segundos** en responder la primera solicitud. Para evitar retrasos o errores de timeout durante la presentación universitaria, UptimeRobot enviará un ping automático cada 10 minutos.

### Configuración en 4 Clics:
1. Crea una cuenta gratuita en [uptimerobot.com](https://uptimerobot.com/).
2. En el Dashboard, haz clic en el botón verde **"+ Add New Monitor"**.
3. Rellena el formulario con los siguientes datos:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `SmartSwap API - Health KeepAlive`
   - **URL (or IP)**: `https://<tu-app>.onrender.com/api/v1/health` *(tu URL real de Render)*
   - **Monitoring Interval**: Cada `10 minutes` (o 5 minutos).
   - **Monitor Timeout**: `30 seconds`.
4. Haz clic en **"Create Monitor"**.

¡Listo! Tu API permanecerá siempre activa en memoria durante toda la demo.

---

## 📱 Paso 5: Conectar la App Móvil a la API en la Nube

Para compilar el frontend conectándose a la nube de Render:

1. En la carpeta `mobile/`, copia la plantilla de entorno:
   ```bash
   cd mobile
   cp .env.example .env
   ```
2. Edita `mobile/.env` y define la URL de producción de Render:
   ```env
   VITE_API_URL=https://<tu-app>.onrender.com/api/v1
   VITE_APP_ENV=production
   ```
3. La configuración es leída de forma tipada y segura por `mobile/src/config/env.ts`:
   ```typescript
   import { env } from '@/config/env';
   console.log('Conectando a:', env.apiUrl);
   ```
4. Regenera el bundle y sincroniza con Android:
   ```powershell
   npm run build
   npx cap sync android
   ```

---

## 🔒 Matriz de Seguridad y Variables de Entorno

| Variable | Descripción | Dónde se Configura | ¿Va en el Frontend? |
|---|---|---|:---:|
| `PORT` | Puerto de la aplicación (3000) | `render.yaml` / `api/.env` | ❌ NUNCA |
| `NODE_ENV` | Entorno de ejecución (`production`) | `render.yaml` / `api/.env` | ❌ NUNCA |
| `CORS_ORIGIN` | Dominios permitidos (`*`) | `render.yaml` / `api/.env` | ❌ NUNCA |
| `DATABASE_URL` | Transaction pooler Supabase (:6543) | Render Dashboard / `api/.env` | ❌ NUNCA |
| `DIRECT_URL` | Conexión directa Supabase (:5432) | Render Dashboard / `api/.env` | ❌ NUNCA |
| `JWT_SECRET` | Firma de tokens JWT | Render Dashboard / `api/.env` | ❌ NUNCA |
| `OPENAI_API_KEY` | Clave API de OpenAI | Render Dashboard / `api/.env` | ❌ NUNCA |
| `SUPABASE_URL` | URL de tu instancia Supabase | Render Dashboard / `api/.env` | ❌ NUNCA |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio / admin Storage | Render Dashboard / `api/.env` | ❌ NUNCA |
| `VITE_API_URL` | URL base de la API backend | `mobile/.env` | ✅ SÍ (Pública) |
| `VITE_APP_ENV` | Entorno del cliente | `mobile/.env` | ✅ SÍ (Pública) |

---

## ✅ Resumen de Comprobación Final

- [ ] Supabase creado y bucket `item-images` configurado como **Public**.
- [ ] Tablas creadas con `npx prisma migrate dev --name init`.
- [ ] `render.yaml` aplicado en Render y estado **Live** en verde.
- [ ] `https://<tu-app>.onrender.com/api/v1/health` responde con HTTP 200.
- [ ] UptimeRobot monitoreando el endpoint `/api/v1/health` cada 10 minutos.
- [ ] `mobile/.env` apuntando a la URL de Render.
