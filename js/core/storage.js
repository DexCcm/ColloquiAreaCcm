console.log('[load] storage');
/**
 * ColloquiTeam · core/storage.js
 * -------------------------------------------------------------------
 * Persistenza schede su Firebase RTDB con cache localStorage.
 *
 * Pattern:
 *  - saveScheda: write-through (PRIMA cache locale sync, POI Firebase async)
 *  - loadScheda: prova Firebase con timeout 4s, fallback cache se offline
 *  - deleteScheda: rimuove da entrambi
 *  - readBranch: util admin per snapshot di un trimestre
 *
 * Path convention: /schede/{anno}/{quarter}/{userSlug}/{tipo}
 *   tipo ∈ { 'autovalutazione' | 'valutazione' }
 */
window.Storage = {
  online: false,

  schedaPath(userSlug, year, quarter, tipo) {
    return 'schede/' + year + '/' + quarter + '/' + userSlug + '/' + tipo;
  },
  cacheKey(userSlug, year, quarter, tipo) {
    return 'colloquiteam_cache/' + year + '/' + quarter + '/' + userSlug + '/' + tipo;
  },

  async loadScheda(userSlug, year, quarter, tipo) {
    const path = this.schedaPath(userSlug, year, quarter, tipo);
    const cacheKey = this.cacheKey(userSlug, year, quarter, tipo);

    // Tentativo Firebase con timeout. Firebase è la sorgente di verità:
    // se risponde con successo (anche con null) ci fidiamo del risultato e
    // ripuliamo la cache locale. Il fallback su localStorage scatta SOLO
    // quando Firebase è irraggiungibile (errore/timeout) — non quando
    // l'utente ha legittimamente cancellato il nodo lato DB.
    try {
      await window.firebaseReady;
      const snap = await Promise.race([
        window.firebaseDB.get(window.firebaseDB.ref(path)),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
      ]);
      const val = snap.val();
      if (val) {
        localStorage.setItem(cacheKey, JSON.stringify(val));
        console.log('[Storage] load FB OK:', path);
        return val;
      }
      // Nodo davvero assente su Firebase: invalida la cache locale
      // (evita che dati cancellati lato DB "risorgano" dalla cache).
      localStorage.removeItem(cacheKey);
      console.log('[Storage] load FB nodo vuoto, cache pulita:', path);
      return this.emptyScheda();
    } catch (err) {
      console.warn('[Storage] load FB fallito, fallback cache:', err.message, path);
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        try { return JSON.parse(raw); } catch (e) { /* fallthrough */ }
      }
      return this.emptyScheda();
    }
  },

  async saveScheda(userSlug, year, quarter, tipo, data) {
    const path = this.schedaPath(userSlug, year, quarter, tipo);
    const cacheKey = this.cacheKey(userSlug, year, quarter, tipo);

    // 1. write-through cache locale (sync, garantito)
    localStorage.setItem(cacheKey, JSON.stringify(data));

    // 2. scrittura Firebase (async)
    try {
      await window.firebaseReady;
      await window.firebaseDB.set(window.firebaseDB.ref(path), data);
      console.log('[Storage] save FB OK:', path);
      return { ok: true, synced: true };
    } catch (err) {
      console.warn('[Storage] save FB fallito (dato in cache):', err.message, path);
      return { ok: true, synced: false, error: err.message };
    }
  },

  async deleteScheda(userSlug, year, quarter, tipo) {
    const cacheKey = this.cacheKey(userSlug, year, quarter, tipo);
    localStorage.removeItem(cacheKey);
    try {
      await window.firebaseReady;
      await window.firebaseDB.remove(window.firebaseDB.ref(this.schedaPath(userSlug, year, quarter, tipo)));
      return true;
    } catch (err) {
      console.error('[Storage] delete FB fallito:', err.message);
      return false;
    }
  },

  async readBranch(year, quarter) {
    try {
      await window.firebaseReady;
      const snap = await window.firebaseDB.get(window.firebaseDB.ref('schede/' + year + '/' + quarter));
      return snap.val() || {};
    } catch (err) {
      console.error('[Storage] readBranch fallito:', err.message);
      return null;
    }
  },

  emptyScheda() {
    return {
      softSkills: {}, hardSkills: {}, kpi: {},
      episodiNote: '',
      statoAvanzamentoHard: '',
      statoAvanzamentoKpi: '',
      obiettivoPrioritario: '',
      obiettivoSecondario: '',
      proposteAzienda: '',
      proposteIdea: '',
      proposteResponsabile: '',
      richiesteAzienda: '',
      richiesteColleghi: '',
      ruota: {},               // legacy (V0.3: ora calcolata da Soft+Hard+KPI)
      expectedRuota: {},       // V0.4: obiettivi di crescita (solo scheda valutazione)
      dataColloquio: '',
      updatedAt: null,
      submittedAt: null,
      lockedAt: null
    };
  }
};
