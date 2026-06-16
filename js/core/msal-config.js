/**
 * ColloquiTeam · core/msal-config.js
 * -------------------------------------------------------------------
 * Configurazione MSAL.js (auth Azure AD / Microsoft work account).
 *
 * Prima di andare in produzione:
 *   1. Crea un'app registration su https://portal.azure.com
 *      → Azure Active Directory → App registrations → "New registration"
 *      → Name: "ColloquiAreaCcm"
 *      → Supported account types: "Accounts in this organizational directory only" (single tenant)
 *      → Redirect URI: type "Single-page application (SPA)"
 *                      URI:  https://dexccm.github.io/ColloquiAreaCcm/
 *      → AGGIUNGI in seguito anche le redirect URI di test:
 *           http://localhost:5500/
 *           http://127.0.0.1:5500/  (Live Server / serve.bat)
 *   2. Copia l'Application (client) ID e sostituiscilo qui sotto al posto di REPLACE_ME.
 *   3. (Facoltativo) Restringi il login a un solo tenant cambiando
 *      "authority" da "organizations" al GUID del tuo tenant.
 *
 * Note:
 *   - usiamo loginRedirect (non popup) perché alcune policy di sicurezza
 *     interne bloccano i popup
 *   - lo storage del token è in localStorage (sopravvive ai refresh)
 *   - il match utente è applicativo: l'email Microsoft viene cercata su
 *     /users (Firebase) in window.Users.findByEmail
 */
window.MSAL_CONFIG = {
  auth: {
    clientId: 'REPLACE_ME',                                       // ← TODO: clientId Azure
    authority: 'https://login.microsoftonline.com/organizations', // work accounts soltanto
    redirectUri: window.location.origin + window.location.pathname,
    postLogoutRedirectUri: window.location.origin + window.location.pathname,
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
