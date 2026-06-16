/**
 * ColloquiTeam · ui/home.js
 * -------------------------------------------------------------------
 * Home: due varianti per ruolo.
 *  - admin: dashboard team + (se area:all) debug panel Firebase
 *  - user : card stato scheda + selettore trimestre + CTA compilazione
 */

window.renderHome = async function () {
  const u = window.state.currentUser;
  const isAdmin = u.role === 'admin';
  const main = document.getElementById('appMain');

  if (isAdmin) {
    main.innerHTML =
      '<div class="page-head">' +
        '<div class="page-eyebrow">' + (u.area === 'all' ? 'Admin · tutte le aree' : 'Admin · area ' + u.area) + '</div>' +
        '<h1 class="page-title">Ciao <span class="accent">' + u.displayName.split(' ')[0] + '</span></h1>' +
        '<p class="page-sub">Da qui gestisci le schede del team e prepari i colloqui trimestrali.</p>' +
      '</div>' +
      '<div class="home-grid">' +
        '<div class="card home-card">' +
          '<span class="scheda-stato vuota">v0.3 · firebase live</span>' +
          '<h2>Dashboard team</h2>' +
          '<p>Vista d\'insieme delle schede del trimestre. Chi ha compilato, chi è in bozza, chi non ha iniziato.</p>' +
          '<a href="#/team" class="btn-primary">Vai al team &rarr;</a>' +
        '</div>' +
        '<div class="card home-card">' +
          '<span class="scheda-stato vuota">opzionale</span>' +
          '<h2>Compila la tua autovalutazione</h2>' +
          '<p>Anche da admin puoi compilare la tua scheda autovalutazione.</p>' +
          '<a href="#/autoval" class="btn-secondary">Apri form &rarr;</a>' +
        '</div>' +
      '</div>' +
      (u.area === 'all' && _isDevMode() ? '<div id="debugPanelHost"></div>' : '');

    // Pannello diagnostico: SOLO se aperto con ?dev=1 o window.DEV_MODE=true.
    // In produzione resta nascosto agli admin per non mostrare path Firebase / pulsanti distruttivi.
    if (u.area === 'all' && _isDevMode()) window.renderDebugPanel();
    return;
  }

  function _isDevMode() {
    if (window.DEV_MODE === true) return true;
    try { return new URLSearchParams(location.search).get('dev') === '1'; }
    catch (_) { return false; }
  }

  // ─ user branch ─
  const scheda = await window.Storage.loadScheda(u.slug, window.state.year, window.state.quarter, 'autovalutazione');
  const stato = scheda.submittedAt ? 'inviata' : (scheda.updatedAt ? 'bozza' : 'vuota');
  const statoLabel = { vuota: 'Non iniziata', bozza: 'In bozza', inviata: 'Inviata' }[stato];
  const descr = stato === 'inviata'
      ? 'Hai già inviato la scheda di questo trimestre. Puoi rivederla ma non modificarla.'
      : stato === 'bozza'
        ? 'Riprendi a compilare. Il salvataggio è automatico ogni volta che modifichi un campo.'
        : 'Inizia a compilare la scheda di questo trimestre. Tutte le sezioni si salvano automaticamente.';
  const ctaLabel = stato === 'vuota'
      ? 'Inizia la compilazione &rarr;'
      : stato === 'bozza'
        ? 'Continua a compilare &rarr;'
        : 'Rileggi la scheda &rarr;';

  const trimButtons = ['Q1','Q2','Q3','Q4'].map(q =>
    '<button class="trim-btn ' + (window.state.quarter === q ? 'active' : '') +
    '" onclick="setQuarter(\'' + q + '\')">' + q + '</button>'
  ).join('');

  main.innerHTML =
    '<div class="page-head">' +
      '<div class="page-eyebrow">' + u.ruolo + ' · ' + u.area.toUpperCase() + '</div>' +
      '<h1 class="page-title">Ciao <span class="accent">' + u.displayName.split(' ')[0] + '</span></h1>' +
      '<p class="page-sub">Compila la tua scheda di autovalutazione trimestrale.</p>' +
    '</div>' +
    '<div class="home-grid">' +
      '<div class="card home-card">' +
        '<span class="scheda-stato ' + stato + '">' + statoLabel + '</span>' +
        '<h2>Scheda ' + window.state.year + ' · <span class="accent">' + window.state.quarter + '</span></h2>' +
        '<p>' + descr + '</p>' +
        '<div class="trim-picker">' + trimButtons + '</div>' +
        '<a href="#/autoval" class="btn-primary">' + ctaLabel + '</a>' +
      '</div>' +
      '<div class="card home-card">' +
        '<span class="scheda-stato vuota">info</span>' +
        '<h2>Come funziona</h2>' +
        '<ul class="home-list">' +
          '<li>Compila la scheda autovalutazione del trimestre.</li>' +
          '<li>Il responsabile compila a sua volta la sua scheda.</li>' +
          '<li>Durante il colloquio confronterete le due viste insieme.</li>' +
        '</ul>' +
      '</div>' +
    '</div>';
};
