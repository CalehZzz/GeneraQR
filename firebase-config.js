/**
 * Configuración de Firebase para GeneraQR.
 *
 * 1. Abre Firebase Console → Project settings → Your apps → Web app
 * 2. Copia el objeto firebaseConfig y pégalo abajo
 * 3. Asegúrate de completar también los pasos de FIREBASE_SETUP.md
 *
 * Este archivo es público (está en el frontend). La seguridad real
 * la dan las reglas de Firestore y Authentication, no ocultar estas claves.
 */
window.FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT_ID.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT_ID.appspot.com",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

/** Dominio público del sitio (sin barra final). Se usa para armar el enlace corto del QR. */
window.GENERQR_PUBLIC_ORIGIN = "https://generaqr.xyz";
