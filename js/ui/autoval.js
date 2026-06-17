console.log('[load] autoval');
/**
 * ColloquiTeam · ui/autoval.js
 * -------------------------------------------------------------------
 * Form Autovalutazione (Quadient). Sezioni 01-07 con stepper laterale,
 * scroll-spy, salvataggio incrementale debounced su Firebase + cache,
 * invio definitivo con conferma e lock read-only.
 *
 * In V0.3 si parametrizza per gestire variante Papyrus (basta passare
 * HARD_SKILLS_PAPYRUS al renderRatingTable di sezione 02) e modalità
 * "valutazione responsabile" (template arricchito con Punti di Attenzione).
 */

(function () {

  // Le sezioni LIBERE (04 Obiettivi, 05 Proposte, 06 Richieste) sono di
  // esclusiva competenza dell'utente: in modalità "valutazione responsabile"
  // NON vengono mostrate. L'admin le legge solo aprendo la scheda utente
  // tramite il bottone "Visualizza" del team (route #/scheda/{slug}).
  const FREE_SECTION_IDS = ['sec-04', 'sec-05', 'sec-06'];

  /**
   * Helper variante-aware: ritornano array Quadient o Papyrus
   * in base all'area del target memorizzata in formContext.
   */
  function currentHardSkills() {
    const ctx = window.state.formContext;
    if (ctx && ctx.variante === 'papyrus') return window.HARD_SKILLS_PAPYRUS;
    return window.HARD_SKILLS_QUADIENT;
  }
  function currentKpi() {
    const ctx = window.state.formContext;
    if (ctx && ctx.variante === 'papyrus') return window.KPI_PAPYRUS;
    return window.KPI_QUADIENT;
  }
  function currentRuotaMacro() {
    const ctx = window.state.formContext;
    if (ctx && ctx.variante === 'papyrus') return window.RUOTA_MACRO_PAPYRUS;
    return window.RUOTA_MACRO_QUADIENT;
  }

  // ─────────────────────────────────────────────────────────────────────
  // ENTRY POINTS — 3 modalità sopra il medesimo form
  //
  //   renderAutovalutazione()       utente compila la sua autovalutazione
  //   renderViewScheda(slug)        admin visualizza in sola lettura
  //                                 l'autovalutazione di un altro
  //   renderValutazione(slug)       admin compila la valutazione
  //                                 responsabile per un membro del team
  //
  // Internamente delegano a _renderForm({ targetSlug, tipo, mode }).
  // ─────────────────────────────────────────────────────────────────────

  window.renderAutovalutazione = () => _renderForm({
    targetSlug: window.state.currentUser.slug,
    tipo: 'autovalutazione',
    mode: 'edit'
  });

  window.renderViewScheda = (slug) => _renderForm({
    targetSlug: slug,
    tipo: 'autovalutazione',
    mode: 'view'
  });

  window.renderValutazione = (slug) => _renderForm({
    targetSlug: slug,
    tipo: 'valutazione',
    mode: 'edit'
  });

  // ─────────────────────────────────────────────────────────────────────
  // FORM RENDER — funzione centrale parametrizzata
  // ─────────────────────────────────────────────────────────────────────
  async function _renderForm({ targetSlug, tipo, mode }) {
    const me = window.state.currentUser;
    const target = window.Users.findBySlug(targetSlug);
    if (!target) {
      window.renderPlaceholder('Utente non trovato', 'Slug "' + targetSlug + '" non presente in /users.');
      return;
    }

    // Guard: solo gli admin possono operare su utenti diversi da sé,
    // e solo nella loro area (o se sono area:all).
    if (targetSlug !== me.slug) {
      if (me.role !== 'admin') {
        window.Router.navigate('/home');
        return;
      }
      if (me.area !== 'all' && me.area !== target.area && target.area !== 'all') {
        window.renderPlaceholder('Accesso negato', 'Questo utente non è nella tua area di competenza.');
        return;
      }
    }

    // Salvo il contesto per save / submit
    window.state.formContext = { targetSlug, tipo, mode, target };

    // Cleanup chart precedente (cambio scheda/utente)
    if (previewChart) { previewChart.destroy(); previewChart = null; }

    // Variante Hard Skills: scelta in base all'area del target.
    // - papyrus    → HARD_SKILLS_PAPYRUS
    // - quadient   → HARD_SKILLS_QUADIENT
    // - all        → default Quadient (admin senza area specifica)
    const variante = (target.area === 'papyrus') ? 'papyrus' : 'quadient';
    window.state.formContext.variante = variante;

    document.getElementById('appMain').innerHTML =
      '<div class="placeholder-page"><h2>Caricamento scheda…</h2><p>Connessione a Firebase</p></div>';

    window.state.scheda = await window.Storage.loadScheda(
      targetSlug, window.state.year, window.state.quarter, tipo
    );
    window.state.lockedAt = window.state.scheda.lockedAt;

    // L'admin compila la sua valutazione in modo INDIPENDENTE dall'utente.
    // Il confronto tra autoval e val avviene solo nella vista colloquio.
    // Le sezioni libere (04/05/06) sono dunque omesse dal form valutazione.
    const showFreeSections = (tipo !== 'valutazione');

    // Header dinamico per modalità
    const isView      = mode === 'view';
    const isValutaz   = tipo === 'valutazione';
    const tipoLabel   = isValutaz ? 'valutazione responsabile' : 'autovalutazione';
    const eyebrow     = (isView ? 'Sola lettura · ' : '') +
                        'Colloquio trimestrale · ' + window.state.year + ' · ' + window.state.quarter +
                        (targetSlug !== me.slug ? ' · ' + target.displayName : '');
    const varianteBadge =
      '<span style="display:inline-block;background:var(--accent);color:white;' +
      'padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;' +
      'letter-spacing:.1em;text-transform:uppercase;margin-right:8px;">' +
      (variante === 'papyrus' ? 'PAPYRUS' : 'QUADIENT') + '</span>';

    const titleHTML   = isView
      ? 'Lettura <span class="accent">' + tipoLabel + '</span> &mdash; ' + target.displayName
      : 'Scheda <span class="accent">' + tipoLabel + '</span> &mdash; ' + target.displayName;
    const subSub      = (isView
      ? '<span style="background:var(--ink-soft);color:white;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-right:8px;">SOLA LETTURA</span>'
      : '') + varianteBadge + target.ruolo;
    const backLink    = (me.role === 'admin' && targetSlug !== me.slug)
      ? '<a href="#/team" class="nav-link" style="padding:0;font-size:13px;">&larr; Torna al team</a>'
      : '';

    const main = document.getElementById('appMain');
    main.innerHTML =
      '<div class="page-head">' +
        (backLink ? '<div style="margin-bottom:8px;">' + backLink + '</div>' : '') +
        '<div class="page-eyebrow">' + eyebrow + '</div>' +
        '<h1 class="page-title">' + titleHTML + '</h1>' +
        '<p class="page-sub">' + subSub + '</p>' +
      '</div>' +
      '<div class="autoval-layout">' +
        renderStepper(showFreeSections) +
        '<form id="schedaForm" onsubmit="return false;">' +
          renderSection01() +
          renderSection02() +
          renderSection03() +
          (showFreeSections ? renderSection04() : '') +
          (showFreeSections ? renderSection05() : '') +
          (showFreeSections ? renderSection06() : '') +
          (isValutaz ? renderRuotaPreview('04') : '') +
          renderSection07() +
          (isView ? '' : renderSubmitBar()) +
        '</form>' +
      '</div>';

    if (!isView) {
      setupFormBindings();
    }
    setupStepperLinks();
    fillFormFromState();
    setupScrollSpy();
    if (!isView) {
      showSaveStatus();
      updateProgress();
    } else {
      document.getElementById('saveStatus').style.display = 'none';
    }

    // Read-only: disabilito tutti i controlli del form
    if (isView || window.state.lockedAt) {
      document.querySelectorAll('#schedaForm input, #schedaForm textarea, #schedaForm button.btn-primary')
        .forEach(el => el.disabled = true);
      const submitBtn = document.getElementById('submitBtn');
      if (submitBtn) {
        submitBtn.textContent = isView
          ? '🔒 Sola lettura'
          : '🔒 Scheda inviata il ' + new Date(window.state.lockedAt).toLocaleDateString('it-IT');
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: STEPPER
  // ─────────────────────────────────────────────────────────────────────
  function renderStepper(showFreeSections) {
    const ctx = window.state.formContext;
    const isValutaz = (ctx && ctx.tipo === 'valutazione');

    // Etichetta sezione 04 / 07 dipende dalla modalità:
    //  - autoval/view: 04 = Obiettivi (free, mostrata), 07 = Anteprima ruota
    //  - valutazione : 04 = Anteprima ruota (calcolata), 07 = Obiettivi crescita
    const sec04label = isValutaz ? 'Anteprima ruota' : 'Obiettivi';
    const sec07label = isValutaz ? 'Obiettivi crescita' : 'Anteprima ruota';

    // showFreeSections decide la visibilità di 04/05/06 free; in valutazione
    // mostriamo comunque sec-04 (ma con label "Anteprima ruota"), non 05/06.
    const allItems = [
      ['01','Soft Skills',   true],
      ['02','Hard Skills',   true],
      ['03','KPI Operative', true],
      ['04', sec04label,     showFreeSections || isValutaz],
      ['05','Proposte',      showFreeSections],
      ['06','Richieste',     showFreeSections],
      ['07', sec07label,     true]
    ];
    const items = allItems
      .filter(it => it[2] === true)
      .map(it => [it[0], it[1]]);
    return '<aside class="stepper" id="stepper">' +
      '<div class="stepper-title">Sezioni</div>' +
      items.map((it, i) =>
        '<a href="#sec-' + it[0] + '" class="step-item ' + (i === 0 ? 'active' : '') +
        '" data-target="sec-' + it[0] + '">' +
        '<span class="step-num">' + it[0] + '</span> ' + it[1] +
        ' <span class="step-tick">&check;</span></a>'
      ).join('') +
    '</aside>';
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: RATING TABLE (5 livelli)
  // ─────────────────────────────────────────────────────────────────────
  function renderRatingTable(idPrefix, items) {
    const head = '<tr><th>Descrizione</th>' +
      window.RATING_LABELS.map((lbl, i) =>
        '<th class="col-' + (i + 1) + '">' + lbl + '</th>'
      ).join('') +
      '</tr>';

    const body = items.map((item, idx) =>
      '<tr><td>' + item + '</td>' +
      [1,2,3,4,5].map(v =>
        '<td class="rating-cell" data-rating="' + v + '">' +
          '<input type="radio" name="' + idPrefix + '-' + idx + '" id="' + idPrefix + '-' + idx + '-' + v +
            '" value="' + v + '" data-field="' + idPrefix + '" data-idx="' + idx + '">' +
          '<label for="' + idPrefix + '-' + idx + '-' + v + '" aria-label="' + window.RATING_LABELS[v-1] + '"></label>' +
        '</td>'
      ).join('') +
      '</tr>'
    ).join('');

    return '<table class="rating-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: SEZIONI 01-07
  // ─────────────────────────────────────────────────────────────────────
  function sectionHead(num, title, desc) {
    return '<div class="section-head">' +
      '<span class="section-num">' + num + '</span>' +
      '<span class="section-title">' + title + '</span>' +
      (desc ? '<div class="section-desc">' + desc + '</div>' : '') +
    '</div>';
  }

  function fieldTextarea(id, fieldName, label, hint, placeholder) {
    return '<label class="field-label" for="' + id + '">' + label + '</label>' +
      (hint ? '<span class="field-hint">' + hint + '</span>' : '') +
      '<textarea class="field-textarea" id="' + id + '" data-field-text="' + fieldName +
      '" placeholder="' + (placeholder || '') + '"></textarea>';
  }

  function renderSection01() {
    return '<section class="form-section" id="sec-01">' +
      sectionHead('01', 'Soft Skills', 'Come ti percepisci nelle dimensioni relazionali, organizzative e di atteggiamento.') +
      renderRatingTable('soft', window.SOFT_SKILLS) +
      fieldTextarea('episodiNote', 'episodiNote',
        'Episodi concreti · note',
        'Un esempio reale rende il giudizio più solido',
        'Racconta un episodio significativo del trimestre…') +
    '</section>';
  }

  function renderSection02() {
    return '<section class="form-section" id="sec-02">' +
      sectionHead('02', 'Hard Skills · competenze tecniche',
        'Stack tecnologico, strumenti e capacità tecniche specifiche del ruolo.') +
      renderRatingTable('hard', currentHardSkills()) +
      fieldTextarea('statoHard', 'statoAvanzamentoHard',
        'Stato avanzamento e prossimi step',
        'Dove sono, dove vorrei arrivare entro fine trimestre',
        'Descrivi il tuo percorso tecnico…') +
    '</section>';
  }

  function renderSection03() {
    return '<section class="form-section" id="sec-03">' +
      sectionHead('03', 'Skill Operative · KPI Performance',
        'Organizzazione, gestione del tempo e produttività.') +
      renderRatingTable('kpi', currentKpi()) +
      fieldTextarea('statoKpi', 'statoAvanzamentoKpi',
        'Stato avanzamento e prossimi step',
        'Dove sono, dove voglio arrivare entro fine trimestre',
        'Descrivi il tuo approccio operativo…') +
    '</section>';
  }

  function renderSection04() {
    return '<section class="form-section" id="sec-04">' +
      sectionHead('04', 'Obiettivi individuali per il trimestre successivo',
        'Se vuoi, proponi due macro obiettivi per il tuo percorso: crescita professionale e personale.') +
      fieldTextarea('objPrior', 'obiettivoPrioritario',
        'Obiettivo prioritario', 'Crescita professionale',
        'Es. consolidare scripting avanzato in Inspire Interactive…') +
      fieldTextarea('objSec', 'obiettivoSecondario',
        'Obiettivo secondario', 'Crescita personale',
        'Es. migliorare la presentazione di un progetto in inglese…') +
    '</section>';
  }

  function renderSection05() {
    return '<section class="form-section" id="sec-05">' +
      sectionHead('05', 'Proposte migliorative', null) +
      fieldTextarea('propAz', 'proposteAzienda',
        'Idee migliorative per l\'azienda',
        'Processi, strumenti, ambiente di lavoro…', '') +
      fieldTextarea('propIdea', 'proposteIdea',
        'Una mia idea concreta per il 2026',
        'Una proposta realizzabile, non un desiderio', '') +
    '</section>';
  }

  function renderSection06() {
    return '<section class="form-section" id="sec-06">' +
      sectionHead('06', 'Richieste e feedback specifici', null) +
      fieldTextarea('richAz', 'richiesteAzienda',
        'Hai qualche richiesta particolare da fare ai tuoi responsabili, e all\'azienda?',
        'Formazione, strumenti, condizioni — una richiesta chiara, motivata dal tipo di lavoro svolto',
        '') +
      fieldTextarea('richColl', 'richiesteColleghi',
        'Rapporto con i colleghi',
        'Segnalazioni particolari, positive o negative. Un tipo di collaborazione, un\'informazione, un comportamento', '') +
      fieldTextarea('propResp', 'proposteResponsabile',
        'Il responsabile potrebbe…',
        'Cosa farebbe la differenza nel supporto quotidiano', '') +
    '</section>';
  }

  /**
   * Sezione 07 dipende dalla modalità:
   *  - autovalutazione / view:  anteprima ruota calcolata da Soft+Hard+KPI
   *  - valutazione responsabile: form "Obiettivi di crescita" (8 macro × 0-10),
   *    salvati in scheda.expectedRuota
   */
  function renderSection07() {
    const ctx = window.state.formContext;
    if (ctx && ctx.tipo === 'valutazione') {
      return renderSection07Obiettivi();
    }
    return renderRuotaPreview('07');
  }

  /**
   * Anteprima ruota calcolata.
   * @param {string} num  numero sezione visualizzato (default '07' per autoval/view,
   *                      '04' quando inserita nel form valutazione)
   */
  function renderRuotaPreview(num) {
    num = num || '07';
    return '<section class="form-section" id="sec-' + num + '">' +
      sectionHead(num, 'Ruota riepilogativa · anteprima',
        'Calcolata automaticamente in base alle voci compilate nelle sezioni 01 Soft Skills, 02 Hard Skills e 03 KPI. Si aggiorna in tempo reale.') +
      '<div class="ruota-preview-layout">' +
        '<div class="ruota-preview-chart"><canvas id="ruotaPreviewCanvas"></canvas></div>' +
        '<div id="ruotaPreviewHost" class="ruota-preview"></div>' +
      '</div>' +
    '</section>';
  }

  // Istanza Chart.js della mini-ruota anteprima (singleton per pagina)
  let previewChart = null;

  function renderSection07Obiettivi() {
    const headerCols = Array.from({length:11}, (_,i) => '<th>' + i + '</th>').join('');
    const rows = currentRuotaMacro().map((m, idx) => {
      const radios = Array.from({length:11}, (_,v) =>
        '<td>' +
          '<input type="radio" class="ruota-radio" name="expruota-' + idx + '" id="expruota-' + idx + '-' + v +
            '" value="' + v + '" data-field="expectedRuota" data-idx="' + idx + '">' +
          '<label for="expruota-' + idx + '-' + v + '" aria-label="' + v + '"></label>' +
        '</td>'
      ).join('');
      return '<tr><td class="macro-name"><b>' + m.titolo + '</b><span>' + m.voci + '</span></td>' + radios + '</tr>';
    }).join('');

    return '<section class="form-section" id="sec-07">' +
      sectionHead('07', 'Obiettivi di crescita · ruota target',
        'Punteggio 0–10 per macro-area: il livello che ti aspetti l\'utente raggiunga. Questi valori saranno mostrati come riferimento nella vista colloquio, sovrapposti a auto e val.') +
      '<table class="ruota-table"><thead><tr><th>Macro-area</th>' + headerCols + '</tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
    '</section>';
  }

  /**
   * Aggiorna l'anteprima ruota (modalità auto/view): radar Chart.js a sinistra
   * + lista barre orizzontali a destra. Chiamata dopo ogni cambio rating.
   */
  function updateRuotaPreview() {
    const host = document.getElementById('ruotaPreviewHost');
    if (!host) return;  // non in modalità preview
    const ctx = window.state.formContext;
    const variante = (ctx && ctx.variante) || 'quadient';
    const macros = currentRuotaMacro();
    const values = window.computeRuotaFromScheda(window.state.scheda, variante);

    // ── Lista card: una card per macro-area ──
    host.innerHTML = macros.map((m, i) => {
      const v = values[i] || 0;
      const pct = Math.max(2, v * 10);
      // Tono valore in base a soglia (≥7 ok, 4-6.99 medio, <4 critico)
      const tone = v >= 7 ? 'good' : v >= 4 ? 'mid' : 'low';
      return '<div class="ruota-card tone-' + tone + '">' +
        '<div class="ruota-card-head">' +
          '<div class="ruota-card-text">' +
            '<div class="ruota-card-title">' + m.titolo + '</div>' +
            '<div class="ruota-card-sub">' + m.voci + '</div>' +
          '</div>' +
          '<div class="ruota-card-val">' + v.toFixed(1) + '</div>' +
        '</div>' +
        '<div class="ruota-card-bar"><div class="ruota-card-fill" style="width:' + pct + '%"></div></div>' +
      '</div>';
    }).join('');

    // ── Radar Chart.js ──
    const canvas = document.getElementById('ruotaPreviewCanvas');
    if (!canvas || typeof Chart === 'undefined') return;

    if (previewChart) {
      // Aggiornamento veloce: stessi labels, nuovi dati
      previewChart.data.datasets[0].data = values;
      previewChart.update('none');
      return;
    }

    previewChart = new Chart(canvas.getContext('2d'), {
      type: 'radar',
      data: {
        labels: macros.map(m => m.titolo),
        datasets: [{
          label: 'Ruota calcolata',
          data: values,
          backgroundColor: 'rgba(139,58,26,0.18)',
          borderColor: '#8B3A1A',
          borderWidth: 2.5,
          pointBackgroundColor: '#8B3A1A',
          pointRadius: 4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
          r: {
            min: 0, max: 10,
            ticks: { stepSize: 2, font: { size: 9, family: 'Manrope' }, color: '#8C8576', backdropColor: 'transparent' },
            pointLabels: { font: { size: 10.5, family: 'Manrope', weight: '600' }, color: '#1A1A18' },
            grid:       { color: 'rgba(140,133,118,0.35)' },
            angleLines: { color: 'rgba(140,133,118,0.5)' }
          }
        }
      }
    });
  }

  function renderSubmitBar() {
    return '<div class="submit-bar">' +
      '<div class="submit-progress" id="submitProgress">Compilazione in corso&hellip;</div>' +
      '<div style="display:flex; gap:10px;">' +
        '<button class="btn-secondary" onclick="manualSave(); return false;">💾 Salva bozza</button>' +
        '<button class="btn-primary" id="submitBtn" onclick="confirmSubmit(); return false;">' +
          '✓ Invia definitivamente' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  // ─────────────────────────────────────────────────────────────────────
  // BINDINGS + STATE FILL
  // ─────────────────────────────────────────────────────────────────────
  function setupFormBindings() {
    document.querySelectorAll('#schedaForm input[type="radio"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const field = e.target.dataset.field;
        const idx = e.target.dataset.idx;
        const value = parseInt(e.target.value);
        const fieldMap = {
          soft: 'softSkills', hard: 'hardSkills', kpi: 'kpi',
          ruota: 'ruota',                    // legacy (oggi non più usato in form)
          expectedRuota: 'expectedRuota'      // nuovo: target ruota in modalità valutazione
        };
        const key = fieldMap[field];
        if (!key) return;
        if (!window.state.scheda[key]) window.state.scheda[key] = {};
        window.state.scheda[key][idx] = value;
        scheduleSave();
        updateProgress();
        updateStepperCompletion();
        updateRuotaPreview();  // aggiorna mini-anteprima se presente (modalità auto/view)
      });
    });

    document.querySelectorAll('#schedaForm textarea').forEach(ta => {
      const field = ta.dataset.fieldText;
      ta.addEventListener('input', (e) => {
        window.state.scheda[field] = e.target.value;
        scheduleSave();
        updateProgress();
        updateStepperCompletion();
      });
    });
  }

  function fillFormFromState() {
    const s = window.state.scheda;
    const prefix = {
      softSkills:    'soft',
      hardSkills:    'hard',
      kpi:           'kpi',
      expectedRuota: 'expruota'    // modalità valutazione: target ruota
    };

    ['softSkills','hardSkills','kpi','expectedRuota'].forEach(key => {
      Object.entries(s[key] || {}).forEach(([idx, val]) => {
        const radio = document.getElementById(prefix[key] + '-' + idx + '-' + val);
        if (radio) radio.checked = true;
      });
    });

    [ 'episodiNote','statoAvanzamentoHard','statoAvanzamentoKpi',
      'obiettivoPrioritario','obiettivoSecondario',
      'proposteAzienda','proposteIdea','proposteResponsabile',
      'richiesteAzienda','richiesteColleghi' ].forEach(key => {
      const ta = document.querySelector('textarea[data-field-text="' + key + '"]');
      if (ta) ta.value = s[key] || '';
    });

    updateStepperCompletion();
    updateRuotaPreview();   // primo render anteprima ruota
  }

  // ─────────────────────────────────────────────────────────────────────
  // SAVE (debounced) + STATUS
  // ─────────────────────────────────────────────────────────────────────
  function scheduleSave() {
    window.setSaveStatus('dirty');
    clearTimeout(window.state.saveTimer);
    window.state.saveTimer = setTimeout(() => saveNow(), 800);
  }

  async function saveNow() {
    if (!window.state.scheda || !window.state.formContext) return;
    const ctx = window.state.formContext;
    window.setSaveStatus('saving');
    window.state.scheda.updatedAt = Date.now();
    const res = await window.Storage.saveScheda(
      ctx.targetSlug, window.state.year, window.state.quarter,
      ctx.tipo, window.state.scheda
    );
    if (res.synced) {
      window.setSaveStatus('saved');
    } else {
      window.setSaveStatus('dirty');
      document.querySelector('#saveStatus .label').textContent = 'Solo in locale (no sync)';
    }
  }

  window.manualSave = function () {
    clearTimeout(window.state.saveTimer);
    saveNow();
    window.toast('Bozza salvata');
  };

  function showSaveStatus() {
    document.getElementById('saveStatus').style.display = 'flex';
    window.setSaveStatus('saved');
  }

  // ─────────────────────────────────────────────────────────────────────
  // PROGRESS + STEPPER COMPLETION + SUBMIT GATING
  //
  // Regola di business: per inviare definitivamente la scheda l'utente
  // DEVE aver spuntato ogni voce di rating (Soft, Hard, KPI, Ruota).
  // I textarea sono opzionali — non bloccano l'invio.
  // ─────────────────────────────────────────────────────────────────────

  /** Tutte le sezioni di rating (radio) sono completamente compilate? */
  function areAllRatingsComplete() {
    const s = window.state.scheda;
    const ctx = window.state.formContext;
    const baseOk =
         Object.keys(s.softSkills || {}).length >= window.SOFT_SKILLS.length
      && Object.keys(s.hardSkills || {}).length >= currentHardSkills().length
      && Object.keys(s.kpi || {}).length        >= currentKpi().length;
    // In modalità valutazione si richiede anche expectedRuota completa (8 macro)
    if (ctx && ctx.tipo === 'valutazione') {
      return baseOk && Object.keys(s.expectedRuota || {}).length >= currentRuotaMacro().length;
    }
    return baseOk;
  }

  /** Restituisce i nomi delle sezioni di rating ancora incomplete. */
  function missingRatingSections() {
    const s = window.state.scheda;
    const ctx = window.state.formContext;
    const m = [];
    if (Object.keys(s.softSkills || {}).length < window.SOFT_SKILLS.length)   m.push('Soft Skills');
    if (Object.keys(s.hardSkills || {}).length < currentHardSkills().length)  m.push('Hard Skills');
    if (Object.keys(s.kpi || {}).length        < currentKpi().length)         m.push('KPI Operative');
    if (ctx && ctx.tipo === 'valutazione') {
      if (Object.keys(s.expectedRuota || {}).length < currentRuotaMacro().length) m.push('Obiettivi crescita');
    }
    return m;
  }

  function updateProgress() {
    const s = window.state.scheda;
    const ctx = window.state.formContext;
    const isValutaz = (ctx && ctx.tipo === 'valutazione');

    // ── Conteggi rating (obbligatori) ─────────────────────────────────
    // Soft + Hard + KPI sempre; ruota target solo in valutazione
    let ratingsRequired = window.SOFT_SKILLS.length + currentHardSkills().length + currentKpi().length;
    let ratingsFilled =
      Object.keys(s.softSkills || {}).length +
      Object.keys(s.hardSkills || {}).length +
      Object.keys(s.kpi || {}).length;
    if (isValutaz) {
      ratingsRequired += currentRuotaMacro().length;
      ratingsFilled  += Object.keys(s.expectedRuota || {}).length;
    }

    // ── Conteggi testi (opzionali, solo info) ─────────────────────────
    const textFields = ['episodiNote','statoAvanzamentoHard','statoAvanzamentoKpi',
      'obiettivoPrioritario','obiettivoSecondario',
      'proposteAzienda','proposteIdea','proposteResponsabile',
      'richiesteAzienda','richiesteColleghi'];
    const textsFilled = textFields.filter(f => (s[f] || '').trim().length > 10).length;

    const ratingPct = Math.round(ratingsFilled / ratingsRequired * 100);
    const el = document.getElementById('submitProgress');
    if (el) {
      const allRatingsOK = ratingsFilled >= ratingsRequired;
      el.innerHTML =
        'Punteggi: <b>' + ratingsFilled + '/' + ratingsRequired + '</b> (' + ratingPct + '%) ' +
        (allRatingsOK ? '<span style="color:var(--sage);font-weight:700;">✓ pronto all\'invio</span>' :
          '<span style="color:var(--ink-mute);">— campi testo: ' + textsFilled + '/' + textFields.length + ' (opzionali)</span>');
    }

    // ── Gating del bottone Invia ──────────────────────────────────────
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn && !window.state.lockedAt) {
      const ready = areAllRatingsComplete();
      submitBtn.disabled = !ready;
      submitBtn.title = ready
        ? 'Tutte le voci di rating compilate — pronto per l\'invio'
        : 'Completa tutte le voci di rating delle sezioni: ' + missingRatingSections().join(', ');
    }
  }

  function updateStepperCompletion() {
    const s = window.state.scheda;
    const sections = [
      { id: 'sec-01', done: Object.keys(s.softSkills || {}).length >= window.SOFT_SKILLS.length },
      { id: 'sec-02', done: Object.keys(s.hardSkills || {}).length >= currentHardSkills().length },
      { id: 'sec-03', done: Object.keys(s.kpi || {}).length >= currentKpi().length },
      { id: 'sec-04', done: (s.obiettivoPrioritario || '').length > 10 && (s.obiettivoSecondario || '').length > 10 },
      { id: 'sec-05', done: (s.proposteAzienda || '').length > 10 },
      { id: 'sec-06', done: (s.richiesteAzienda || '').length > 10 },
      // Sez 07: in valutazione richiede expectedRuota completa.
      // In autoval/view è solo anteprima → sempre done.
      { id: 'sec-07',
        done: (window.state.formContext && window.state.formContext.tipo === 'valutazione')
          ? Object.keys(s.expectedRuota || {}).length >= currentRuotaMacro().length
          : true
      }
    ];
    sections.forEach(sec => {
      const item = document.querySelector('.step-item[data-target="' + sec.id + '"]');
      if (item) item.classList.toggle('completed', sec.done);
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // STEPPER CLICK → SCROLL PROGRAMMATICO
  // (gli href `#sec-XX` non possono essere lasciati al browser perché
  // collidono col router hash-based: preventDefault + scrollIntoView.)
  // ─────────────────────────────────────────────────────────────────────
  function setupStepperLinks() {
    document.querySelectorAll('#stepper .step-item').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const id = a.dataset.target;
        const el = document.getElementById(id);
        if (!el) return;
        // Feedback immediato: marca attiva la sezione cliccata
        // (lo scroll listener confermerà a fine animazione).
        document.querySelectorAll('.step-item').forEach(s =>
          s.classList.toggle('active', s.dataset.target === id));
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // SCROLL-SPY
  //
  // Approccio: scroll listener invece di IntersectionObserver.
  // Trovo l'ULTIMA sezione il cui top ha superato la linea di soglia
  // (sticky header + 80px). Robusto anche quando una sezione è corta
  // e quella successiva entra subito nel viewport.
  // Caso speciale fondo pagina: marco sempre l'ultima sezione.
  // ─────────────────────────────────────────────────────────────────────
  function setupScrollSpy() {
    // Cleanup precedente listener se rendering ripetuto
    if (window.state.scrollHandler) {
      window.removeEventListener('scroll', window.state.scrollHandler);
    }
    // Disattivo eventuale IntersectionObserver legacy
    if (window.state.observer) {
      window.state.observer.disconnect();
      window.state.observer = null;
    }

    const SCROLL_OFFSET = 120;  // sticky header + breathing room

    const handler = () => {
      const sections = document.querySelectorAll('.form-section');
      if (sections.length === 0) return;

      let activeId = sections[0].id;
      const nearBottom = (window.innerHeight + window.scrollY) >=
                         (document.documentElement.scrollHeight - 80);
      if (nearBottom) {
        activeId = sections[sections.length - 1].id;
      } else {
        sections.forEach(sec => {
          const rect = sec.getBoundingClientRect();
          if (rect.top - SCROLL_OFFSET <= 0) activeId = sec.id;
        });
      }

      document.querySelectorAll('.step-item').forEach(el => {
        el.classList.toggle('active', el.dataset.target === activeId);
      });
    };

    window.addEventListener('scroll', handler, { passive: true });
    window.state.scrollHandler = handler;
    handler();
  }

  // ─────────────────────────────────────────────────────────────────────
  // SUBMIT con conferma
  // ─────────────────────────────────────────────────────────────────────
  window.confirmSubmit = function () {
    if (!areAllRatingsComplete()) {
      const missing = missingRatingSections();
      window.toast('Completa: ' + missing.join(', '));
      return;
    }
    const s = window.state.scheda;
    const textFields = ['episodiNote','statoAvanzamentoHard','statoAvanzamentoKpi',
      'obiettivoPrioritario','obiettivoSecondario',
      'proposteAzienda','proposteIdea','proposteResponsabile',
      'richiesteAzienda','richiesteColleghi'];
    const textsEmpty = textFields.filter(f => (s[f] || '').trim().length === 0).length;
    const note = textsEmpty > 0
      ? '<p style="font-size:13px;color:var(--ink-mute);margin-bottom:14px;">' +
        '<i>' + textsEmpty + ' campi di testo (opzionali) non compilati. Puoi inviare lo stesso.</i></p>'
      : '';
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML =
      '<div class="modal-card">' +
        '<h3>Invio definitivo</h3>' +
        '<p>Stai per inviare la scheda. <b>Dopo l&rsquo;invio non potrai pi&ugrave; modificarla.</b><br>Sicuro di voler procedere?</p>' +
        note +
        '<div class="modal-actions">' +
          '<button class="btn-secondary" onclick="this.closest(\'.modal-backdrop\').remove()">Annulla</button>' +
          '<button class="btn-primary" onclick="doSubmit(this)">S&igrave;, invia</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
  };

  window.doSubmit = async function (btn) {
    btn.disabled = true;
    window.state.scheda.submittedAt = Date.now();
    window.state.scheda.lockedAt = Date.now();
    window.state.lockedAt = window.state.scheda.lockedAt;
    await saveNow();
    const modal = document.querySelector('.modal-backdrop');
    if (modal) modal.remove();
    window.toast('Scheda inviata');
    setTimeout(() => window.Router.go(), 600);
  };

})();
