/**
 * ColloquiTeam · core/connection.js
 * -------------------------------------------------------------------
 * Bootstrap connessione Firebase + indicatore visuale di stato.
 *
 * Sign-in anonimo come "boot bridge":
 *   - le Security Rules permettono ai soli autenticati di leggere /users
 *   - prima del login Microsoft serve poter leggere /users (per fare il
 *     match email→slug post-login)
 *   - la sessione anonima viene poi sostituita dall'identità Microsoft
 *     quando l'utente clicca "Accedi con Microsoft" (signInWithRedirect)
 *
 * Le Rules garantiscono che un utente anonimo possa SOLO leggere /users.
 * Tutti gli altri path (schede, uidIndex) restano inaccessibili finché
 * non c'è un'identità Microsoft con uidIndex auto-claimato.
 */
window.Connection = {
  async init() {
    this.setStatus('connecting', 'Connessione…');
    try {
      await window.firebaseReady;

      // Se già loggato (Microsoft), saltiamo l'anonima
      const existing = window.firebaseAuth.currentUser;
      if (!existing) {
        const cred = await window.firebaseAuth.signInAnonymously();
        console.log('[Connection] boot bridge anonymous, uid:', cred.user.uid);
      }

      window.Storage.online = true;
      const displayUid = (window.firebaseAuth.currentUser || {}).uid || '???';
      this.setStatus('connected', 'Online · ' + displayUid.slice(0, 8));

      window.firebaseAuth.onAuthStateChanged(function(user) {
        if (!user) {
          window.Storage.online = false;
          window.Connection.setStatus('offline', 'Disconnesso');
          return;
        }
        window.Storage.online = true;
        const tag = user.isAnonymous ? 'anon' : (user.email || user.uid.slice(0, 8));
        window.Connection.setStatus('connected', 'Online · ' + tag);
      });

      window.addEventListener('online',  function() { window.Connection.setStatus('connected', 'Online'); });
      window.addEventListener('offline', function() { window.Connection.setStatus('offline', 'Offline · cache locale'); });
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
