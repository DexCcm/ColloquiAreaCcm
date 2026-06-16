/**
 * ColloquiTeam · ui/shell.js
 * -------------------------------------------------------------------
 * Componenti shell trasversali: chip utente, navbar attiva, toast,
 * placeholder, period picker globale e showApp (bootstrap post-login).
 */

window.showApp = function () {
  // Connessione Firebase + caricamento /users sono già stati eseguiti
  // da main.js prima ancora di mostrare il login picker.
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-shell').hidden = false;
  window.renderUserChip();
  window.renderPeriodPicker();

  if (!location.hash || location.hash === '#') location.hash = '#/home';
  else window.Router.go();
};

window.renderUserChip = function () {
  const u = window.state.currentUser;
  document.getElementById('userChip').innerHTML =
    '<span>' + u.displayName + '</span>' +
    '<span class="role-badge ' + u.role + '">' + u.role + '</span>';
};

/**
 * Period picker globale (anno + trimestre).
 * Cambia state.year/state.quarter e re-renderizza la view corrente
 * via Router.go(). Tutte le funzioni di load schede leggono da state.*
 * quindi cambiare qui equivale a "spostarsi nel tempo".
 */
window.renderPeriodPicker = function () {
  const picker  = document.getElementById('periodPicker');
  const yearSel = document.getElementById('yearSelect');
  const qSel    = document.getElementById('quarterSelect');
  if (!yearSel || !qSel) return;

  // Periodo "oggi" sempre ricalcolato dalla data attuale del browser.
  const today = window.todayPeriod();
  const u = window.state.currentUser;
  const isUser = (u && u.role === 'user');

  // ── Per gli user: il periodo è FORZATO a "oggi" e il picker è read-only.
  //    Per gli admin: picker libero con opzioni anno -2..+1.
  if (isUser) {
    window.state.year = today.year;
    window.state.quarter = today.quarter;
  }
  yearSel.disabled = isUser;
  qSel.disabled = isUser;

  const years = [];
  for (let y = today.year - 2; y <= today.year + 1; y++) years.push(y);

  yearSel.innerHTML = years.map(y => {
    const isToday = (y === today.year);
    return '<option value="' + y + '"' + (y === window.state.year ? ' selected' : '') + '>' +
      y + (isToday ? ' · oggi' : '') +
    '</option>';
  }).join('');

  qSel.innerHTML = ['Q1','Q2','Q3','Q4'].map(q => {
    const isToday = (q === today.quarter && window.state.year === today.year);
    return '<option value="' + q + '"' + (q === window.state.quarter ? ' selected' : '') + '>' +
      q + (isToday ? ' · oggi' : '') +
    '</option>';
  }).join('');

  yearSel.onchange = () => {
    if (isUser) return;
    window.state.year = parseInt(yearSel.value, 10);
    window.renderPeriodPicker();
    window.Router.go();
  };
  qSel.onchange = () => {
    if (isUser) return;
    window.state.quarter = qSel.value;
    window.renderPeriodPicker();
    window.Router.go();
  };

  // Glossario trimestri (mostrato sempre, utile a tutti gli utenti)
  let glossBtn = document.getElementById('periodGlossaryBtn');
  if (!glossBtn) {
    glossBtn = document.createElement('button');
    glossBtn.id = 'periodGlossaryBtn';
    glossBtn.className = 'period-glossary';
    glossBtn.type = 'button';
    glossBtn.setAttribute('aria-label', 'Glossario trimestri');
    glossBtn.textContent = 'ℹ︎';
    glossBtn.title =
      (isUser ? 'Trimestre corrente — non modificabile.\n\n' : '') +
      'Q1 · gennaio–marzo\nQ2 · aprile–giugno\nQ3 · luglio–settembre\nQ4 · ottobre–dicembre';
    glossBtn.onclick = () => {
      window.toast('Q1 gen-mar · Q2 apr-giu · Q3 lug-set · Q4 ott-dic');
    };
    picker.appendChild(glossBtn);
  }

  // Bottone "↺ Oggi": solo admin, e solo se non già su oggi.
  const isAtToday = (window.state.year === today.year && window.state.quarter === today.quarter);
  let resetBtn = document.getElementById('periodResetBtn');
  if (!isUser && !isAtToday) {
    if (!resetBtn) {
      resetBtn = document.createElement('button');
      resetBtn.id = 'periodResetBtn';
      resetBtn.className = 'period-reset';
      resetBtn.type = 'button';
      resetBtn.title = 'Torna al trimestre corrente (' + today.year + ' ' + today.quarter + ')';
      resetBtn.textContent = '↺ Oggi';
      resetBtn.onclick = () => {
        const t = window.todayPeriod();
        window.state.year = t.year;
        window.state.quarter = t.quarter;
        window.renderPeriodPicker();
        window.Router.go();
      };
      picker.appendChild(resetBtn);
    }
  } else if (resetBtn) {
    resetBtn.remove();
  }
};

window.updateHeaderNav = function (currentRoute) {
  const nav = document.getElementById('headerNav');
  const u = window.state.currentUser;
  const isAdmin = u.role === 'admin';


  const links = [{ path: '/home', label: 'Home' }];
  if (u.role === 'user')  links.push({ path: '/autoval', label: 'La mia scheda' });
  if (isAdmin) {
    links.push({ path: '/team', label: 'Team' });
    links.push({ path: '/autoval', label: 'Compila come utente' });
  }

  nav.innerHTML = links.map(l =>
    '<a href="#' + l.path + '" class="nav-link ' +
    (l.path.startsWith('/' + currentRoute) ? 'active' : '') +
    '">' + l.label + '</a>'
  ).join('');
};

window.renderPlaceholder = function (title, sub) {
  document.getElementById('saveStatus').style.display = 'none';
  document.getElementById('appMain').innerHTML =
    '<div class="placeholder-page"><h2>' + title + '</h2><p>' + sub + '</p>' +
    '<p style="margin-top:24px;"><a href="#/home" class="btn-secondary">&larr; Torna alla home</a></p></div>';
};

window.toast = function (msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
};

window.setSaveStatus = function (kind) {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  el.style.display = 'flex';
  el.className = 'save-status ' + (kind === 'saved' ? '' : kind);
  const labels = { saved: 'Tutto salvato', dirty: 'Modifiche non salvate', saving: 'Salvataggio…' };
  el.querySelector('.label').textContent = labels[kind] || 'Tutto salvato';
};
