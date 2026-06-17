console.log('[load] main');
(async function init() {
  // === Bind EAGER del bottone Microsoft (prima di ogni await che può hangare) ===
  const msalBtn = document.getElementById('msalLoginBtn');
  if (msalBtn) {
    msalBtn.onclick = function () {
      if (!window.Auth || !window.Auth.loginWithMicrosoft) {
        alert('Auth non ancora pronto. Aspetta un secondo e riprova.');
        return;
      }
      window.Auth.loginWithMicrosoft();
    };
    console.log('[main] msalBtn onclick eager-bound');
  }

  // === Bind EAGER anche del logoutBtn ===
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = function () { window.Auth.logout(); };
  }

  // === Bootstrap normale ===
  await window.Connection.init();
  await window.Users.loadAll();

  const params  = new URLSearchParams(location.search);
  const devMode = window.DEV_MODE === true || params.get('dev') === '1';

  if (window.Auth.restoreSession()) {
    window.showApp();
  } else {
    await window.Auth.bootAuth();
  }

  // Aggiornamento estetico del bottone (al post-init)
  if (msalBtn) {
    const clientIdReady = window.MSAL_CONFIG && window.MSAL_CONFIG.auth.clientId !== 'REPLACE_ME';
    msalBtn.disabled = !clientIdReady;
    msalBtn.textContent = clientIdReady ? '🔒 Accedi con Microsoft' : '🔒 Microsoft (config mancante)';
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
  } else if (mockBlock) {
    mockBlock.style.display = 'none';
  }

  window.addEventListener('hashchange', function () { window.Router.go(); });
})();
