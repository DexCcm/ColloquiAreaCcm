/**
 * ColloquiTeam · core/auth.js
 * -------------------------------------------------------------------
 * Auth applicativa con MSAL.js (Azure AD).
 *
 *   Auth.bootMsal()             ← chiamato al boot, gestisce redirect post-login
 *   Auth.loginWithMicrosoft()   ← scatena loginRedirect verso Microsoft
 *   Auth.loginByEmail(email)    ← matcha email → /users e apre la sessione
 *   Auth.login(slug)            ← scorciatoia mock (solo dev, sessionStorage)
 *   Auth.logout()               ← logout MSAL + reset sessione applicativa
 *   Auth.restoreSession()       ← rinvia all'app se c'è già una sessione attiva
 */
window.Auth = {
  _msal: null,

  /** Inizializza MSAL e gestisce eventuale ritorno da Microsoft. */
  async bootMsal() {
    if (typeof msal === 'undefined') {
      console.warn('[Auth] MSAL non caricato — verifica lo script in index.html');
      return false;
    }
    if (!window.MSAL_CONFIG || window.MSAL_CONFIG.auth.clientId === 'REPLACE_ME') {
      console.warn('[Auth] clientId Azure non configurato — sostituisci REPLACE_ME in js/core/msal-config.js');
      return false;
    }

    this._msal = new msal.PublicClientApplication(window.MSAL_CONFIG);

    try {
      // Se torno da un loginRedirect, qui leggo l'AuthenticationResult.
      const response = await this._msal.handleRedirectPromise();
      if (response && response.account) {
        const email = this._extractEmail(response.account);
        if (email) return this.loginByEmail(email);
      }

      // Se ho già un account in cache, riapro la sessione automaticamente.
      const accounts = this._msal.getAllAccounts();
      if (accounts.length > 0) {
        const email = this._extractEmail(accounts[0]);
        if (email) return this.loginByEmail(email);
      }
    } catch (err) {
      console.error('[Auth] handleRedirectPromise error:', err);
    }
    return false;
  },

  /** Click sul bottone "Accedi con Microsoft" → redirect a login.microsoftonline.com */
  loginWithMicrosoft() {
    if (!this._msal) {
      alert(
        '⚠ Microsoft login non disponibile.\n\n' +
        'Verifica che il clientId in js/core/msal-config.js sia configurato.'
      );
      return;
    }
    this._msal.loginRedirect({ scopes: window.MSAL_LOGIN_SCOPES || ['openid', 'profile', 'email'] })
      .catch(err => {
        console.error('[Auth] loginRedirect error:', err);
        alert('Errore di login Microsoft. Riprova fra qualche secondo.');
      });
  },

  /**
   * Login by email: estrae l'email Microsoft e la cerca in /users.
   */
  loginByEmail(email) {
    const user = window.Users.findByEmail(email);
    if (!user) {
      alert(
        '❌ Utente non autorizzato\n\n' +
        'Email: ' + email + '\n\n' +
        'Non sei presente nel nodo /users di Firebase. ' +
        "Contatta l'amministratore per essere abilitato."
      );
      if (this._msal) {
        const acc = this._msal.getAllAccounts()[0];
        if (acc) this._msal.logoutRedirect({ account: acc }).catch(() => {});
      }
      return false;
    }
    window.state.currentUser = user;
    sessionStorage.setItem('colloquiteam_currentUser', user.slug);
    window.showApp();
    return true;
  },

  /** Login mock (dev) — riservato a window.DEV_MODE === true o ?dev=1. */
  login(userSlug) {
    const user = window.Users.findBySlug(userSlug);
    if (!user) {
      console.error('[Auth] slug non trovato:', userSlug);
      return;
    }
    window.state.currentUser = user;
    sessionStorage.setItem('colloquiteam_currentUser', userSlug);
    window.showApp();
  },

  logout() {
    window.state.currentUser = null;
    sessionStorage.removeItem('colloquiteam_currentUser');
    if (this._msal) {
      const acc = this._msal.getAllAccounts()[0];
      if (acc) {
        this._msal.logoutRedirect({ account: acc }).catch(err => {
          console.error('[Auth] logoutRedirect error:', err);
          this._localLogoutUi();
        });
        return;
      }
    }
    this._localLogoutUi();
  },

  _localLogoutUi() {
    location.hash = '';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-shell').hidden = true;
  },

  restoreSession() {
    const slug = sessionStorage.getItem('colloquiteam_currentUser');
    if (!slug) return false;
    const user = window.Users.findBySlug(slug);
    if (!user) {
      sessionStorage.removeItem('colloquiteam_currentUser');
      return false;
    }
    window.state.currentUser = user;
    return true;
  },

  _extractEmail(account) {
    if (!account) return null;
    return (
      account.username ||
      (account.idTokenClaims && (account.idTokenClaims.email || account.idTokenClaims.preferred_username)) ||
      null
    );
  }
};
