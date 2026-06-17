console.log('[load] connection');
/**
 * ColloquiTeam · core/connection.js
 * Bootstrap connessione + indicatore. Con TIMEOUT su tutti gli await
 * per evitare hang infiniti su mobile/ITP.
 */
window.Connection = {
  async init() {
    console.log('[Connection] init() start');
    this.setStatus('connecting', 'Connessione…');

    const withTimeout = (p, ms, label) =>
      Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout:' + label)), ms))
      ]);

    try {
      console.log('[Connection] await firebaseReady...');
      await withTimeout(window.firebaseReady, 5000, 'firebaseReady');
      console.log('[Connection] firebaseReady ok');

      // 1) getRedirectResult con timeout
      try {
        console.log('[Connection] getRedirectResult...');
        const r = await withTimeout(firebase.auth().getRedirectResult(), 5000, 'getRedirectResult');
        if (r && r.user) {
          console.log('[Connection] redirect Microsoft capturato:', r.user.email);
        } else {
          console.log('[Connection] getRedirectResult vuoto');
        }
      } catch (err) {
        console.warn('[Connection] getRedirectResult error/timeout:', err.message);
      }

      // 2) Stato finale
      const existing = firebase.auth().currentUser;
      console.log('[Connection] currentUser dopo redirect:', existing ? (existing.isAnonymous ? 'anon ' + existing.uid.slice(0,8) : existing.email) : 'null');

      if (!existing) {
        try {
          console.log('[Connection] signInAnonymously...');
          const cred = await withTimeout(window.firebaseAuth.signInAnonymously(), 5000, 'signInAnonymously');
          console.log('[Connection] boot bridge anonymous, uid:', cred.user.uid);
        } catch (err) {
          console.error('[Connection] signInAnonymously fallito:', err.message);
        }
      } else if (existing.isAnonymous) {
        console.log('[Connection] anon cached, uid:', existing.uid);
      } else {
        console.log('[Connection] sessione Microsoft:', existing.email);
      }

      window.Storage.online = true;
      const u0 = firebase.auth().currentUser;
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
    } catch (err) {
      window.Storage.online = false;
      this.setStatus('error', 'Errore Firebase');
      console.error('[Connection] init fallita:', err.message);
    }
    console.log('[Connection] init() end');
  },

  setStatus(kind, label) {
    const el = document.getElementById('fbStatus');
    if (!el) return;
    el.className = 'fb-status ' + kind;
    el.querySelector('.fb-label').textContent = label;
  }
};
