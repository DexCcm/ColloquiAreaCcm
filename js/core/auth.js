/**
 * ColloquiTeam · core/auth.js
 * -------------------------------------------------------------------
 * Auth con Firebase Authentication + Microsoft Identity Provider (OIDC).
 *
 * Strategia:
 *   - firebase.auth() è l'unica fonte di verità
 *   - signInWithRedirect verso il provider Microsoft (configurato in Firebase Console)
 *   - dopo login, _bindUserFromFirebase fa il match email→slug su /users
 *     e auto-claima /uidIndex/{auth.uid}: slug. Le Security Rules useranno
 *     uidIndex per risalire al ruolo dell'utente, server-side.
 *
 * API pubblica:
 *   Auth.bootAuth()             ← boot, gestisce redirect + cache session
 *   Auth.loginWithMicrosoft()   ← signInWithRedirect verso Microsoft
 *   Auth.logout()               ← signOut Firebase + UI reset
 *   Auth.login(slug)            ← MOCK dev (con ?dev=1 e rules permissive)
 *   Auth.restoreSession()       ← restore mock per dev-mode
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

    // 1) Eventuale ritorno da loginRedirect
    try {
      const result = await firebase.auth().getRedirectResult();
      if (result && result.user) {
        console.log('[Auth] redirect login OK:', result.user.email);
      }
    } catch (err) {
      console.error('[Auth] getRedirectResult error:', err.code, err.message);
      if (err.code === 'auth/account-exists-with-different-credential') {
        alert('Esiste già un account Firebase con questa email. Contatta admin.');
      }
    }

    // 2) Sincronizzo con auth state (sessione cached o cambio tab)
    return new Promise(function(resolve) {
      const unsub = firebase.auth().onAuthStateChanged(async function(fbUser) {
        unsub();
        if (!fbUser) { resolve(false); return; }
        const ok = await window.Auth._bindUserFromFirebase(fbUser);
        resolve(ok);
      });
    });
  },

  loginWithMicrosoft: function() {
    if (!this._provider) {
      alert('Auth non inizializzato. Ricarica la pagina.');
      return;
    }
    firebase.auth().signInWithRedirect(this._provider)
      .catch(function(err) {
        console.error('[Auth] signInWithRedirect error:', err);
        alert('Errore di login Microsoft: ' + (err.message || err.code));
      });
  },

  /**
   * Risale dall'utente Firebase a quello applicativo, e auto-claima uidIndex.
   */
  _bindUserFromFirebase: async function(fbUser) {
    const email = (fbUser.email || '').toLowerCase();
    if (!email) {
      console.error('[Auth] utente Firebase senza email');
      await firebase.auth().signOut();
      return false;
    }

    // 1. Lookup slug dall'email (client-side su /users)
    const u = window.Users && window.Users.findByEmail(email);
    const slug = u && u.slug;

    if (!slug) {
      alert('Utente non autorizzato. Email: ' + email + ' — Non presente in /users. Contatta admin.');
      await firebase.auth().signOut();
      return false;
    }

    // 2. Auto-claim /uidIndex/{auth.uid}: slug
    try {
      const ref = window.firebaseDB.ref('uidIndex/' + fbUser.uid);
      const snap = await window.firebaseDB.get(ref);
      if (!snap.exists() || snap.val() !== slug) {
        await window.firebaseDB.set(ref, slug);
        console.log('[Auth] uidIndex claim:', fbUser.uid, '->', slug);
      }
    } catch (err) {
      console.warn('[Auth] uidIndex claim non scritto:', err.code || err.message);
    }

    window.state.currentUser = u;
    window.showApp();
    return true;
  },

  /** Login mock (dev only). */
  login: function(userSlug) {
    const user = window.Users.findBySlug(userSlug);
    if (!user) { console.error('[Auth] slug non trovato:', userSlug); return; }
    window.state.currentUser = user;
    sessionStorage.setItem('colloquiteam_mockUser', userSlug);
    window.showApp();
  },

  logout: async function() {
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

  restoreSession: function() {
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
