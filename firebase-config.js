/**
 * Configuración de Firebase para GeneraQR.
 *
 * Este archivo es público (está en el frontend). La seguridad real
 * la dan las reglas de Firestore y Authentication, no ocultar estas claves.
 */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCDxv2JVJMoJf6Phho72mq-pYYWF3JneJc",
  authDomain: "generaqr-91499.firebaseapp.com",
  projectId: "generaqr-91499",
  storageBucket: "generaqr-91499.firebasestorage.app",
  messagingSenderId: "397343288725",
  appId: "1:397343288725:web:9bb4b10770e30a49d21a9c",
  measurementId: "G-C4D6VGLPL6"
};

/** Dominio público del sitio (sin barra final). Se usa para armar el enlace corto del QR. */
window.GENERQR_PUBLIC_ORIGIN = "https://generaqr.xyz";
