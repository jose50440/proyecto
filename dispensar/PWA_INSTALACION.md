# Instalación PWA - IHSS A TU CASA

La app está configurada como **PWA (Progressive Web App)** descargable en Android e iOS.

## Android
- Abre la app en **Chrome**
- Aparecerá un banner "Instalar app" o "Agregar a pantalla de inicio"
- O bien: menú (⋮) → **Instalar app** / **Agregar a pantalla de inicio**

## iOS (iPhone/iPad)
- Abre la app en **Safari** (no en Chrome)
- Toca el botón **Compartir** (cuadrado con flecha hacia arriba)
- Selecciona **"Agregar a pantalla de inicio"**
- **No se requiere cuenta de Apple ni verificación** para añadirla al inicio

## Requisitos
- La app debe servirse por **HTTPS** (o localhost en desarrollo)
- En producción, asegúrate de que el servidor entregue los archivos: `manifest.webmanifest`, `sw.js`, `icons/icon.svg`

## Archivos PWA
- `manifest.webmanifest` – nombre, iconos, tema, modo pantalla completa
- `sw.js` – service worker para caché y modo offline básico
- `icons/icon.svg` – icono local de respaldo
- Logo IHSS del login usado como icono principal
