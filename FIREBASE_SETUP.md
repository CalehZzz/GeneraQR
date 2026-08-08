# Configuración de Firebase para QR dinámicos

GeneraQR usa **Firebase Authentication (Google)** y **Cloud Firestore** para:

- **QR dinámicos**: enlace corto fijo (`https://generaqr.xyz/r/CODIGO`), destino editable, estadísticas (hoy / mes / total) y versiones al cambiar la URL
- **Diseños guardados por cuenta**: colores/formas del diseñador sincronizados al iniciar sesión con Google

---

## 1. Proyecto Firebase

1. Entra en [Firebase Console](https://console.firebase.google.com/).
2. Abre (o crea) tu proyecto.
3. Añade una app **Web** (ícono `</>`).
4. Copia el objeto `firebaseConfig` que te muestra.

## 2. Pegar la configuración en el código

Edita el archivo [`firebase-config.js`](./firebase-config.js) y sustituye los valores `TU_…`:

```js
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

window.GENERQR_PUBLIC_ORIGIN = "https://generaqr.xyz";
```

Si pruebas en local, puedes poner temporalmente `http://localhost:PORT` en `GENERQR_PUBLIC_ORIGIN` (o dejar el dominio de producción: el enlace corto del QR debe ser el dominio público real).

## 3. Authentication → Google

1. Firebase Console → **Build → Authentication → Get started**.
2. Pestaña **Sign-in method** → habilita **Google**.
3. Elige un correo de soporte del proyecto y guarda.
4. Ve a **Authentication → Settings → Authorized domains** y asegúrate de tener:
   - `localhost` (pruebas)
   - `generaqr.xyz`
   - `www.generaqr.xyz` (si lo usas)
   - El dominio `*.github.io` de Pages si aplica

Sin el dominio autorizado, el login con Google falla con `auth/unauthorized-domain`.

## 4. Cloud Firestore

1. **Build → Firestore Database → Create database**.
2. Elige modo de producción (luego publicamos reglas) y una región cercana (p. ej. `nam5` o `southamerica-east1`).
3. Publica las reglas del archivo [`firestore.rules`](./firestore.rules):
   - En la consola: **Firestore → Rules** → pega el contenido → **Publish**
   - O con CLI: `firebase deploy --only firestore:rules`

### Qué hacen las reglas

| Acción | Quién |
|--------|--------|
| Crear / editar / listar tus QR | Usuario autenticado (dueño) |
| Leer un QR por código (redirección) | Público (`get`) |
| Sumar +1 escaneo en la versión actual | Público, solo campos de contador |
| Ver historial de versiones | Solo el dueño |

## 5. Índice compuesto (obligatorio para el listado)

La consulta “mis QR ordenados por fecha” necesita un índice:

- Colección: `dynamicQrs`
- Campos: `ownerId` Ascending + `updatedAt` Descending

La primera vez que abras el panel, si falta el índice, la consola del navegador mostrará un **enlace directo** para crearlo en un clic. Ábrelo y espera a que el índice quede en estado *Enabled*.

También puedes crearlo en **Firestore → Indexes**.

Para el historial de versiones hará falta otro índice de colección de grupo o por subcolección:

- Colección: `versions` (bajo `dynamicQrs/{id}/versions`)
- Campos: `ownerId` Ascending + `createdAt` Descending

De nuevo, el enlace del error en la consola del navegador es la forma más rápida de crearlo.

Para los **diseños guardados por cuenta** (pestaña Descargar → Guardar diseño):

- Colección: `designPresets`
- Campos: `ownerId` Ascending + `updatedAt` Descending

Al iniciar sesión, los diseños que tenías solo en el navegador se migran una vez a tu cuenta.

## 6. Google Cloud / OAuth (pantalla de consentimiento)

Si Google te pide configurar la pantalla OAuth:

1. [Google Cloud Console](https://console.cloud.google.com/) → el mismo proyecto.
2. **APIs & Services → OAuth consent screen**.
3. Tipo **External** (o Internal si es Workspace).
4. Nombre de la app, email de soporte, y en **Authorized domains** añade `generaqr.xyz`.
5. En modo Testing, añade tu Gmail como **Test user** hasta publicar la app.

## 7. Cómo funciona el QR dinámico

1. Inicias sesión con Google en la pestaña **QR dinámico**.
2. Creas un QR con nombre + URL de destino.
3. Obtienes un enlace corto fijo: `https://generaqr.xyz/r/Ab12Cd34`.
4. Ese enlace es el que codificas/imprimas en el QR.
5. Al escanearlo:
   - GitHub Pages sirve `404.html` para `/r/...`
   - Se reenvía a `d.html?c=...`
   - Se registra el escaneo en Firestore
   - Se redirige a la URL actual
6. Si **cambias el destino**, el código corto **no cambia**, pero se cierra la versión anterior y se abre una nueva con contadores en cero. El historial de versiones conserva las estadísticas viejas.

### Estadísticas

Por cada versión del enlace:

- **Hoy** — escaneos del día (zona horaria del dispositivo que registra)
- **Mes** — suma de los días del mes actual
- **Total** — escaneos de esa versión
- **Histórico** — suma de todas las versiones del mismo código

## 8. Archivos importantes

| Archivo | Rol |
|---------|-----|
| `firebase-config.js` | Tus claves del proyecto |
| `firestore.rules` | Reglas de seguridad (publicar en Firebase) |
| `js/generaqr-firebase.js` | Auth + CRUD + registro de escaneos |
| `js/dynamic-qr-panel.js` | UI del panel |
| `d.html` + `js/redirect.js` | Redirección y contador |
| `404.html` | Enlaces cortos `/r/CODIGO` en GitHub Pages |

## 9. Checklist rápido

- [ ] App Web creada y config pegada en `firebase-config.js`
- [ ] Authentication con proveedor Google activo
- [ ] Dominios autorizados (`generaqr.xyz`, `localhost`)
- [ ] Firestore creado
- [ ] Reglas de `firestore.rules` publicadas
- [ ] Índices: `dynamicQrs`, `versions` y `designPresets` (ownerId + fecha)
- [ ] OAuth consent screen / usuarios de prueba si aplica
- [ ] Probar: login → crear QR → abrir `/r/CODIGO` → ver +1 en estadísticas → cambiar URL → ver versión nueva en cero
- [ ] Probar: login → Guardar diseño → cerrar sesión / otro dispositivo → ver el mismo diseño

## 10. Notas de seguridad

Las claves del `firebaseConfig` son públicas en el frontend; eso es normal. La protección real son:

1. Authentication (quién puede crear/editar)
2. Reglas de Firestore (qué puede leer/escribir cada uno)

Para un volumen muy alto de escaneos, lo ideal a medio plazo es mover el `increment` a una **Cloud Function** callable/HTTP; con el tráfico típico de un generador personal, el conteo en cliente + reglas restringidas es suficiente.
