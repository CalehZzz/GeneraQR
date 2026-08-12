# GeneraQR

Generador de códigos QR gratis en el navegador, con plantillas creativas y **QR dinámicos** (Firebase).

## Estructura

| Archivo | Rol |
|---------|-----|
| `index.html` | Marcado de la app |
| `css/styles.css` | Estilos |
| `js/app.js` | Diseñador + plantillas creativas |
| `js/generaqr-firebase.js` | Auth, Firestore, QR dinámicos, galería de logos |
| `js/qr-render.js` | Render del QR compartido por Diseñador, plantillas y panel dinámico |
| `js/dynamic-qr-panel.js` | UI del panel dinámico |
| `js/save-file.js` | Guardado de archivos (iOS/Android incluidos) |
| `js/image-store.js` | Compresión WebP de logos antes de subirlos |
| `js/redirect.js` + `d.html` / `404.html` | Redirección de enlaces cortos |
| `firebase-config.js` | Claves del proyecto Firebase |

## Modos

- **Diseñador QR** — personaliza colores, formas y logo (sin tope de tamaño); descarga PNG/SVG con el nombre que elijas; incluye contacto (vCard). Los diseños y los logos guardados van a tu cuenta si inicias sesión con Google.
- **Plantillas creativas** — diseños listos para editar. Sin cuenta.
- **QR dinámico** — enlace corto fijo, página intermedia opcional, destino editable, estadísticas con gráfico (14 días) y versiones al cambiar la URL. Requiere Google + Firebase.

## Configurar Firebase

Sigue la guía completa: **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)**.

Resumen:

1. Crea app Web en Firebase y pega la config en `firebase-config.js`
2. Activa Authentication → Google y añade `generaqr.xyz` a dominios autorizados
3. Crea Firestore y publica `firestore.rules`
4. Crea los índices compuestos `ownerId` + fecha en `dynamicQrs`, `versions`, `designPresets` y `logoAssets` (el error de consola incluye el enlace)

## Descargas en móvil

En iPhone un enlace con `download` y un `data:` URL no guarda nada. Las descargas
usan `Blob` y, en móvil, la hoja de compartir del sistema para permitir
**Guardar en Fotos** o **Guardar en Archivos**.

## Enlaces cortos

Los QR dinámicos usan `https://generaqr.xyz/r/CODIGO`. En GitHub Pages, `404.html` registra el escaneo y redirige.

La página de escaneo habla directamente con la **API REST de Firestore** en lugar de cargar el SDK: son ~400 KB menos y un solo viaje para leer el destino. El +1 del contador se envía con `navigator.sendBeacon`, que el navegador entrega aunque la página ya haya navegado — antes la escritura se abortaba al redirigir y algunos escaneos se perdían.
