console.log('[load] connection');
window.Connection = {
  async init() {
    this.setStatus('connecting', 'Connessione…');
    try {
      await Promise.race([
        window.firebaseReady,
        new Promise((_, rej) => setTimeout(() => rej(new Error('firebaseReady timeout 8s')), 8000))
      ]);
      console.log('[Connection] firebaseReady ok');

      const t0 = performance.now();
      console.log('[Connection] signInAnonymously avvio... t0=0');

      // Promise originale di Firebase: NON la awaitiamo direttamente.
      // La osserviamo in background per capire se EVENTUALMENTE risponde,
      // anche dopo che il nostro timeout l'ha "abbandonata".
      const signInPromise = window.firebaseAuth.signInAnonymously();
      signInPromise
        .then(cred => console.log('[Connection POST] anon OK dopo', Math.round(performance.now()-t0), 'ms, uid:', cred.user.uid))
        .catch(err => console.error('[Connection POST] anon FAILED dopo', Math.round(performance.now()-t0), 'ms:', err.code || err.message, err));

      const slowWarn = setTimeout(() => console.warn('[Connection] anon >3s, sto aspettando...'), 3000);
      try {
        const cred = await Promise.race([
          signInPromise,
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 15s')), 15000))
        ]);
        clearTimeout(slowWarn);
        console.log('[Connection] anon ok subito:', Math.round(performance.now()-t0), 'ms');
        window.Storage.online = true;
        this.setStatus('connected', 'Online · ' + cred.user.uid.slice(0, 8));
      } catch (err) {
        clearTimeout(slowWarn);
        console.warn('[Connection] anon timeout, ma la promise reale è ancora viva (vedrai [POST] quando risponde)');
        this.setStatus('error', 'Auth tardiva');
      }

      window.firebaseAuth.onAuthStateChanged(function (user) {
        if (!user) {
          window.Storage.online = false;
          window.Connection.setStatus('offline', 'Disconnesso');
        } else {
          window.Storage.online = true;
          window.Connection.setStatus('connected', 'Online · ' + (user.uid || '').slice(0, 8));
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
