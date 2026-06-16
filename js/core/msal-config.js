/**
 * ColloquiTeam · core/msal-config.js
 * -------------------------------------------------------------------
 * Configurazione MSAL.js (auth Azure AD).
 *
 * App registration:
 *   - Tenant:     DATAEXPERT (single tenant)
 *   - Nome app:   ColloquiAreaCcm
 *   - Redirect:   SPA → https://dexccm.github.io/ColloquiAreaCcm/
 *
 * In locale (file:// o localhost) il login Microsoft non funziona perché
 * il redirectUri è hardcoded sulla produzione: usa `?dev=1` nell'URL per
 * attivare il mock picker.
 *
 * Note tecniche:
 *   - loginRedirect (non popup) → compatibile con policy aziendali che bloccano i popup
 *   - cache in localStorage     → la sessione sopravvive ai refresh
 *   - match utente applicativo  → l'email Microsoft viene cercata su /users in Firebase
 */
window.MSAL_CONFIG = {
  auth: {
    clientId:    '79c04c42-a91b-4ba3-b8d6-192dedda9537',                                // Dataexpert · ColloquiAreaCcm
    authority:   'https://login.microsoftonline.com/e5f055d3-14a7-4c84-a94d-b04676abef8e', // single tenant DATAEXPERT
    redirectUri:           'https://dexccm.github.io/ColloquiAreaCcm/',
    postLogoutRedirectUri: 'https://dexccm.github.io/ColloquiAreaCcm/',
    navigateToLoginRequestUrl: false
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false
  },
  system: {
    loggerOptions: {
      loggerCallback: function (level, message, containsPii) {
        if (containsPii) return;
        // Decommenta per debug:
        // console.log('[MSAL]', message);
      },
      logLevel: 2 // Info
    }
  }
};

/** Scope minimi richiesti: solo info profilo (email) */
window.MSAL_LOGIN_SCOPES = ['openid', 'profile', 'email', 'User.Read'];

