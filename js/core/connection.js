/**
 * ColloquiTeam · core/connection.js
 * -------------------------------------------------------------------
 * Bootstrap connessione Firebase + indicatore visuale di stato.
 * Esegue signInAnonymously (richiesto dalle rules auth != null),
 * gestisce eventi online/offline del browser e fa drop a "Errore"
 * se Firebase auth fallisce.
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

      window.firebaseAuth.onAuthStateChanged((user) => {
        if (!user) {
          window.Storage.online = false;
          window.Connection.setStatus('offline', 'Disconnesso');
        }
      });

      window.addEventListener('online',  () => window.Connection.setStatus('connected', 'Online'));
      window.addEventListener('offline', () => window.Connection.setStatus('offline', 'Offline · cache locale'));
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
