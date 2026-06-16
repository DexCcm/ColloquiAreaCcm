/**
 * ColloquiTeam · data/mock-users.js
 * -------------------------------------------------------------------
 * FALLBACK utenti, usato solo se Firebase /users è vuoto o irraggiungibile.
 * In condizioni normali questo array NON viene letto: la sorgente di verità
 * è il nodo /users su Firebase, caricato da js/core/users.js all'avvio.
 *
 * Shape allineata a quella prodotta da Users._normalize() così
 * window.USERS_LIST è omogeneo tra fonte reale e fallback.
 */
window.MOCK_USERS = [
  {
    slug: 'mario-rossi',
    displayName: 'Mario Rossi',
    email: 'mario.rossi@dataexpert.it',
    role: 'user',
    area: 'quadient',
    ruolo: 'Sviluppatore CCM Quadient',
    areaQuadient: true,
    areaPapyrus: false
  },
  {
    slug: 'maria-bianchi',
    displayName: 'Maria Bianchi',
    email: 'maria.bianchi@dataexpert.it',
    role: 'user',
    area: 'papyrus',
    ruolo: 'Sviluppatore CCM Papyrus',
    areaQuadient: false,
    areaPapyrus: true
  },
  {
    slug: 'viscomi',
    displayName: 'Simone Viscomi',
    email: 'simone.viscomi@dataexpert.it',
    role: 'admin',
    area: 'quadient',
    ruolo: 'Responsabile area Quadient',
    areaQuadient: true,
    areaPapyrus: false
  },
  {
    slug: 'ferrara',
    displayName: 'Luigi Ferrara',
    email: 'luigi.ferrara@dataexpert.it',
    role: 'admin',
    area: 'all',
    ruolo: 'Admin · tutte le aree',
    areaQuadient: true,
    areaPapyrus: true
  }
];
