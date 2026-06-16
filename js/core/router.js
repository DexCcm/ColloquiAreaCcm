/**
 * ColloquiTeam · core/router.js
 * -------------------------------------------------------------------
 * Router hash-based con guard per ruolo. Le view sono async perché
 * caricano dati da Firebase prima di renderizzare.
 *
 * Convention path:
 *   #/home
 *   #/autoval               (utente: sua autoval — admin: la propria)
 *   #/team                  (admin)
 *   #/scheda/{slug}         (admin: legge autoval di {slug} in sola lettura)
 *   #/valuta/{slug}         (admin: compila valutazione responsabile per {slug})
 *   #/colloquio/{slug}      (admin: vista ruota sovrapposta, V0.3)
 */
window.Router = {
  parse() {
    const hash = location.hash.replace(/^#/, '') || '/home';
    const parts = hash.split('/').filter(Boolean);
    return { route: parts[0] || 'home', args: parts.slice(1) };
  },

  navigate(path) {
    location.hash = '#' + path;
  },

  go() {
    const parsed = this.parse();
    const route = parsed.route;
    const args = parsed.args;

    if (!window.state.currentUser) return;
    const isAdmin = window.state.currentUser.role === 'admin';

    switch (route) {
      case 'home':
        window.renderHome();
        break;
      case 'autoval':
        window.renderAutovalutazione();
        break;
      case 'team':
        if (isAdmin) window.renderTeamStub();
        else window.Router.navigate('/home');
        break;
      case 'scheda':
        if (isAdmin && args[0]) window.renderViewScheda(args[0]);
        else window.Router.navigate('/home');
        break;
      case 'valuta':
        if (isAdmin && args[0]) window.renderValutazione(args[0]);
        else window.Router.navigate('/home');
        break;
      case 'colloquio':
        if (isAdmin && args[0]) window.renderColloquio(args[0]);
        else window.Router.navigate('/home');
        break;
      default:
        window.renderPlaceholder('Pagina non trovata', 'La route #' + route + ' non esiste');
    }

    window.updateHeaderNav(route);
  }
};
