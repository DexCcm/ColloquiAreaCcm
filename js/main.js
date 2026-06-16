/**
 * ColloquiTeam · main.js
 * -------------------------------------------------------------------
 * Bootstrap con Firebase Auth come fonte di verità.
 *
 * Sequenza:
 *   1. Firebase up (Connection.init — niente più auth anonima)
 *   2. Carica /users (loadAll)
 *   3. DEV mode: restore eventuale sessione mock
 *   4. PROD: Auth.bootAuth() gestisce redirect Microsoft + sessione cached
 *   5. Aggancia bottone Microsoft + mostra mock picker in dev
 *   6. Bind logout + hashchange
 */
(async function init() {
  await window.Connection.init();
  await window.Users.loadAll();

  const params  = new URLSearchParams(location.search);
  const devMode = window.DEV_MODE === true || params.get('dev') === '1';

  // DEV: tenta restore mock prima di toccare Firebase Auth
  if (devMode && window.Auth.restoreSession()) {
    window.showApp();
  } else {
    // PROD: lascia che Firebase Auth dica chi sei
    await window.Auth.bootAuth();
  }

  // === Bottone Microsoft ===
  const msalBtn = document.getElementById('msalLoginBtn');
  if (msalBtn) {
    msalBtn.disabled = false;
    msalBtn.removeAttribute('title');
    msalBtn.textContent = '🔒 Accedi con Microsoft';
    msalBtn.onclick = () => window.Auth.loginWithMicrosoft();
  }

  // === DEV mock picker ===
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
