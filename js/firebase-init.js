/**
 * ColloquiTeam · firebase-init.js  (Firebase v9 Compat SDK)
 * -------------------------------------------------------------------
 * Usa la libreria *compat* di Firebase v9 (script globale, niente
 * `import`). Questo permette di caricare l'app sia da file:// (test
 * locali con doppio click) sia da https://… (GitHub Pages) senza
 * problemi di CORS sui moduli ES.
 *
 * Dipendenze caricate in <head> PRIMA di questo file:
 *   firebase-app-compat.js
 *   firebase-database-compat.js
 *   firebase-auth-compat.js
 *
 * API esposta su window (interfaccia stabile, identica a v9 modular):
 *   window.firebaseDB    → { ref, get, set, update, remove, onValue }
 *   window.firebaseAuth  → { signInAnonymously, onAuthStateChanged, auth }
 * Tutte le firme ritornano Promise dove serve, così storage.js non cambia.
 */

(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyCIbB3mrTPjtXSypMTzx3StVTIoaBefyEA",
    authDomain: "area-ccm-colloqui-personali.firebaseapp.com",
    databaseURL: "https://area-ccm-colloqui-personali-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "area-ccm-colloqui-personali",
    storageBucket: "area-ccm-colloqui-personali.firebasestorage.app",
    messagingSenderId: "43050438178",
    appId: "1:43050438178:web:d97be4c717a4fdcebd847b"
  };

  if (typeof firebase === 'undefined') {
    console.error('[Firebase] SDK compat non caricato. Verificare gli script in <head>.');
    return;
  }

  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  const auth = firebase.auth();

  // Adapter: la API compat usa metodi sul Reference (ref.get(), ref.set(...)).
  // La esponiamo wrappata per mantenere la stessa firma usata da storage.js
  // (funzioni standalone get(ref), set(ref, data), …) — così se in futuro
  // tornassimo a modular, basta cambiare questo file.
  window.firebaseDB = {
    ref:    (p)         => database.ref(p),
    get:    (ref)       => ref.get(),                    // Promise<DataSnapshot>
    set:    (ref, data) => ref.set(data),                // Promise<void>
    update: (ref, data) => ref.update(data),             // Promise<void>
    remove: (ref)       => ref.remove(),                 // Promise<void>
    onValue:(ref, cb)   => { ref.on('value', cb); return () => ref.off('value', cb); }
  };

  window.firebaseAuth = {
    signInAnonymously:    () => auth.signInAnonymously(),
    onAuthStateChanged:   (cb) => auth.onAuthStateChanged(cb),
    auth
  };

  window._firebaseReadyResolve();
  console.log('[Firebase] Compat SDK pronto, progetto:', firebaseConfig.projectId);
})();
