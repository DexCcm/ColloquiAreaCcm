console.log('[load] auth');
/**
 * ColloquiTeam · core/auth.js
 * Auth con Firebase Authentication + Microsoft Identity Provider.
 */
window.Auth = {
  _provider: null,

  async bootAuth() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      console.warn('[Auth] firebase.auth non disponibile');
      return false;
    }
    await window.firebaseReady;

    this._provider = new firebase.auth.OAuthProvider('microsoft.com');
    this._provider.setCustomParameters({
      tenant: 'e5f055d3-14a7-4c84-a94d-b04676abef8e',
      prompt: 'select_account'
    });
    this._provider.addScope('email');
    this._provider.addScope('profile');
    console.log('[Auth] provider Microsoft inizializzato');

    // 1) getRedirectResult: catpura il credenziale appena tornato da Microsoft.
    //    Connection.init ha già aspettato lo stato iniziale, quindi qui è
    //    semplicemente un fetch del risultato (può essere null se nessun redirect).
    try {
      const result = await firebase.auth().getRedirectResult();
      if (result && result.user) {
        console.log('[Auth] redirect login OK:', result.user.email);
      } else {
        console.log('[Auth] nessun redirect result (visita iniziale o sessione cached)');
      }
    } catch (err) {
      console.error('[Auth] getRedirectResult error:', err.code, err.message);
      if (err.code === 'auth/account-exists-with-different-credential') {
        alert('Esiste già un account Firebase con questa email. Contatta admin.');
      }
    }

    // 2) Se c'è già un utente Microsoft (da redirect o da cache), bind subito.
    const cur = firebase.auth().currentUser;
    if (cur && !cur.isAnonymous && cur.email) {
      console.log('[Auth] utente Microsoft attivo:', cur.email, '→ bind');
      return await window.Auth._bindUserFromFirebase(cur);
    }
    console.log('[Auth] nessun utente Microsoft attivo, attendo click sul pulsante');
    return false;
  },

  loginWithMicrosoft: function () {
    if (!this._provider) {
      alert('Auth non inizializzato. Ricarica la pagina.');
      return;
    }
    console.log('[Auth] avvio signInWithRedirect verso Microsoft');
    firebase.auth().signInWithRedirect(this._provider)
      .catch(function (err) {
        console.error('[Auth] signInWithRedirect error:', err);
        alert('Errore di login Microsoft: ' + (err.message || err.code));
      });
  },

  _bindUserFromFirebase: async function (fbUser) {
    const email = (fbUser.email || '').toLowerCase();
    if (!email) {
      console.error('[Auth] utente Firebase senza email');
      await firebase.auth().signOut();
      return false;
    }

    const u = window.Users && window.Users.findByEmail(email);
    const slug = u && u.slug;
    if (!slug) {
      alert('Utente non autorizzato.\n\nEmail: ' + email + '\n\nNon presente in /users. Contatta admin.');
      await firebase.auth().signOut();
      return false;
    }

    try {
      const ref = window.firebaseDB.ref('uidIndex/' + fbUser.uid);
      const snap = await window.firebaseDB.get(ref);
      if (!snap.exists() || snap.val() !== slug) {
        await window.firebaseDB.set(ref, slug);
        console.log('[Auth] uidIndex claim:', fbUser.uid, '->', slug);
      } else {
        console.log('[Auth] uidIndex già claimato per', slug);
      }
    } catch (err) {
      console.warn('[Auth] uidIndex claim non scritto:', err.code || err.message);
    }

    window.state.currentUser = u;
    window.showApp();
    return true;
  },

  login: function (userSlug) {
    const user = window.Users.findBySlug(userSlug);
    if (!user) { console.error('[Auth] slug non trovato:', userSlug); return; }
    window.state.currentUser = user;
    sessionStorage.setItem('colloquiteam_mockUser', userSlug);
    window.showApp();
  },

  logout: async function () {
    window.state.currentUser = null;
    sessionStorage.removeItem('colloquiteam_mockUser');
    try {
      if (firebase && firebase.auth && firebase.auth().currentUser) {
        await firebase.auth().signOut();
      }
    } catch (err) {
      console.error('[Auth] signOut error:', err);
    }
    location.hash = '';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-shell').hidden = true;
  },

  restoreSession: function () {
    const dev = window.DEV_MODE === true || new URLSearchParams(location.search).get('dev') === '1';
    if (!dev) return false;
    const slug = sessionStorage.getItem('colloquiteam_mockUser');
    if (!slug) return false;
    const user = window.Users.findBySlug(slug);
    if (!user) { sessionStorage.removeItem('colloquiteam_mockUser'); return false; }
    window.state.currentUser = user;
    return true;
  }
};
