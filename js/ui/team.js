/**
 * ColloquiTeam · ui/team.js
 * -------------------------------------------------------------------
 * Vista dashboard team per admin: tabella membri con stato di
 * autovalutazione e valutazione del trimestre corrente, filtrata
 * per area dell'admin (area:all vede tutto, altrimenti solo la sua).
 */

window.renderTeamStub = async function () {
  const u = window.state.currentUser;
  // Sorgente utenti: USERS_LIST (popolato da Users.loadAll all'avvio).
  // Fallback su MOCK_USERS solo se Firebase è inaccessibile.
  const source = window.USERS_LIST || window.MOCK_USERS || [];
  const team = source.filter(m =>
    m.role === 'user' && (u.area === 'all' || m.area === u.area)
  );
  const main = document.getElementById('appMain');
  document.getElementById('saveStatus').style.display = 'none';
  main.innerHTML = '<div class="placeholder-page"><h2>Caricamento team…</h2></div>';

  const rows = await Promise.all(team.map(async m => {
    const [sch, valSch] = await Promise.all([
      window.Storage.loadScheda(m.slug, window.state.year, window.state.quarter, 'autovalutazione'),
      window.Storage.loadScheda(m.slug, window.state.year, window.state.quarter, 'valutazione')
    ]);
    return {
      m,
      autoStato: sch.submittedAt    ? 'inviata' : (sch.updatedAt    ? 'bozza' : 'vuota'),
      valStato:  valSch.submittedAt ? 'inviata' : (valSch.updatedAt ? 'bozza' : 'vuota')
    };
  }));

  const lbl = { vuota: '— Non iniziata', bozza: 'In bozza', inviata: '✓ Inviata' };

  const headers = ['Membro','Area','Autoval','Val resp','Azioni'].map(h =>
    '<th style="text-align:left; padding:14px 8px; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-mute);">' + h + '</th>'
  ).join('');

  const tbody = rows.map(r => {
    // "Visualizza" abilitato solo se esiste almeno una bozza di autovalutazione
    const canView = r.autoStato !== 'vuota';
    const viewBtn = canView
      ? '<a href="#/scheda/' + r.m.slug + '" class="btn-secondary" style="padding:6px 14px; font-size:12px;">Visualizza</a>'
      : '<button class="btn-secondary" style="padding:6px 14px; font-size:12px;" disabled title="Nessuna autovalutazione ancora inviata">Visualizza</button>';
    const valutaBtn =
      '<a href="#/valuta/' + r.m.slug + '" class="btn-secondary" style="padding:6px 14px; font-size:12px;">Valuta</a>';
    const colloquioBtn =
      '<a href="#/colloquio/' + r.m.slug + '" class="btn-secondary" style="padding:6px 14px; font-size:12px; background:var(--accent-soft); color:var(--accent); border-color:var(--accent);">Colloquio</a>';

    return '<tr style="border-bottom:1px solid var(--rule-soft);">' +
      '<td style="padding:14px 8px;"><b>' + r.m.displayName + '</b><br><small style="color:var(--ink-mute);">' + r.m.email + '</small></td>' +
      '<td style="padding:14px 8px;">' + r.m.area + '</td>' +
      '<td style="padding:14px 8px;"><span class="scheda-stato ' + r.autoStato + '">' + lbl[r.autoStato] + '</span></td>' +
      '<td style="padding:14px 8px;"><span class="scheda-stato ' + r.valStato  + '">' + lbl[r.valStato]  + '</span></td>' +
      '<td style="padding:14px 8px; white-space:nowrap;">' +
        viewBtn + ' ' + valutaBtn + ' ' + colloquioBtn +
      '</td>' +
    '</tr>';
  }).join('');

  main.innerHTML =
    '<div class="page-head">' +
      '<div class="page-eyebrow">Team · ' + window.state.year + ' · ' + window.state.quarter + '</div>' +
      '<h1 class="page-title">I tuoi <span class="accent">membri di team</span></h1>' +
      '<p class="page-sub">Area visibile: <b>' + (u.area === 'all' ? 'tutte' : u.area) + '</b></p>' +
    '</div>' +
    '<div class="card">' +
      '<table style="width:100%; border-collapse:collapse;">' +
        '<thead><tr style="border-bottom:2px solid var(--rule-soft);">' + headers + '</tr></thead>' +
        '<tbody>' + tbody + '</tbody>' +
      '</table>' +
      (rows.length === 0
        ? '<p style="text-align:center; padding:40px; color:var(--ink-mute);">Nessun membro nella tua area.</p>'
        : '') +
    '</div>' +
    '<p style="margin-top:18px; color:var(--ink-mute); font-size:13px; text-align:center;">' +
      '<b>Visualizza</b>: leggi l\'autovalutazione che il membro ha compilato. ' +
      '<b>Valuta</b>: compila la tua valutazione responsabile per quel membro. ' +
      '<b>Colloquio</b>: vista con confronto auto vs val e ruota sovrapposta — da usare durante l\'incontro 1:1.' +
    '</p>';
};
