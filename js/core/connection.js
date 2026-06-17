/**
 * ColloquiTeam · core/connection.js
 * -------------------------------------------------------------------
 * Bootstrap connessione Firebase + indicatore visuale di stato.
 *
 * IMPORTANTE: aspetto che Firebase Auth determini lo stato iniziale
 * (persistenza da IndexedDB o redirect Microsoft appena tornato) PRIMA
 * di considerare l'anonymous boot bridge. Altrimenti signInAnonymously
 * sovrascriverebbe la sessione Microsoft fresca dal redirect.
 *
 * Anonymous boot bridge:
 *   - le Security Rules permettono ai soli autenticati di leggere /users
 *   - se non c'è una sessione cached/redirect, signInAnonymously dà il
 *     minimo permesso necessario per leggere /users (per il match email→slug)
 *   - quando l'utente clicca Microsoft, signInWithRedirect sostituisce l'anon
 */
window.Connection = {
  async init() {
    this.setStatus('connecting', 'Connessione…');
    try {
      await window.firebaseReady;

      // ⚠ Aspetto che Firebase Auth determini lo stato iniziale (IndexedDB
      // load + redirect result). onAuthStateChanged "one-shot" è il modo
      // ufficiale di sapere quando questo è completo.
      await new Promise(function (resolve) {
        const unsub = window.firebaseAuth.onAuthStateChanged(function () {
          unsub();
          resolve();
        });
      });

      const existing = window.firebaseAuth.currentUser;
      if (!existing) {
        // Nessuna sessione: anon boot bridge per poter leggere /users
        const cred = await window.firebaseAuth.signInAnonymously();
        console.log('[Connection] boot bridge anonymous, uid:', cred.user.uid);
      } else if (existing.isAnonymous) {
        console.log('[Connection] anon cached, uid:', existing.uid);
      } else {
        console.log('[Connection] sessione Microsoft persistita:', existing.email);
      }

      window.Storage.online = true;
      const u0 = window.firebaseAuth.currentUser;
      const tag0 = (u0 && !u0.isAnonymous) ? (u0.email || u0.uid.slice(0, 8)) : 'anon';
      this.setStatus('connected', 'Online · ' + tag0);

      window.firebaseAuth.onAuthStateChanged(function (user) {
        if (!user) {
          window.Storage.online = false;
          window.Connection.setStatus('offline', 'Disconnesso');
          return;
        }
        window.Storage.online = true;
        const tag = user.isAnonymous ? 'anon' : (user.email || user.uid.slice(0, 8));
        window.Connection.setStatus('connected', 'Online · ' + tag);
      });

      window.addEventListener('online',  function () { window.Connection.setStatus('connected', 'Online'); });
      window.addEventListener('offline', function () { window.Connection.setStatus('offline', 'Offline · cache locale'); });
    } catch (err) {
      window.Storage.online = false;
      this.setStatus('error', 'Errore Firebase');
      console.error('[Connection] init fallita:', err);
    }
  },

  setStatus(kind, label) {
    const el = document.getElementById('fbStatus');
    if (!el) return;
    el.className = 'fb-status ' + kind;
    el.querySelector('.fb-label').textContent = label;
  }
};
