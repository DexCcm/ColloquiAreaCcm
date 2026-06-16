<div align="center">

# ColloquiAreaCcm

**Schede trimestrali di valutazione · Area CCM**
*Autovalutazione utente + Valutazione responsabile + Vista colloquio admin*

[![Deploy](https://img.shields.io/badge/deploy-GitHub_Pages-181717?logo=github)](https://dexccm.github.io/ColloquiAreaCcm/)
[![Auth](https://img.shields.io/badge/auth-MSAL_+_Azure_AD-0078D4?logo=microsoft)](#auth--ruoli)
[![Stack](https://img.shields.io/badge/stack-Vanilla_HTML_/_JS_/_CSS-yellow)](#stack)
[![DB](https://img.shields.io/badge/database-Firebase_RTDB-FFA000?logo=firebase)](#firebase)

</div>

---

## Cos'è

Single Page Application che digitalizza il flusso delle schede di valutazione trimestrali dell'**Area CCM** (Quadient e Papyrus), sostituendo i quattro file Word storici (`autovalutazione` + `valutazione` × `Quadient` + `Papyrus`) con un'unica interfaccia web.

L'app guida tre attori distinti:

| Ruolo | Cosa vede | Cosa fa |
|---|---|---|
| **Utente** | La propria autovalutazione | Compila 7 sezioni (Soft / Hard / KPI / Obiettivi / Proposte / Richieste), submit, eventuali revisioni |
| **Responsabile** | Le schede del proprio team | Compila la valutazione (stesse 6 sezioni + obiettivi di crescita), confronta con l'autovalutazione |
| **Admin** | Tutti gli utenti del proprio scope | Vista Colloquio: confronto a tre dataset sul radar (auto · resp · obiettivo), divergenze ordinate, gap analysis |

La forza dell'app è la **Ruota delle Performance**: un radar a 8 macro-aree calcolato automaticamente dai punteggi delle prime tre sezioni (mappatura voce → macro), che mostra in un colpo d'occhio la sovrapposizione (o la divaricazione) tra come l'utente si vede, come lo vede il responsabile, e dove si vuole arrivare.

---

## Stack

```text
Frontend ── Vanilla HTML / JS / CSS — zero build step, zero npm install per lavorare
            Hash-routing client-side (#/home, #/autoval, #/team, #/colloquio/:slug)
            CSS variables · Bricolage Grotesque + Manrope
Auth     ── MSAL.js v2.38 + Azure AD (work accounts dell'organizzazione)
DB       ── Firebase Realtime Database (Compat SDK v9 da CDN)
Chart    ── Chart.js 4.4.1 — radar a 3 dataset sovrapposti
Hosting  ── GitHub Pages (org dexccm)
```

Nessun framework, nessun bundler. L'app funziona anche aperta da `file://` (utile per debug rapido senza server), con l'unica eccezione che MSAL richiede un'origine `http(s)`.

---

## Struttura del repo

```text
ColloquiAreaCcm/
├── index.html              # DOM skeleton + script chain
├── assets/                 # favicon SVG, logo
├── css/
│   ├── tokens.css          # palette V3 + radius/shadow/spacing
│   ├── base.css            # reset + tipografia
│   ├── login.css           # schermata login
│   ├── shell.css           # header app + chrome
│   ├── home.css            # landing per ruolo
│   ├── form.css            # rating tables + ruota + textarea
│   ├── components.css      # bottoni, pill, toast
│   ├── colloquio.css       # vista admin · radar · divergenze
│   └── responsive.css      # breakpoint 900 / 560
├── js/
│   ├── firebase-init.js    # bootstrap Firebase Compat
│   ├── data/
│   │   ├── mock-users.js   # fallback se /users vuoto
│   │   └── templates.js    # SOFT/HARD/KPI/RUOTA_MACRO + mapping
│   ├── core/
│   │   ├── state.js        # currentUser, anno, trimestre
│   │   ├── storage.js      # CRUD schede (write-through cache)
│   │   ├── connection.js   # status indicator Firebase
│   │   ├── users.js        # loadAll, findByEmail, findBySlug
│   │   ├── msal-config.js  # ⚠ configura clientId qui
│   │   ├── auth.js         # MSAL boot + login/logout
│   │   └── router.js       # hash router
│   ├── ui/
│   │   ├── shell.js        # header dinamico per ruolo
│   │   ├── home.js         # landing
│   │   ├── autoval.js      # form 7 sezioni (auto + val + view)
│   │   ├── team.js         # lista colleghi del responsabile/admin
│   │   ├── colloquio.js    # vista a 3 dataset
│   │   └── debug.js        # pannello diagnostico
│   └── main.js             # boot
└── serve.bat               # quick http-server locale
```

---

## Quickstart

### Sviluppo locale (5 minuti)

```bash
git clone https://github.com/dexccm/ColloquiAreaCcm.git
cd ColloquiAreaCcm
# Apri index.html con Live Server di VSCode, oppure:
.\serve.bat
```

Vai su `http://localhost:5500/?dev=1` — il parametro `?dev=1` mostra il **mock login picker** con la lista utenti reali presi da Firebase, così puoi impersonare chiunque per testare senza fare un vero login Microsoft.

Senza `?dev=1` vedrai solo il bottone "Accedi con Microsoft": se il `clientId` Azure non è ancora configurato il bottone resta disabilitato con un hint nel tooltip.

### Setup Azure AD (una tantum)

1. [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Nome: `ColloquiAreaCcm`
3. *Supported account types:* **Single tenant** (solo organizzazione)
4. *Redirect URI:* **Single-page application (SPA)** → `https://dexccm.github.io/ColloquiAreaCcm/`
5. Dopo la creazione, aggiungi anche le URI di sviluppo: `http://localhost:5500/` e `http://127.0.0.1:5500/`
6. Copia l'**Application (client) ID** e incollalo in `js/core/msal-config.js` al posto di `REPLACE_ME`

```js
// js/core/msal-config.js
window.MSAL_CONFIG = {
  auth: {
    clientId: '00000000-0000-0000-0000-000000000000', // ← qui il tuo clientId
    authority: 'https://login.microsoftonline.com/organizations',
    redirectUri: window.location.origin + window.location.pathname,
    ...
  },
  ...
};
```

### Setup Firebase

Il file `js/firebase-init.js` contiene già la config del progetto `area-ccm-colloqui-personali`. Per usare un progetto Firebase diverso, sostituiscila con la tua.

**Caricamento iniziale degli utenti:** dal pannello Firebase → Realtime Database → nodo `/users` → menu ⋮ → *Importa JSON*. Formato atteso:

```json
{
  "Viscomi": {
    "nome": "Simone",
    "cognome": "Viscomi",
    "email": "simone.viscomi@dataexpert.it",
    "ruolo": "admin",
    "areaQuadient": true,
    "areaPapyrus": false,
    "qualifica": "Senior Developer"
  }
}
```

La chiave esterna (`Viscomi`) è il **Cognome** e viene usata come slug URL.

### Deploy su GitHub Pages

1. Push del codice sul branch `main`
2. Settings → Pages → Source: `Deploy from a branch` → Branch: `main` / `/ (root)`
3. L'URL `https://dexccm.github.io/ColloquiAreaCcm/` è attivo dopo ~1 minuto
4. Verifica che la redirect URI Azure combaci **esattamente** con l'URL (slash finale incluso!)

---

## Auth & Ruoli

```text
[Utente] ──click──▶ [Microsoft Login] ──redirect──▶ [Azure AD]
                                                       │
                                                       ▼
                                              [handleRedirectPromise]
                                                       │
                                                       ▼
[loginByEmail(account.username)] ──lookup /users──▶ [user trovato?]
                                                       │
                                            ┌──────────┴──────────┐
                                            ▼                     ▼
                                       [showApp]            [alert + logout]
```

Tre ruoli applicativi (campo `ruolo` su Firebase):

- **`user`** — vede e modifica la propria autovalutazione, vede le valutazioni del responsabile sulle sezioni che lo riguardano (a meno che siano testi liberi dell'utente, che restano privati al responsabile)
- **`responsabile`** — accesso ai membri del proprio team (filtrati per `area`), può compilare la valutazione su di loro
- **`admin`** — vede tutto, ha accesso alla Vista Colloquio comparativa

La **Vista Colloquio** è esclusivamente admin: confronta auto vs val sezione per sezione, evidenzia righe con delta ≥ 1, e disegna il radar a 3 dataset (auto blu, resp terracotta, obiettivo sage tratteggiato). Passando il mouse su una voce della legenda o sulla statistica laterale, l'area del dataset corrispondente viene messa in risalto. Sulla card *Gap Resp→Target*, l'hover riempie in ambra **l'area tra resp e obiettivo**, mostrando esattamente dove sono le distanze da colmare.

---

## Modello dati Firebase

```text
/users/{Cognome}                   → profilo utente (vedi sopra)
/schede/{anno}/{Q}/{slug}/{tipo}   → scheda compilata
   • anno   = 2025, 2026, ...
   • Q      = Q1 | Q2 | Q3 | Q4
   • slug   = Cognome (chiave utente)
   • tipo   = autovalutazione | valutazione
```

Ogni scheda contiene:

```json
{
  "softSkills":   { "0": 4, "1": 3, ... },
  "hardSkills":   { "0": 5, ... },
  "kpi":          { "0": 3, ... },
  "obiettivoPrioritario":   "...",
  "obiettivoSecondario":    "...",
  "proposteAzienda":        "...",
  "proposteIdea":           "...",
  "richiesteAzienda":       "...",
  "richiesteColleghi":      "...",
  "proposteResponsabile":   "...",
  "episodiNote":            "...",
  "expectedRuota":          { "0": 8, "1": 7, ... },
  "updatedAt":   1734567890123,
  "submittedAt": 1734567890123
}
```

I valori `softSkills/hardSkills/kpi` sono rating 1-5. La **Ruota delle Performance** (8 macro-aree) viene **derivata automaticamente** da queste 3 sezioni tramite il mapping in `js/data/templates.js` → `RUOTA_MAPPING` + `computeRuotaFromScheda()`. L'`expectedRuota` è invece l'unica componente che l'admin imposta manualmente in sezione 07 *Obiettivi di crescita* della scheda di valutazione.

Le varianti **Quadient** e **Papyrus** condividono Soft Skills, mentre Hard Skills, KPI e parte della Ruota Macro divergono. La logica di switch è in `templates.js` (suffisso `_QUADIENT` / `_PAPYRUS`) e viene scelta runtime in base al campo `areaQuadient`/`areaPapyrus` dell'utente target.

---

## Convenzioni & note

- **Persistenza:** le schede vengono salvate in localStorage **e** Firebase contemporaneamente (write-through). La lettura prova prima Firebase, e cade su localStorage solo in caso di errore di rete — quindi una cancellazione admin lato Firebase è effettiva.
- **Autosave:** ogni `blur` su textarea o cambio rating fa un save silenzioso. Il submit imposta `submittedAt` e blocca le modifiche utente (l'admin può sempre riaprire).
- **Periodo globale:** anno e trimestre vivono in `state.year`/`state.quarter` con default al trimestre corrente. Cambio del picker → reload della vista attiva.
- **Mock fallback:** se `/users` è vuoto o irraggiungibile, l'app cade su `js/data/mock-users.js` per non bloccare i test. In produzione assicurati che `/users` sia popolato.
- **Sicurezza:** l'access control è **applicativo**, non a livello di Firebase Rules. Le rules attuali consentono lettura/scrittura ad ogni utente autenticato anonimo. Per il lock down, vedi il prossimo punto.

---

## Roadmap

- [ ] **Firebase Security Rules** che restringano la scrittura agli utenti autenticati e basate sul claim email per la corrispondenza con `/users`.
- [ ] **Export PDF** della Vista Colloquio per archiviazione cartacea.
- [ ] **Cronologia trimestri** confrontabile: vedere l'evoluzione delle macro-aree nel tempo.
- [ ] **Notifiche** quando una scheda viene compilata o sottoposta a revisione.

---

## Licenza

Uso interno — Dataexpert · Area CCM. Non distribuire senza autorizzazione.

<div align="center">

*Powered by* `Vanilla JS · Firebase · Azure AD`

</div>
