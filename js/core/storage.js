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

  /**
   * Helper: decifra il blob se contiene il marker _enc e tipo === 'valutazione'.
   * Per autovalutazione restituisce il dato così com'è (in chiaro).
   */
  async _maybeDecrypt(val, tipo) {
    if (!val) return val;
    if (tipo !== 'valutazione') return val;
    if (!val._enc) return val;                  // legacy in chiaro → passthrough
    if (!window.Crypto) {
      console.warn('[Storage] blob cifrato ma Crypto non caricato');
      return val;
    }
    const decrypted = await window.Crypto.decryptValutazione(val);
    return decrypted || val;
  },

  /**
   * Helper: cifra il blob valutazione prima del write. Per autovalutazione
   * o se Crypto non c'è, ritorna il dato originale.
   */
  async _maybeEncrypt(data, tipo) {
    if (!data) return data;
    if (tipo !== 'valutazione') return data;
    if (!window.Crypto) {
      console.warn('[Storage] valutazione NON cifrata (Crypto non caricato)');
      return data;
    }
    return await window.Crypto.encryptValutazione(data);
  },

  async loadScheda(userSlug, year, quarter, tipo) {
    const path = this.schedaPath(userSlug, year, quarter, tipo);
    const cacheKey = this.cacheKey(userSlug, year, quarter, tipo);

    try {
      await window.firebaseReady;
      const snap = await Promise.race([
        window.firebaseDB.get(window.firebaseDB.ref(path)),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
      ]);
      const raw = snap.val();
      if (raw) {
        const val = await this._maybeDecrypt(raw, tipo);
        localStorage.setItem(cacheKey, JSON.stringify(val));   // cache in chiaro
        console.log('[Storage] load FB OK:', path, raw._enc ? '(decrypted)' : '');
        return val;
      }
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

    // 1. cache locale in chiaro (più rapido, l'utente è già autorizzato)
    localStorage.setItem(cacheKey, JSON.stringify(data));

    // 2. scrittura Firebase: SE tipo === 'valutazione', cifra prima
    try {
      await window.firebaseReady;
      const payload = await this._maybeEncrypt(data, tipo);
      await window.firebaseDB.set(window.firebaseDB.ref(path), payload);
      console.log('[Storage] save FB OK:', path, payload._enc ? '(encrypted)' : '');
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
      const raw = snap.val() || {};
      // Decifro eventuali blob 'valutazione' per ogni utente
      if (window.Crypto) {
        for (const slug of Object.keys(raw)) {
          if (raw[slug] && raw[slug].valutazione && raw[slug].valutazione._enc) {
            const dec = await window.Crypto.decryptValutazione(raw[slug].valutazione);
            if (dec) raw[slug].valutazione = dec;
          }
        }
      }
      return raw;
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
      ruota: {},
      expectedRuota: {},
      dataColloquio: '',
      updatedAt: null,
      submittedAt: null,
      lockedAt: null
    };
  }
};
