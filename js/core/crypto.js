console.log('[load] crypto');
/**
 * ColloquiTeam · core/crypto.js
 * -------------------------------------------------------------------
 * Cifratura AES-GCM con WebCrypto per i blob "valutazione".
 *
 * Threat model: chiunque autenticato può leggere /schede via REST o
 * SDK Firebase, MA i campi sensibili sono cifrati. Per decifrare
 * serve eseguire codice JS dell'app (chiave derivata via PBKDF2 da
 * un passphrase splittato in più frammenti). Alza la barriera da
 * "30 secondi con DevTools" a "dover leggere/eseguire il codice".
 *
 * NB: non è perfetta sicurezza (anyone leggendo il JS può ricostruire
 * la passphrase). È security-by-obscurity progettata per impedire
 * spionaggio casuale da parte di colleghi non-tech.
 *
 * API:
 *   await Crypto.encryptValutazione(data)  → { _enc:'v1', iv, ct, updatedAt, submittedAt }
 *   await Crypto.decryptValutazione(blob)  → data originale o blob se non cifrato
 */
(function () {
  // === Passphrase offuscata (split + xor leggero) ===========================
  // Ricomposta a runtime. Non scrivere mai questa string in chiaro nel codice.
  const _P1 = ['c', 'c', 'm', '-', 'q', '7'];
  const _P2 = ['team', 'Schede', '2026'];
  const _P3 = String.fromCharCode(75, 49, 35);  // K1#
  function _getPassphrase() {
    return _P1.join('') + ':' + _P2.join('-') + ':' + _P3 + ':' +
           (typeof location !== 'undefined' ? (location.hostname || '').length : 0);
  }

  // === Helpers base64 ↔ Uint8Array ==========================================
  function toB64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  }
  function fromB64(s) {
    const raw = atob(s);
    const u8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    return u8;
  }

  // === Derive AES-GCM key from passphrase via PBKDF2 ========================
  let _cachedKey = null;
  async function _deriveKey() {
    if (_cachedKey) return _cachedKey;
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(_getPassphrase()), 'PBKDF2', false, ['deriveKey']
    );
    _cachedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode('colloquiteam:salt:v1'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    return _cachedKey;
  }

  // === Encrypt JSON object ==================================================
  async function _encryptObj(obj) {
    const enc = new TextEncoder();
    const data = enc.encode(JSON.stringify(obj));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await _deriveKey();
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, data);
    return {
      _enc: 'v1',
      iv: toB64(iv),
      ct: toB64(new Uint8Array(ct))
    };
  }

  // === Decrypt blob → JSON object ============================================
  async function _decryptObj(blob) {
    if (!blob || !blob._enc || !blob.iv || !blob.ct) return null;
    try {
      const key = await _deriveKey();
      const iv = fromB64(blob.iv);
      const ct = fromB64(blob.ct);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
      return JSON.parse(new TextDecoder().decode(pt));
    } catch (err) {
      console.error('[Crypto] decrypt failed:', err.message);
      return null;
    }
  }

  /**
   * Cifra i campi sensibili della scheda valutazione.
   * updatedAt e submittedAt restano IN CHIARO come metadata (per
   * permettere il check "compilata?" senza dover decifrare).
   */
  async function encryptValutazione(data) {
    if (!data || typeof data !== 'object') return data;
    const meta = {};
    if (data.updatedAt != null)   meta.updatedAt   = data.updatedAt;
    if (data.submittedAt != null) meta.submittedAt = data.submittedAt;
    if (data.lockedAt != null)    meta.lockedAt    = data.lockedAt;

    const sensitive = Object.assign({}, data);
    delete sensitive.updatedAt;
    delete sensitive.submittedAt;
    delete sensitive.lockedAt;

    const enc = await _encryptObj(sensitive);
    return Object.assign({}, enc, meta);
  }

  /**
   * Decifra il blob valutazione. Se non è cifrato (legacy data),
   * ritorna l'oggetto tale e quale.
   */
  async function decryptValutazione(blob) {
    if (!blob || typeof blob !== 'object') return blob;
    if (!blob._enc) return blob;  // dato in chiaro legacy → passthrough
    const decrypted = await _decryptObj(blob);
    if (!decrypted) return null;
    // ricompongo con metadata
    const out = Object.assign({}, decrypted);
    if (blob.updatedAt != null)   out.updatedAt   = blob.updatedAt;
    if (blob.submittedAt != null) out.submittedAt = blob.submittedAt;
    if (blob.lockedAt != null)    out.lockedAt    = blob.lockedAt;
    return out;
  }

  window.Crypto = {
    encryptValutazione: encryptValutazione,
    decryptValutazione: decryptValutazione
  };
})();
