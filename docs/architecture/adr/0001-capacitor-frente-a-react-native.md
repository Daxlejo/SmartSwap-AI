# ADR-0001: Capacitor frente a React Native

**Estado:** aceptada · **Fecha:** noviembre de 2026

## Contexto
El equipo necesitaba entregar un APK Android en pocas semanas. El cliente ya existía como app React 18 + Vite + Tailwind (`mobile/src`), y del lado nativo solo hacen falta ubicación (`@capacitor/geolocation`), botón atrás y ciclo de vida (`@capacitor/app`), además de seleccionar fotos, que se resuelve con un `<input type="file">` del WebView, sin plugin.

## Decisión
Empaquetar la app web con **Capacitor 8** (`mobile/capacitor.config.ts`, proyecto nativo en `mobile/android`) y no reescribirla en React Native.

## Consecuencias
- **A favor:** un solo código de UI con Tailwind y los mismos tests de Vitest. Se puede iterar en el navegador con `npm run dev:mobile` y el APK sale con `npx cap sync android` + `gradlew assembleDebug`. Además, la auditoría de accesibilidad de la Fase 2 (Playwright + axe-core) corre sobre la misma UI que se empaqueta.
- **En contra:** la UI corre en un WebView: las animaciones y el scroll son algo menos fluidos que en una app nativa. El comportamiento nativo (barra de estado, zonas seguras, botón atrás, teclado) hay que resolverlo a mano (Fase 4). La app depende de la versión del WebView del sistema en celulares viejos.
- **Descartado:** React Native obligaba a reescribir todas las pantallas sin Tailwind web ni el DOM, y a montar una segunda cadena de build. No era viable en la ventana de entrega.
