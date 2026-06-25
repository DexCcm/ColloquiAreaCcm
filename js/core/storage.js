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
   * Nodo "meta" fratello di autovalutazione/valutazione.
   * Path: /schede/{anno}/{quarter}/{slug}/meta
   * Contiene la visibilità del colloquio verso l'utente:
   *   { colloquioSharedAt: <ms>, sharedBy: <email admin> }
   * Quando colloquioSharedAt è assente/null, la scheda di confronto
   * resta privata dell'admin.
   */
  metaPath(userSlug, year, quarter) {
    return 'schede/' + year + '/' + quarter + '/' + userSlug + '/meta';
  },

  async loadMeta(userSlug, year, quarter) {
    try {
      await window.firebaseReady;
      const snap = await Promise.race([
        window.firebaseDB.get(window.firebaseDB.ref(this.metaPath(userSlug, year, quarter))),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
      ]);
      return snap.val() || {};
    } catch (err) {
      console.warn('[Storage] loadMeta fallito:', err.message, userSlug);
      return {};
    }
  },

  /**
   * Abilita/revoca la visibilità del colloquio all'utente.
   * shared=true  → scrive colloquioSharedAt (ora) e sharedBy.
   * shared=false → azzera entrambi (update con null = rimozione chiave in RTDB).
   */
  async setColloquioShared(userSlug, year, quarter, shared, sharedBy) {
    const ref = window.firebaseDB.ref(this.metaPath(userSlug, year, quarter));
    try {
      await window.firebaseReady;
      await window.firebaseDB.update(ref, shared
        ? { colloquioSharedAt: Date.now(), sharedBy: sharedBy || null }
        : { colloquioSharedAt: null, sharedBy: null });
      console.log('[Storage] colloquio shared=' + shared + ' :', userSlug);
      return true;
    } catch (err) {
      console.error('[Storage] setColloquioShared fallito:', err.message);
      return false;
    }
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
        // === CIFRATURA DISATTIVATA ===
        // Per riabilitare la decifratura della valutazione, decommenta la riga
        // sotto e commenta la successiva `const val = raw;`
        // const val = await this._maybeDecrypt(raw, tipo);
        const val = raw;
        localStorage.setItem(cacheKey, JSON.stringify(val));
        console.log('[Storage] load FB OK:', path);
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

    // 2. scrittura Firebase (cifratura disattivata — riabilita decommentando)
    try {
      await window.firebaseReady;
      // === CIFRATURA DISATTIVATA ===
      // Per riabilitare la cifratura della valutazione prima del write,
      // decommenta la riga sotto e commenta `const payload = data;`
      // const payload = await this._maybeEncrypt(data, tipo);
      const payload = data;
      await window.firebaseDB.set(window.firebaseDB.ref(path), payload);
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
      const raw = snap.val() || {};
      // === CIFRATURA DISATTIVATA ===
      // Per riabilitare la decifratura dei blob valutazione nel debug panel,
      // decommenta il blocco sotto.
      /*
      if (window.Crypto) {
        for (const slug of Object.keys(raw)) {
          if (raw[slug] && raw[slug].valutazione && raw[slug].valutazione._enc) {
            const dec = await window.Crypto.decryptValutazione(raw[slug].valutazione);
            if (dec) raw[slug].valutazione = dec;
          }
        }
      }
      */
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
