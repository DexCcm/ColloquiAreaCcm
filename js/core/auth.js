console.log('[load] auth');
/**
 * ColloquiTeam · core/auth.js
 * Auth con MSAL.js (Azure AD) — versione standalone.
 *
 *   Auth.bootAuth()             ← boot, gestisce redirect e cache MSAL
 *   Auth.loginWithMicrosoft()   ← loginRedirect verso Microsoft
 *   Auth.loginByEmail(email)    ← matcha email → /users, apre sessione
 *   Auth.login(slug)            ← scorciatoia mock (solo dev)
 *   Auth.logout()
 *   Auth.restoreSession()
 */
window.Auth = {
  _msal: null,

  async bootAuth() {
    if (typeof msal === 'undefined') {
      console.warn('[Auth] MSAL non caricato');
      return false;
    }
    if (!window.MSAL_CONFIG || window.MSAL_CONFIG.auth.clientId === 'REPLACE_ME') {
      console.warn('[Auth] clientId Azure non configurato');
      return false;
    }

    this._msal = new msal.PublicClientApplication(window.MSAL_CONFIG);

    try {
      const response = await this._msal.handleRedirectPromise();
      if (response && response.account) {
        const email = this._extractEmail(response.account);
        if (email) return this.loginByEmail(email);
      }
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

  loginWithMicrosoft: function () {
    if (!this._msal) {
      alert('Microsoft login non disponibile. Verifica il clientId in msal-config.js');
      return;
    }
    this._msal.loginRedirect({ scopes: window.MSAL_LOGIN_SCOPES || ['openid', 'profile', 'email'] })
      .catch(function (err) {
        console.error('[Auth] loginRedirect error:', err);
        alert('Errore di login Microsoft: ' + (err.message || err.code));
      });
  },

  loginByEmail: function (email) {
    const user = window.Users.findByEmail(email);
    if (!user) {
      alert('Utente non autorizzato.\n\nEmail: ' + email + '\n\nNon presente in /users. Contatta admin.');
      if (this._msal) {
        const acc = this._msal.getAllAccounts()[0];
        if (acc) this._msal.logoutRedirect({ account: acc }).catch(function () {});
      }
      return false;
    }
    window.state.currentUser = user;
    sessionStorage.setItem('colloquiteam_currentUser', user.slug);
    window.showApp();
    return true;
  },

  login: function (userSlug) {
    const user = window.Users.findBySlug(userSlug);
    if (!user) { console.error('[Auth] slug non trovato:', userSlug); return; }
    window.state.currentUser = user;
    sessionStorage.setItem('colloquiteam_currentUser', userSlug);
    window.showApp();
  },

  logout: function () {
    window.state.currentUser = null;
    sessionStorage.removeItem('colloquiteam_currentUser');
    if (this._msal) {
      const acc = this._msal.getAllAccounts()[0];
      if (acc) {
        this._msal.logoutRedirect({ account: acc }).catch(function () {
          window.Auth._localLogoutUi();
        });
        return;
      }
    }
    window.Auth._localLogoutUi();
  },

  _localLogoutUi: function () {
    location.hash = '';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-shell').hidden = true;
  },

  restoreSession: function () {
    const slug = sessionStorage.getItem('colloquiteam_currentUser');
    if (!slug) return false;
    const user = window.Users.findBySlug(slug);
    if (!user) { sessionStorage.removeItem('colloquiteam_currentUser'); return false; }
    window.state.currentUser = user;
    return true;
  },

  _extractEmail: function (account) {
    if (!account) return null;
    return account.username ||
      (account.idTokenClaims && (account.idTokenClaims.email || account.idTokenClaims.preferred_username)) ||
      null;
  }
};
