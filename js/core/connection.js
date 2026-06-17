console.log('[load] connection');
window.Connection = {
  async init() {
    this.setStatus('connecting', 'Connessione…');
    try {
      // firebaseReady ha già il log dell'SDK pronto. Se non risolve in 8s c'è
      // un problema infrastrutturale (CDN giù?), worth segnalare.
      await Promise.race([
        window.firebaseReady,
        new Promise((_, rej) => setTimeout(() => rej(new Error('firebaseReady timeout 8s')), 8000))
      ]);
      console.log('[Connection] firebaseReady ok');

      // signInAnonymously: in Europa di solito risponde in <1s, ma con cold-start
      // o iframe block può arrivare a 10-15s. Diamo margine di 30s e logghiamo
      // anche dopo 3s per non lasciare l'utente a guardare il vuoto.
      console.log('[Connection] signInAnonymously avvio... (max 30s)');
      const slowWarn = setTimeout(() => console.warn('[Connection] signInAnonymously >3s, sto aspettando...'), 3000);
      try {
        const cred = await Promise.race([
          window.firebaseAuth.signInAnonymously(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 30s')), 30000))
        ]);
        clearTimeout(slowWarn);
        console.log('[Connection] auth anonima ok, uid:', cred.user.uid);
        window.Storage.online = true;
        this.setStatus('connected', 'Online · ' + cred.user.uid.slice(0, 8));
      } catch (err) {
        clearTimeout(slowWarn);
        console.error('[Connection] signInAnonymously fallita:', err.code || err.message, err);
        this.setStatus('error', 'Auth fallita');
      }

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
      console.error('[Connection] init fallita:', err.message);
    }
  },
  setStatus(kind, label) {
    const el = document.getElementById('fbStatus');
    if (!el) return;
    el.className = 'fb-status ' + kind;
    el.querySelector('.fb-label').textContent = label;
  }
};
