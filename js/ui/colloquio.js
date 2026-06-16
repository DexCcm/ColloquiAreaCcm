/**
 * ColloquiTeam · ui/colloquio.js
 * -------------------------------------------------------------------
 * Vista Colloquio (admin only). Carica in parallelo autovalutazione
 * dell'utente e valutazione del responsabile per lo stesso periodo,
 * e mostra:
 *   - confronto rating sezione-per-sezione (Soft, Hard, KPI)
 *   - testi liberi dell'utente (Obiettivi, Proposte, Richieste)
 *   - Ruota delle performance con radar Chart.js sovrapposto
 *
 * Entry point: window.renderColloquio(slug)
 */

(function () {

  let chartInstance = null; // single Chart.js instance per page

  window.renderColloquio = async function (targetSlug) {
    const me = window.state.currentUser;
    const target = window.Users.findBySlug(targetSlug);
    if (!target) {
      window.renderPlaceholder('Utente non trovato', 'Slug "' + targetSlug + '" non presente in /users.');
      return;
    }
    if (me.role !== 'admin') { window.Router.navigate('/home'); return; }
    if (me.area !== 'all' && me.area !== target.area && target.area !== 'all') {
      window.renderPlaceholder('Accesso negato', 'Utente fuori dalla tua area di competenza.');
      return;
    }

    // Variante per area: hard skills, KPI e ruota differiscono tra Q e PP.
    const isPapyrus      = (target.area === 'papyrus');
    const hardSkillsList = isPapyrus ? window.HARD_SKILLS_PAPYRUS : window.HARD_SKILLS_QUADIENT;
    const kpiList        = isPapyrus ? window.KPI_PAPYRUS         : window.KPI_QUADIENT;
    const ruotaMacroList = isPapyrus ? window.RUOTA_MACRO_PAPYRUS : window.RUOTA_MACRO_QUADIENT;
    const variante       = isPapyrus ? 'PAPYRUS' : 'QUADIENT';

    document.getElementById('saveStatus').style.display = 'none';
    document.getElementById('appMain').innerHTML =
      '<div class="placeholder-page"><h2>Caricamento colloquio…</h2><p>Sto caricando autovalutazione e valutazione</p></div>';

    // Carica in parallelo le due schede
    const Y = window.state.year, Q = window.state.quarter;
    const [auto, val] = await Promise.all([
      window.Storage.loadScheda(targetSlug, Y, Q, 'autovalutazione'),
      window.Storage.loadScheda(targetSlug, Y, Q, 'valutazione')
    ]);

    const autoCompiled = !!(auto.updatedAt || auto.submittedAt);
    const valCompiled  = !!(val.updatedAt  || val.submittedAt);

    let warning = '';
    if (!autoCompiled && !valCompiled) {
      warning = 'Nessuna delle due schede è stata compilata.';
    } else if (!autoCompiled) {
      warning = 'L\'utente non ha ancora compilato la sua autovalutazione.';
    } else if (!valCompiled) {
      warning = 'Tu non hai ancora compilato la valutazione responsabile.';
    }

    // Render principale
    const main = document.getElementById('appMain');
    main.innerHTML =
      '<div class="page-head">' +
        '<div style="margin-bottom:8px;"><a href="#/team" class="nav-link" style="padding:0;font-size:13px;">&larr; Torna al team</a></div>' +
        '<div class="page-eyebrow">Colloquio · ' + Y + ' · ' + Q + ' · ' + target.displayName + '</div>' +
        '<h1 class="page-title">Vista <span class="accent">colloquio</span> &mdash; ' + target.displayName + '</h1>' +
        '<p class="page-sub">' +
          '<span style="display:inline-block;background:var(--accent);color:white;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-right:8px;">' + variante + '</span>' +
          target.ruolo + ' · confronto autovalutazione e valutazione responsabile' +
        '</p>' +
      '</div>' +

      // Legenda
      '<div class="colloquio-legend">' +
        '<span class="lg-item"><span class="lg-swatch auto"></span>Autovalutazione (' + target.displayName + ')</span>' +
        '<span class="lg-item"><span class="lg-swatch val"></span>Valutazione responsabile</span>' +
        '<span class="lg-item"><span class="lg-swatch expected"></span>Obiettivo di crescita</span>' +
        (warning ? '<span class="lg-warning">⚠ ' + warning + '</span>' : '') +
      '</div>' +

      // Sezioni comparative rating
      renderCompareSection('01', 'Soft Skills',
        'Come l\'utente e il responsabile percepiscono le dimensioni relazionali, organizzative e di atteggiamento.',
        window.SOFT_SKILLS, auto.softSkills, val.softSkills) +

      renderCompareSection('02', 'Hard Skills · competenze tecniche',
        'Stack tecnologico e capacità tecniche specifiche del ruolo.',
        hardSkillsList, auto.hardSkills, val.hardSkills) +

      renderEpisodi(auto, val) +

      renderCompareSection('03', 'Skill Operative · KPI Performance',
        'Organizzazione, gestione del tempo e produttività.',
        kpiList, auto.kpi, val.kpi) +

      // Sezioni libere (solo utente)
      renderFreeSection('04', 'Obiettivi individuali per il trimestre',
        'Compilati dall\'utente in autovalutazione', [
          { label: 'Obiettivo prioritario', hint: 'Crescita professionale', value: auto.obiettivoPrioritario },
          { label: 'Obiettivo secondario', hint: 'Crescita personale',    value: auto.obiettivoSecondario }
        ]) +

      renderFreeSection('05', 'Proposte migliorative', 'Voce libera dell\'utente', [
        { label: 'Idee migliorative per l\'azienda', hint: 'Processi, strumenti, ambiente di lavoro', value: auto.proposteAzienda },
        { label: 'Una mia idea concreta per il 2026', hint: 'Proposta realizzabile, non un desiderio', value: auto.proposteIdea }
      ]) +

      renderFreeSection('06', 'Richieste e feedback specifici', 'Voce libera dell\'utente', [
        { label: 'Hai qualche richiesta particolare da fare ai tuoi responsabili, e all\'azienda?', hint: 'Formazione, strumenti, condizioni', value: auto.richiesteAzienda },
        { label: 'Rapporto con i colleghi', hint: 'Segnalazioni positive o negative, collaborazione', value: auto.richiesteColleghi },
        { label: 'Il responsabile potrebbe…', hint: 'Cosa farebbe la differenza nel supporto quotidiano', value: auto.proposteResponsabile }
      ]) +

      // Ruota performance
      renderRuotaSection() +

      // Footer info
      '<p style="text-align:center;color:var(--ink-mute);font-size:13px;margin-top:24px;">' +
        'Questa vista è privata dell\'admin. L\'utente non vede mai la valutazione responsabile.' +
      '</p>';

    // Distrugge eventuale Chart precedente e crea il nuovo radar
    setTimeout(() => buildRadarChart(auto, val, ruotaMacroList), 50);
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────

  function renderCompareSection(num, title, desc, items, autoData, valData) {
    autoData = autoData || {};
    valData  = valData  || {};
    const rows = items.map((item, idx) => {
      const a = autoData[idx] || autoData[String(idx)] || null;
      const v = valData[idx]  || valData[String(idx)]  || null;
      let delta = '—', deltaClass = '';
      let rowClass = '';
      if (a != null && v != null) {
        const d = a - v;
        delta = (d > 0 ? '+' : '') + d;
        if (d === 0) {
          deltaClass = 'aligned';
        } else if (Math.abs(d) === 1) {
          deltaClass = 'small';
          rowClass = ' class="row-diverge row-diverge-small"';
        } else {
          deltaClass = 'high';
          rowClass = ' class="row-diverge row-diverge-high"';
        }
      }
      return '<tr' + rowClass + '>' +
        '<td>' + item + '</td>' +
        '<td class="col-auto-cell">' + renderPill(a) + '</td>' +
        '<td class="col-val-cell">'  + renderPill(v) + '</td>' +
        '<td class="delta-cell ' + deltaClass + '">' + delta + '</td>' +
      '</tr>';
    }).join('');

    return '<section class="compare-section" id="cmp-' + num + '">' +
      '<div class="section-head">' +
        '<span class="section-num">' + num + '</span>' +
        '<span class="section-title">' + title + '</span>' +
        '<div class="section-desc">' + desc + '</div>' +
      '</div>' +
      '<table class="compare-table">' +
        '<thead><tr>' +
          '<th>Descrizione</th>' +
          '<th class="col-auto">Auto</th>' +
          '<th class="col-val">Responsabile</th>' +
          '<th>Δ</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</section>';
  }

  function renderPill(level) {
    if (level == null) return '<span class="rating-pill empty">—</span>';
    const labels = window.RATING_LABELS;
    return '<span class="rating-pill r' + level + '">' + labels[level - 1] + '</span>';
  }

  function renderEpisodi(auto, val) {
    const a = (auto.episodiNote || '').trim();
    const v = (val.episodiNote  || '').trim();
    if (!a && !v) return '';
    return '<section class="compare-section">' +
      '<div class="section-head"><span class="section-title">Episodi concreti · note</span></div>' +
      (a ? '<div class="free-text-block">' +
        '<span class="ft-label" style="color:var(--auto-color);">📘 Utente</span>' +
        '<div class="ft-content">' + escapeHtml(a) + '</div></div>' : '') +
      (v ? '<div class="free-text-block">' +
        '<span class="ft-label" style="color:var(--val-color);">📕 Responsabile</span>' +
        '<div class="ft-content" style="border-left-color:var(--val-color);">' + escapeHtml(v) + '</div></div>' : '') +
    '</section>';
  }

  function renderFreeSection(num, title, hint, fields) {
    const blocks = fields.map(f => {
      const value = (f.value || '').trim();
      return '<div class="free-text-block">' +
        '<span class="ft-label">' + f.label + '</span>' +
        (f.hint ? '<span class="ft-hint">' + f.hint + '</span>' : '') +
        '<div class="ft-content' + (value ? '' : ' empty') + '">' +
          (value ? escapeHtml(value) : '(l\'utente non ha compilato questo campo)') +
        '</div>' +
      '</div>';
    }).join('');

    return '<section class="compare-section" id="cmp-' + num + '">' +
      '<div class="section-head">' +
        '<span class="section-num">' + num + '</span>' +
        '<span class="section-title">' + title + '</span>' +
        '<div class="section-desc">' + hint + '</div>' +
      '</div>' +
      blocks +
    '</section>';
  }

  function renderRuotaSection() {
    return '<section class="ruota-section" id="cmp-07">' +
      '<div class="section-head">' +
        '<span class="section-num">07</span>' +
        '<span class="section-title">Ruota riepilogativa</span>' +
        '<div class="section-desc">Confronto su 8 macro-aree, punteggio 0-10. Passa il mouse su una voce della legenda in alto per evidenziarne l\'area nel radar.</div>' +
      '</div>' +
      '<div class="ruota-grid">' +
        '<div class="ruota-canvas-wrap"><canvas id="ruotaRadar"></canvas></div>' +
        '<div class="ruota-stats" id="ruotaStats"></div>' +
      '</div>' +
      '<div id="divergenzeHost"></div>' +
    '</section>';
  }

  // ─────────────────────────────────────────────────────────────────────
  // RADAR CHART
  // ─────────────────────────────────────────────────────────────────────
  function buildRadarChart(auto, val, ruotaMacroList) {
    const canvas = document.getElementById('ruotaRadar');
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
      canvas.parentElement.innerHTML = '<p style="color:var(--ink-mute);padding:20px;">Chart.js non caricato — verifica la connessione di rete.</p>';
      return;
    }

    const macros = ruotaMacroList || window.RUOTA_MACRO_QUADIENT;
    // Determino la variante per il calcolo: rimando al primo macro["titolo"]
    // (più affidabile: leggo dal target già caricato in renderColloquio).
    const variante = (macros[4] && macros[4].titolo === 'Papyrus core') ? 'papyrus' : 'quadient';

    // Le ruote di auto e val sono CALCOLATE dalle 3 sezioni (Soft+Hard+KPI).
    // expectedVals viene dalla scheda valutazione (impostato dall'admin).
    const autoVals     = window.computeRuotaFromScheda(auto, variante);
    const valVals      = window.computeRuotaFromScheda(val,  variante);
    const expectedVals = macros.map((_, i) => {
      const r = val.expectedRuota;
      if (!r) return null;
      const v = (r[i] != null) ? r[i] : r[String(i)];
      return (v != null && v >= 0 && v <= 10) ? v : null;
    });
    const hasExpected = expectedVals.some(v => v != null);

    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

    const datasets = [
      {
        label: 'Autovalutazione',
        data: autoVals,
        backgroundColor: 'rgba(59,130,246,0.20)',
        borderColor: '#3B82F6',
        borderWidth: 2.5,
        pointBackgroundColor: '#3B82F6',
        pointRadius: 4,
        pointHoverRadius: 9,
        pointHoverBorderWidth: 3,
        pointHoverBorderColor: '#FFFFFF',
        fill: true
      },
      {
        label: 'Responsabile',
        data: valVals,
        backgroundColor: 'rgba(194,106,75,0.20)',
        borderColor: '#C26A4B',
        borderWidth: 2,
        pointBackgroundColor: '#C26A4B',
        pointStyle: 'triangle',
        pointRadius: 5,
        pointHoverRadius: 10,
        pointHoverBorderWidth: 3,
        pointHoverBorderColor: '#FFFFFF',
        borderDash: [5, 3],
        fill: true
      }
    ];

    if (hasExpected) {
      datasets.push({
        label: 'Obiettivo',
        data: expectedVals.map(v => v == null ? 0 : v),
        backgroundColor: 'rgba(61,107,82,0.12)',
        borderColor: '#3D6B52',
        borderWidth: 2,
        pointBackgroundColor: '#3D6B52',
        pointStyle: 'rectRot',
        pointRadius: 4,
        pointHoverRadius: 9,
        pointHoverBorderWidth: 3,
        pointHoverBorderColor: '#FFFFFF',
        borderDash: [2, 4],
        fill: true
      });
    }

    chartInstance = new Chart(canvas.getContext('2d'), {
      type: 'radar',
      data: {
        labels: macros.map(m => m.titolo),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        scales: {
          r: {
            min: 0, max: 10,
            ticks: { stepSize: 2, font: { size: 10, family: 'Manrope' }, color: '#8C8576', backdropColor: 'transparent' },
            pointLabels: { font: { size: 11.5, family: 'Manrope', weight: '600' }, color: '#1A1A18' },
            grid:       { color: 'rgba(140,133,118,0.4)' },
            angleLines: { color: 'rgba(140,133,118,0.6)' }
          }
        }
      }
    });

    // Stats + divergenze
    renderStats(autoVals, valVals, expectedVals);
    renderDivergenze(macros, autoVals, valVals);
    // Hover sulla legenda principale (Auto/Resp/Obiettivo) → evidenzia
    // l'intera area del dataset corrispondente nel radar.
    setupLegendHover();
  }

  /**
   * Aggancia gli handler hover a tutti gli elementi che rappresentano un dataset:
   *  - Legenda principale (.lg-item nei primi N)
   *  - Stat row laterali (.stat-row.auto, .val, .expected)
   * Indici dataset:
   *   0 = Autovalutazione   (lg auto · stat.auto)
   *   1 = Responsabile      (lg val · stat.val)
   *   2 = Obiettivo         (lg expected · stat.expected, solo se presente)
   */
  function setupLegendHover() {
    if (!chartInstance) return;

    // Salvo i background, borderWidth E il fill originali per il ripristino
    const originals = chartInstance.data.datasets.map(ds => ({
      bg: ds.backgroundColor,
      bw: ds.borderWidth,
      fill: ds.fill
    }));

    const dim = 'rgba(140,133,118,0.06)';   // grigio neutro per i dataset "spenti"
    const gapColor = 'rgba(217,119,6,0.45)'; // ambra translucido per l'area-gap

    // Hover su un singolo dataset (Auto/Resp/Obiettivo): evidenzia quello,
    // smorza gli altri.
    const highlight = (focusIdx) => {
      chartInstance.data.datasets.forEach((ds, i) => {
        if (i === focusIdx) {
          ds.backgroundColor = bumpAlpha(originals[i].bg, 0.55);
          ds.borderWidth = (originals[i].bw || 2) + 1;
        } else {
          ds.backgroundColor = dim;
          ds.borderWidth = 1;
        }
        ds.fill = originals[i].fill;  // fill resta quello originario
      });
      chartInstance.update('none');
    };

    // Hover sulla card "Gap resp→target" (o "Gap auto-resp" se manca expected):
    // l'area TRA i due dataset viene riempita in ambra, gli altri smorzati.
    const highlightGap = (fromIdx, toIdx) => {
      chartInstance.data.datasets.forEach((ds, i) => {
        if (i === fromIdx) {
          // Dataset di partenza: borda forte, niente fill verso il centro,
          // bensì un riempimento mirato verso il dataset target.
          ds.backgroundColor = gapColor;
          ds.borderWidth = (originals[i].bw || 2) + 1;
          ds.fill = { target: toIdx };
        } else if (i === toIdx) {
          // Dataset target: borda forte, fill verso il centro neutralizzato
          // così l'ambra del gap resta nitida.
          ds.backgroundColor = 'rgba(0,0,0,0)';
          ds.borderWidth = (originals[i].bw || 2) + 1;
          ds.fill = originals[i].fill;
        } else {
          // Tutti gli altri (es. Autovalutazione) smorzati.
          ds.backgroundColor = dim;
          ds.borderWidth = 1;
          ds.fill = originals[i].fill;
        }
      });
      chartInstance.update('none');
    };

    const reset = () => {
      chartInstance.data.datasets.forEach((ds, i) => {
        ds.backgroundColor = originals[i].bg;
        ds.borderWidth = originals[i].bw;
        ds.fill = originals[i].fill;
      });
      chartInstance.update('none');
    };

    // Lista di [el, idx] da agganciare (legenda + stat-row dei dataset)
    const targets = [];
    document.querySelectorAll('.colloquio-legend .lg-item').forEach((el, idx) => {
      if (idx < chartInstance.data.datasets.length) {
        el.classList.add('lg-interactive');
        targets.push({ el, idx });
      }
    });
    // Stat-row laterali: classe → indice dataset
    const statMap = [
      { sel: '.ruota-stats .stat-row.auto',     idx: 0 },
      { sel: '.ruota-stats .stat-row.val',      idx: 1 },
      { sel: '.ruota-stats .stat-row.expected', idx: 2 }
    ];
    statMap.forEach(({ sel, idx }) => {
      if (idx >= chartInstance.data.datasets.length) return;
      const el = document.querySelector(sel);
      if (!el) return;
      el.classList.add('stat-row-interactive');
      targets.push({ el, idx });
    });

    targets.forEach(({ el, idx }) => {
      el.addEventListener('mouseenter', () => { el.classList.add('active'); highlight(idx); });
      el.addEventListener('mouseleave', () => { el.classList.remove('active'); reset(); });
    });

    // === Gap card: hover evidenzia l'AREA tra due dataset ====================
    const gapEl = document.querySelector('.ruota-stats .stat-row.gap');
    if (gapEl) {
      // Se c'è il dataset Obiettivo (idx 2): gap = resp (1) → obiettivo (2).
      // Altrimenti: gap = auto (0) → resp (1).
      const hasExpected = chartInstance.data.datasets.length > 2;
      const fromIdx = hasExpected ? 1 : 0;
      const toIdx   = hasExpected ? 2 : 1;

      gapEl.classList.add('stat-row-interactive');
      gapEl.addEventListener('mouseenter', () => {
        gapEl.classList.add('active');
        highlightGap(fromIdx, toIdx);
      });
      gapEl.addEventListener('mouseleave', () => {
        gapEl.classList.remove('active');
        reset();
      });
    }
  }

  /** Sostituisce l'alpha in una stringa rgba(...) con il valore voluto. */
  function bumpAlpha(rgbaStr, newAlpha) {
    if (typeof rgbaStr !== 'string') return rgbaStr;
    const m = rgbaStr.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/);
    if (!m) return rgbaStr;
    return 'rgba(' + m[1] + ',' + m[2] + ',' + m[3] + ',' + newAlpha + ')';
  }

  function renderStats(autoVals, valVals, expectedVals) {
    const host = document.getElementById('ruotaStats');
    if (!host) return;
    const avg = arr => (arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(1);
    const ma = avg(autoVals);
    const mv = avg(valVals);
    const gap = (parseFloat(ma) - parseFloat(mv)).toFixed(1);

    let html =
      '<div class="stat-row auto"><span class="stat-label">Media auto</span><span class="stat-value">' + ma + '</span></div>' +
      '<div class="stat-row val"><span class="stat-label">Media resp</span><span class="stat-value">'  + mv + '</span></div>';

    const expValid = (expectedVals || []).filter(v => v != null);
    if (expValid.length > 0) {
      const me = (expValid.reduce((s, x) => s + x, 0) / expValid.length).toFixed(1);
      const gapTarget = (parseFloat(me) - parseFloat(mv)).toFixed(1);
      html +=
        '<div class="stat-row expected"><span class="stat-label">Obiettivo</span><span class="stat-value">' + me + '</span></div>' +
        '<div class="stat-row gap"><span class="stat-label">Gap resp→target</span><span class="stat-value">' + (gapTarget > 0 ? '+' : '') + gapTarget + '</span></div>';
    } else {
      html +=
        '<div class="stat-row gap"><span class="stat-label">Gap auto-resp</span><span class="stat-value">' + (gap > 0 ? '+' : '') + gap + '</span></div>';
    }
    host.innerHTML = html;
  }

  function renderDivergenze(macros, autoVals, valVals) {
    const host = document.getElementById('divergenzeHost');
    if (!host) return;
    const list = macros.map((m, i) => {
      const a = autoVals[i], v = valVals[i];
      return { titolo: m.titolo, a: a, v: v, d: a - v };
    }).filter(x => x.a > 0 || x.v > 0);

    if (list.length === 0) { host.innerHTML = ''; return; }
    list.sort((x, y) => Math.abs(y.d) - Math.abs(x.d));

    const items = list.map(x => {
      const aligned = Math.abs(x.d) < 0.5;
      const cls = aligned ? 'aligned' : '';
      const tag = aligned
        ? '<span class="delta-tag" style="background:var(--sage);">allineati</span>'
        : '<span class="delta-tag">Δ ' + (x.d > 0 ? '+' : '') + x.d.toFixed(1) + '</span>';
      return '<li class="' + cls + '">' +
        '<b>' + x.titolo + '</b> &nbsp;' +
        'auto <span class="auto-b">' + x.a.toFixed(1) + '</span> · ' +
        'resp <span class="val-b">' + x.v.toFixed(1) + '</span>' +
        tag +
      '</li>';
    }).join('');

    host.innerHTML =
      '<div class="divergenze-box">' +
        '<h4>★ Divergenze e allineamenti</h4>' +
        '<ul>' + items + '</ul>' +
      '</div>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
