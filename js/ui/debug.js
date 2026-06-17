console.log('[load] debug');
/**
 * ColloquiTeam · ui/debug.js
 * -------------------------------------------------------------------
 * Pannello di diagnostica visibile solo agli admin di area "all"
 * (Luigi nei mock). Mostra snapshot del nodo /schede/{anno}/{Q} e
 * permette di azzerare tutte le schede del trimestre per i test.
 */

window.renderDebugPanel = async function () {
  const host = document.getElementById('debugPanelHost');
  if (!host) return;
  const y = window.state.year, q = window.state.quarter;
  host.innerHTML =
    '<div class="debug-panel">' +
      '<h3>Debug Firebase &middot; admin/all only</h3>' +
      '<div>Anno &middot; Q corrente: <b>' + y + ' &middot; ' + q + '</b></div>' +
      '<div>Project: <b>area-ccm-colloqui-personali</b></div>' +
      '<div>Path letto: <b>/schede/' + y + '/' + q + '</b></div>' +
      '<pre id="debugBranchDump">caricamento snapshot&hellip;</pre>' +
      '<div class="debug-actions">' +
        '<button class="debug-btn" onclick="reloadDebugDump()">Ricarica snapshot</button> ' +
        '<button class="debug-btn danger" onclick="wipeAllSchede()">Cancella TUTTE le schede ' + q + ' (test)</button>' +
      '</div>' +
    '</div>';
  window.reloadDebugDump();
};

window.reloadDebugDump = async function () {
  const el = document.getElementById('debugBranchDump');
  if (!el) return;
  el.textContent = 'caricamento snapshot…';
  const data = await window.Storage.readBranch(window.state.year, window.state.quarter);
  if (data === null) { el.textContent = '⚠ errore lettura Firebase'; return; }

  const summary = {};
  Object.entries(data).forEach(([slug, tipi]) => {
    summary[slug] = {};
    Object.entries(tipi).forEach(([tipo, scheda]) => {
      summary[slug][tipo] = {
        submittedAt: scheda.submittedAt ? new Date(scheda.submittedAt).toLocaleString('it-IT') : null,
        updatedAt:   scheda.updatedAt   ? new Date(scheda.updatedAt).toLocaleString('it-IT')   : null,
        ratings: {
          soft:  Object.keys(scheda.softSkills || {}).length,
          hard:  Object.keys(scheda.hardSkills || {}).length,
          kpi:   Object.keys(scheda.kpi || {}).length,
          ruota: Object.keys(scheda.ruota || {}).length
        }
      };
    });
  });

  el.textContent = Object.keys(summary).length === 0
    ? '(nessuna scheda salvata per ' + window.state.year + '/' + window.state.quarter + ')'
    : JSON.stringify(summary, null, 2);
};

window.wipeAllSchede = async function () {
  const y = window.state.year, q = window.state.quarter;
  if (!confirm('Cancellare TUTTE le schede di ' + y + ' ' + q + '? Operazione non reversibile.')) return;
  try {
    await window.firebaseReady;
    await window.firebaseDB.remove(window.firebaseDB.ref('schede/' + y + '/' + q));
    Object.keys(localStorage).forEach(k => {
      if (k.indexOf('colloquiteam_cache/' + y + '/' + q + '/') === 0) localStorage.removeItem(k);
    });
    window.toast('Schede del trimestre cancellate');
    window.reloadDebugDump();
  } catch (err) {
    window.toast('Errore: ' + err.message);
  }
};
