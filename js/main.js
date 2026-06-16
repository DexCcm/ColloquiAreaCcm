/**
 * ColloquiTeam · main.js
 * -------------------------------------------------------------------
 * Bootstrap dell'applicazione. Eseguito per ultimo nello script-chain
 * grazie a `<script defer>`.
 *
 * Sequenza:
 *   1. Bootstrap anonimo Firebase (Connection.init)
 *   2. Carica /users da Firebase (Users.loadAll, con fallback MOCK_USERS)
 *   3. Auth.restoreSession() prima di MSAL (evita redirect inutili)
 *   4. Auth.bootMsal() se non c'è sessione
 *   5. Collega bottone Microsoft
 *   6. (DEV) Mock picker via ?dev=1 in URL o window.DEV_MODE=true
 *   7. Bind logout + hashchange
 */
(async function init() {
  await window.Connection.init();
  await window.Users.loadAll();

  if (window.Auth.restoreSession()) {
    window.showApp();
  } else {
    await window.Auth.bootMsal();
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
      msalBtn.onclick = () => window.Auth.loginWithMicrosoft();
    } else {
      msalBtn.disabled = true;
      msalBtn.title = 'Imposta il clientId Azure in js/core/msal-config.js';
      msalBtn.textContent = '🔒 Accedi con Microsoft (config Azure mancante)';
    }
  }

  // === DEV mode ===
  const params = new URLSearchParams(location.search);
  const devMode = window.DEV_MODE === true || params.get('dev') === '1';

  const mockHost  = document.getElementById('mockUsersList');
  const mockBlock = document.querySelector('.login-mock-block');
  if (devMode && mockHost) {
    if (mockBlock) mockBlock.style.display = '';
    const users = window.USERS_LIST || [];
    mockHost.innerHTML = '';
    users.forEach(u => {
      const btn = document.createElement('button');
      btn.className = 'mock-btn';
      btn.innerHTML = '<b>' + u.displayName + '</b>' +
        '<small>' + u.email + ' · ' + u.role + ' · area ' + u.area + '</small>';
      btn.onclick = () => window.Auth.login(u.slug);
      mockHost.appendChild(btn);
    });
    if (users.length === 0) {
      mockHost.innerHTML = '<p style="color:var(--ink-mute);font-size:13px;padding:14px;text-align:center;">' +
        'Nessun utente caricato. Verifica il nodo <code>/users</code> su Firebase.</p>';
    }
  } else if (mockBlock) {
    mockBlock.style.display = 'none';
  }

  document.getElementById('logoutBtn').onclick = () => window.Auth.logout();
  window.addEventListener('hashchange', () => window.Router.go());
})();
