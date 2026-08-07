# GeneraQR

Generador de códigos QR gratis en el navegador, con plantillas creativas y **QR dinámicos** (Firebase).

## Modos

- **Diseñador QR** — personaliza colores, formas y logo; descarga PNG. Sin cuenta.
- **Plantillas creativas** — diseños listos para editar. Sin cuenta.
- **QR dinámico** — enlace corto fijo, destino editable, estadísticas (hoy / mes / total) y versiones al cambiar la URL. Requiere Google + Firebase.

## Configurar Firebase

Sigue la guía completa: **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)**.

Resumen:

1. Crea app Web en Firebase y pega la config en `firebase-config.js`
2. Activa Authentication → Google y añade `generaqr.xyz` a dominios autorizados
3. Crea Firestore y publica `firestore.rules`
4. Crea el índice compuesto `ownerId` + `updatedAt` en `dynamicQrs` (el error de consola incluye el enlace)

## Enlaces cortos

Los QR dinámicos usan `https://generaqr.xyz/r/CODIGO`. En GitHub Pages, `404.html` reenvía esa ruta a `d.html`, que registra el escaneo y redirige.
