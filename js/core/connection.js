/**
 * ColloquiTeam · core/connection.js
 * -------------------------------------------------------------------
 * Bootstrap connessione Firebase + indicatore visuale di stato.
 *
 * Ordine CRITICO:
 *   1. await firebaseReady
 *   2. await getRedirectResult()  ← se torno da Microsoft, qui Firebase
 *      processa il credenziale e currentUser diventa l'utente Microsoft.
 *      DEVE essere chiamato PRIMA di qualsiasi onAuthStateChanged listener,
 *      altrimenti l'utente anonimo cached vince e Microsoft viene perso.
 *   3. controllo currentUser:
 *      - se Microsoft attivo → lascio così
 *      - se anon cached     → lascio così
 *      - se nessuno         → signInAnonymously (boot bridge per /users)
 */
window.Connection = {
  async init() {
    this.setStatus('connecting', 'Connessione…');
    try {
      await window.firebaseReady;

      // 1) Captura eventuale credenziale Microsoft appena tornato da redirect.
      //    Importante: questo è il primo touch di firebase.auth(), così
      //    Firebase processa il pending OAuth PRIMA di settle su altri user.
      try {
        const r = await window.firebaseAuth.getRedirectResult();
        if (r && r.user) {
          console.log('[Connection] redirect Microsoft capturato:', r.user.email);
        }
      } catch (err) {
        console.warn('[Connection] getRedirectResult error:', err.code, err.message);
      }

      // 2) Stato finale auth dopo redirect processing
      const existing = window.firebaseAuth.currentUser;
      if (!existing) {
        const cred = await window.firebaseAuth.signInAnonymously();
        console.log('[Connection] boot bridge anonymous, uid:', cred.user.uid);
      } else if (existing.isAnonymous) {
        console.log('[Connection] anon cached, uid:', existing.uid);
      } else {
        console.log('[Connection] sessione Microsoft:', existing.email);
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
