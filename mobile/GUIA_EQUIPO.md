# Guía del Equipo SmartSwap — Build & Demo Android (v2.4)

Esta guía detalla el procedimiento oficial para compilar, sincronizar, generar el APK debug nativo, instalarlo en dispositivos físicos o emuladores Android y ejecutar los flujos clave de la presentación universitaria.

---

## 1. Cómo Regenerar el APK desde Cero

Desde la raíz del proyecto (`SmartSwap/`), ejecuta en PowerShell:

```powershell
# 1. Limpieza y compilación del bundle web
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm run build

# 2. Sincronización de assets web y plugins nativos a Android
npx cap sync android

# 3. Compilación del APK nativo con Gradle
cd android
.\gradlew.bat assembleDebug
cd ..

# 4. Copia del APK al directorio release
if (-not (Test-Path release)) { New-Item -ItemType Directory -Path release -Force }
Copy-Item android/app/build/outputs/apk/debug/app-debug.apk release/SmartSwap-debug-v2.4.apk -Force
```

El APK compilado queda listo en:
`release/SmartSwap-debug-v2.4.apk` (~7.72 MB).

---

## 2. Cómo Instalar el APK en un Teléfono Android

### Método A: Instalación Automática vía Cable USB (ADB)
1. Conecta el teléfono a la PC mediante cable USB.
2. Verifica que el dispositivo sea reconocido:
   ```powershell
   adb devices
   ```
   *(Debe aparecer el ID de tu dispositivo y el estado `device`).*
3. Instala reemplazando cualquier versión anterior:
   ```powershell
   adb install -r release/SmartSwap-debug-v2.4.apk
   ```
4. Inicia la app automáticamente:
   ```powershell
   adb shell monkey -p com.smartswap.app 1
   ```

### Método B: Instalación Manual Directa
1. Envía el archivo `release/SmartSwap-debug-v2.4.apk` a tu teléfono (vía Google Drive, WhatsApp, Telegram, cable MTP o email).
2. Abre el **Administrador de Archivos** o la app de descargas en tu teléfono.
3. Toca sobre el archivo `SmartSwap-debug-v2.4.apk`.
4. Si Android solicita permisos, habilita **"Permitir la instalación de apps de orígenes desconocidos"**.
5. Si aparece la advertencia de Google Play Protect ("Desarrollador desconocido"), pulsa en **"Más detalles"** y luego en **"Instalar de todas formas"**.

---

## 3. Guía de Solución de Problemas (Troubleshooting)

### ⚠️ 1. Pantalla en blanco (Blank Screen)
- **Causa**: Error de sintaxis en runtime o rutas absolutas incorrectas en el bundle web.
- **Solución**:
  - Abre Google Chrome en tu PC y navega a `chrome://inspect/#devices`.
  - Con el teléfono conectado por USB, busca `SmartSwap (com.smartswap.app)` y haz clic en **Inspect**.
  - Revisa la consola de JavaScript para identificar cualquier excepción no capturada.
  - Asegúrate de haber ejecutado `npm run build` y `npx cap sync android` antes de `assembleDebug`.

### ⚠️ 2. Comando `adb` no encontrado (`adb: The term 'adb' is not recognized`)
- **Causa**: Android Platform Tools no está en el `PATH` del sistema.
- **Solución**:
  - En PowerShell, añade temporalmente el path del SDK:
    ```powershell
    $env:PATH += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
    ```
  - O agrégalo permanentemente en Variables de Entorno de Windows:
    `C:\Users\<TuUsuario>\AppData\Local\Android\Sdk\platform-tools`.

### ⚠️ 3. El teléfono no aparece en `adb devices`
- **Causa**: Depuración USB inactiva o falta de autorización RSA.
- **Solución**:
  1. En el teléfono: ve a **Ajustes > Acerca del teléfono** y pulsa 7 veces consecutivas sobre **"Número de compilación"** para activar las Opciones de Desarrollador.
  2. Ve a **Ajustes > Opciones de desarrollador** y activa **"Depuración por USB"**.
  3. Desconecta y vuelve a conectar el cable USB.
  4. Al conectarlo, cambia el modo USB en la notificación de "Solo carga" a **"Transferencia de archivos (MTP)"**.
  5. En la pantalla del teléfono aparecerá una ventana emergente: **"¿Permitir depuración por USB?"**; marca la casilla *"Permitir siempre desde este equipo"* y presiona **Permitir**.

