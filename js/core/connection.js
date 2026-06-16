/**
 * ColloquiTeam · core/connection.js
 * -------------------------------------------------------------------
 * Bootstrap connessione Firebase + indicatore visuale di stato.
 *
 * Sign-in anonimo come "boot bridge":
 *   - le Security Rules permettono ai soli autenticati di leggere /users
 *   - prima del login Microsoft serve comunque poter caricare la lista
 *     utenti (per matchare l'email→slug post-login)
 *   - la sessione anonima viene poi sostituita dall'identità Microsoft
 *     quando l'utente clicca "Accedi" (signInWithRedirect)
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

      // Aggiorno la UI quando l'identità cambia (anon → Microsoft → logout)
      window.firebaseAuth.onAuthStateChanged((user) => {
