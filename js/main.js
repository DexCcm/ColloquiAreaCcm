console.log('[load] main');
/**
 * ColloquiTeam · main.js
 * Bootstrap: Firebase + MSAL.js + setup UI.
 *
 * In produzione MSAL gestisce il login. In dev (?dev=1) il mock picker
 * mostra la lista utenti per impersonare senza fare il giro Microsoft.
 */
(async function init() {
  await window.Connection.init();
  await window.Users.loadAll();

  const params  = new URLSearchParams(location.search);
  const devMode = window.DEV_MODE === true || params.get('dev') === '1';

  if (window.Auth.restoreSession()) {
    window.showApp();
  } else {
    await window.Auth.bootAuth();
  }

  // === Bottone Microsoft ===
  const msalBtn = document.getElementById('msalLoginBtn');
  if (msalBtn) {
    const clientIdReady =
      window.MSAL_CONFIG && window.MSAL_CONFIG.auth.clientId !== 'REPLACE_ME';
    if (clientIdReady) {
      msalBtn.disabled = false;
      msalBtn.removeAttribute('title');
      msalBtn.textContent = '🔒 Accedi con Microsoft';
      msalBtn.onclick = function () { window.Auth.loginWithMicrosoft(); };
    } else {
      msalBtn.disabled = true;
      msalBtn.title = 'Imposta il clientId Azure in js/core/msal-config.js';
      msalBtn.textContent = '🔒 Accedi con Microsoft (config Azure mancante)';
    }
  }

  // === DEV mock picker ===
  const mockHost  = document.getElementById('mockUsersList');
  const mockBlock = document.querySelector('.login-mock-block');
  if (devMode && mockHost) {
    if (mockBlock) mockBlock.style.display = '';
    const users = window.USERS_LIST || [];
    mockHost.innerHTML = '';
    users.forEach(function (u) {
      const btn = document.createElement('button');
      btn.className = 'mock-btn';
      btn.innerHTML = '<b>' + u.displayName + '</b>' +
        '<small>' + u.email + ' · ' + u.role + ' · area ' + u.area + '</small>';
      btn.onclick = function () { window.Auth.login(u.slug); };
      mockHost.appendChild(btn);
    });
    if (users.length === 0) {
      mockHost.innerHTML = '<p style="color:var(--ink-mute);font-size:13px;padding:14px;text-align:center;">' +
        'Nessun utente caricato. Verifica il nodo <code>/users</code> su Firebase.</p>';
    }
  } else if (mockBlock) {
    mockBlock.style.display = 'none';
  }

  document.getElementById('logoutBtn').onclick = function () { window.Auth.logout(); };
  window.addEventListener('hashchange', function () { window.Router.go(); });
})();