### ⚠️ 4. Errores de Gradle o Java (`JAVA_HOME`, incompatibilidad de SDK)
- **Causa**: Versión incorrecta de Java o Daemons de Gradle en conflicto.
- **Solución**:
  - SmartSwap requiere Java 17 o Java 21 (incluido en Android Studio JBR).
  - Configura tu terminal:
    ```powershell
    $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
    ```
  - Detén Daemons bloqueados y limpia la caché:
    ```powershell
    cd android
    .\gradlew.bat --stop
    .\gradlew.bat clean
    cd ..
    ```

### ⚠️ 5. "App no instalada" o "Conflicto de firma"
- **Causa**: Ya existe una versión instalada con diferente firma o compilación previa corrupta.
- **Solución**:
  - Desinstala primero la versión anterior desde el móvil o mediante terminal:
    ```powershell
    adb uninstall com.smartswap.app
    ```
  - Asegúrate de contar con al menos 100 MB de espacio de almacenamiento disponible en el dispositivo.

---

## 4. Checklist de Demostración para la Presentación Universitaria

### 📱 Flujo 1: Descubrimiento y Propuesta de Ruta Circular (Flujo Principal)
1. **Inicio de sesión**: Abre SmartSwap; observa el Splash animado `#00685f` (logo con rebote elástico). Presiona "Ingresar en Modo Demo".
2. **Feed Principal (Home)**: Observa la tarjeta de "Cadena Circular Activa" (Bicicleta → Balón → Audífonos → Cámara).
3. **Configurar Canje**: Toca el banner de canje o pulsa "Canjear".
   - Paso 1: Confirma tu artículo ofrecido (Bicicleta Trek Marlin 7).
   - Paso 2: Selecciona el preset o busca "Cámara Fujifilm".
   - Observa la barra de compatibilidad de valor ($0 en dinero).
4. **Búsqueda Circular (Searching)**: Toca "Buscar Rutas Circulares". Se muestra la animación radar de nodos SmartSwap buscando participantes.
5. **Resultados de Ruta**: Revisa las 3 rutas encontradas con ahorro ecológico calculado (kg CO₂ ahorrados). Selecciona la ruta recomendada de 3 pasos.
6. **Detalle de Ruta**: Examina el diagrama paso a paso de custodia protegida P2P.
7. **Confirmación**: Acepta los términos de custodia temporal y pulsa "Enviar Propuesta". Aparece la confirmación con checkmark animado.

### 📱 Flujo 2: Catálogo con Preselección
1. Navega a la pestaña **Explorar** en el Bottom Navigation.
2. Filtra por categorías (Tecnología, Deportes, Fotografía).
3. Selecciona un artículo deseado (ej. *Cámara Sony Alpha* o *Nintendo Switch*).
4. Presiona el botón **"Proponer"** de la tarjeta: observa cómo se precarga automáticamente en el formulario de configuración de canje.

### 📱 Flujo 3: Publicación de Nuevo Artículo
1. Presiona el botón flotante central **"+" (Publicar)** en la barra de navegación inferior.
2. Completa los datos: título, fotos sugeridas, categoría y condición.
3. Especifica qué artículos estarías dispuesto a recibir a cambio (wants).
4. Publica el artículo y verifica que se liste en la pestaña **Mi Perfil**.

### 📱 Extras de Pulido de UI
- **Modo Oscuro**: Pulsa el icono de Sol/Luna en la barra superior (`TopBar`). Todo el sistema de variables CSS semánticas conmuta automáticamente sin recargar la app.
- **Navegación Nativa Android**: En pantallas secundarias (Configurar, Detalles, Resultados, Perfil, Notificaciones), presiona el **botón físico / gesto "Atrás"** de Android; verifica que regresa a la pantalla previa de la app sin cerrarla abruptamente.
