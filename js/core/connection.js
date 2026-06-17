console.log('[load] connection');
/**
 * ColloquiTeam · core/connection.js
 * Bootstrap connessione Firebase + indicatore visuale.
 * Versione originale: signInAnonymously al boot.
 */
window.Connection = {
  async init() {
    this.setStatus('connecting', 'Connessione…');
    try {
      await window.firebaseReady;
      const cred = await window.firebaseAuth.signInAnonymously();
      window.Storage.online = true;
      this.setStatus('connected', 'Online · ' + cred.user.uid.slice(0, 8));
      console.log('[Connection] auth anonima ok, uid:', cred.user.uid);

      window.firebaseAuth.onAuthStateChanged(function (user) {
        if (!user) {
          window.Storage.online = false;
          window.Connection.setStatus('offline', 'Disconnesso');
        }
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
