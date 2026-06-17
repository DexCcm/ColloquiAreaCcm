console.log('[load] connection');
window.Connection = {
  async init() {
    this.setStatus('connecting', 'Connessione…');
    const withTimeout = (p, ms, label) =>
      Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout:' + label)), ms))]);

    try {
      await withTimeout(window.firebaseReady, 5000, 'firebaseReady');
      console.log('[Connection] firebaseReady ok');

      try {
        const cred = await withTimeout(window.firebaseAuth.signInAnonymously(), 5000, 'signInAnonymously');
        console.log('[Connection] auth anonima ok, uid:', cred.user.uid);
        window.Storage.online = true;
        this.setStatus('connected', 'Online · ' + cred.user.uid.slice(0, 8));
      } catch (err) {
        console.error('[Connection] signInAnonymously fallita:', err.message);
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
