/**
 * ColloquiTeam · core/users.js
 * -------------------------------------------------------------------
 * Caricamento e normalizzazione della lista utenti dal nodo /users
 * su Firebase RTDB. Pattern derivato dal planner ferie.
 *
 * Schema atteso su Firebase (chiave = cognome PascalCase):
 *   /users/{Cognome}
 *     email:         string                (obbligatorio)
 *     role:          "admin" | "user"      (default: "user")
 *     areaQuadient:  boolean               (opzionale, default false)
 *     areaPapyrus:   boolean               (opzionale, default false)
 *     ...altri campi ignorati (mascotte, badge, ecc. del planner ferie)
 *
 * Espone su window:
 *   window.Users.loadAll()        → Promise<Array<UserNormalized>>
 *   window.Users.findByEmail(em)  → UserNormalized | null
 *   window.USERS_LIST             → Array<UserNormalized> (popolato dopo loadAll)
 *
 * UserNormalized (struttura usata dal resto dell'app):
 *   { slug, displayName, email, role, area, ruolo,
 *     areaQuadient, areaPapyrus }
 */
window.Users = {

  /** Cache locale post-load (rinfrescata ad ogni loadAll). */
  list: [],

  /**
   * Carica /users da Firebase, normalizza e ritorna l'array.
   * In caso di errore o nodo vuoto, ricade su MOCK_USERS (graceful).
   */
  async loadAll() {
    try {
      await window.firebaseReady;
      const snap = await window.firebaseDB.get(window.firebaseDB.ref('users'));
      const raw = snap.val();

      if (!raw || Object.keys(raw).length === 0) {
        console.warn('[Users] /users vuoto, uso MOCK_USERS come fallback');
        this.list = (window.MOCK_USERS || []).slice();
        window.USERS_LIST = this.list;
        return this.list;
      }

      const normalized = Object.entries(raw).map(([cognome, data]) =>
        this._normalize(cognome, data)
      ).filter(u => !!u.email); // scarta record incompleti

      // Ordine alfabetico per cognome (chiave originale)
      normalized.sort((a, b) => a.displayName.localeCompare(b.displayName, 'it'));

      this.list = normalized;
      window.USERS_LIST = normalized;
      console.log('[Users] caricati da Firebase:', normalized.length, 'utenti');
      return normalized;

    } catch (err) {
      console.error('[Users] load fallito, fallback MOCK_USERS:', err.message);
      this.list = (window.MOCK_USERS || []).slice();
      window.USERS_LIST = this.list;
      return this.list;
    }
  },

  /** Lookup per email (case-insensitive, trim). Usato da Auth in V0.3 con MSAL. */
  findByEmail(email) {
    const e = (email || '').toLowerCase().trim();
    return this.list.find(u => u.email.toLowerCase().trim() === e) || null;
  },

  /** Lookup per slug. */
  findBySlug(slug) {
    return this.list.find(u => u.slug === slug) || null;
  },

  // ───────────────────────────────────────────────────────────────────
  // Helpers privati
  // ───────────────────────────────────────────────────────────────────

  /**
   * Trasforma una entry /users/{Cognome} nella shape interna.
   * - slug:         lowercased cognome (chiave del nodo Firebase)
   * - displayName:  ricavato da "nome.cognome" dell'email se possibile,
   *                 altrimenti il cognome stesso
   * - area:         derivata da areaQuadient/areaPapyrus
   * - ruolo:        etichetta human-readable
   */
  _normalize(cognome, data) {
    data = data || {};
    const slug = cognome.toLowerCase();
    const email = (data.email || '').trim();
    const role = data.role === 'admin' ? 'admin' : 'user';

    const areaQuadient = data.areaQuadient === true;
    const areaPapyrus  = data.areaPapyrus  === true;

    // Mappatura area composita:
    //   entrambi true  → 'all' (visibilità completa)
    //   solo Quadient  → 'quadient'
    //   solo Papyrus   → 'papyrus'
    //   nessuno        → fallback ragionevole (admin → 'all', user → 'quadient')
    let area;
    if (areaQuadient && areaPapyrus) area = 'all';
    else if (areaQuadient)           area = 'quadient';
    else if (areaPapyrus)            area = 'papyrus';
    else                             area = (role === 'admin' ? 'all' : 'quadient');

    // Qualifica: campo libero su Firebase (es. "CCM Specialist", "Senior Developer").
    // Se presente, viene mostrata come etichetta di ruolo al posto del default derivato.
    const qualifica = (typeof data.qualifica === 'string' && data.qualifica.trim())
      ? data.qualifica.trim() : null;

    return {
      slug,
      displayName: this._resolveDisplayName(data, cognome, email),
      email,
      role,
      area,
      qualifica,                                              // campo grezzo (può essere null)
      ruolo: qualifica || this._ruoloLabel(role, area),       // etichetta da mostrare
      areaQuadient,
      areaPapyrus
    };
  },

  /**
   * Strategia displayName:
   *   1. Campo `displayName` esplicito su Firebase (override opzionale)
   *   2. Ricavato dall'email nella forma `nome.cognome@…` → "Nome Cognome"
   *   3. Fallback estremo: cognome dalla chiave Firebase
   *
   * Convenzione assunta su tutto il team: l'email aziendale è sempre
   * nella forma `nome.cognome@dataexpert.it`.
   */
  _resolveDisplayName(data, cognome, email) {
    if (typeof data.displayName === 'string' && data.displayName.trim()) {
      return data.displayName.trim();
    }
    return this._nameFromEmail(email) || cognome;
  },

  /** "luigi.ferrara@dataexpert.it" → "Luigi Ferrara" */
  _nameFromEmail(email) {
    const local = (email || '').split('@')[0] || '';
    if (!local) return '';
    return local.split(/[._-]/)
      .filter(Boolean)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  },

  /** Etichetta ruolo human-readable per UI (fallback se manca `qualifica` su DB). */
  _ruoloLabel(role, area) {
    if (role === 'admin') {
      if (area === 'all')      return 'Admin · tutte le aree';
      if (area === 'quadient') return 'Responsabile area Quadient';
      if (area === 'papyrus')  return 'Responsabile area Papyrus';
      return 'Admin';
    }
    if (area === 'papyrus') return 'Sviluppatore CCM Papyrus';
    return 'Sviluppatore CCM Quadient';
  }
};
