console.log('[load] templates');
/**
 * ColloquiTeam · data/templates.js
 * -------------------------------------------------------------------
 * Definizioni delle sezioni/voci delle schede.
 *
 * Comuni a Quadient e Papyrus:
 *   - RATING_LABELS  (5 livelli)
 *   - SOFT_SKILLS    (12 voci identiche)
 *
 * Varianti per area:
 *   - HARD_SKILLS_QUADIENT  vs  HARD_SKILLS_PAPYRUS
 *   - KPI_QUADIENT          vs  KPI_PAPYRUS   (differiscono nella voce 6)
 *   - RUOTA_MACRO_QUADIENT  vs  RUOTA_MACRO_PAPYRUS  (differiscono macro 5,6 + sottotitolo macro 1)
 *
 * Alias retro-compatibili:
 *   - KPI_OPERATIVE  →  KPI_QUADIENT
 *   - RUOTA_MACRO    →  RUOTA_MACRO_QUADIENT
 */

window.RATING_LABELS = ['Carente', 'Acerbo', 'Adeguato', 'Solido', 'Punto di forza'];

window.SOFT_SKILLS = [
  'Comunicazione (chiarezza, trasparenza)',
  'Puntualità e rispetto degli orari',
  'Coinvolgimento e partecipazione attiva',
  'Lavoro in Team e collaborazione',
  'Proattività (proporre, non solo eseguire)',
  'Atteggiamento e autocontrollo',
  'Autonomia decisionale',
  'Concentrazione e attenzione sui task',
  'Organizzazione e pianificazione',
  'Ascolto e apertura al confronto',
  'Gestione cliente',
  'Confronto con i propri responsabili'
];

window.HARD_SKILLS_QUADIENT = [
  'Quadient Inspire Designer',
  'Quadient Inspire Interactive',
  'Quadient Inspire Scaler',
  'Quadient Dynamic Communication',
  'Scripting Designer',
  'Approval Process Interactive',
  'Inspire Evolve',
  'Utilizzo AI',
  'SQL · gestione DB (SSMS)',
  'Accessibilità documenti — Inspire Designer + Tools',
  'Qualità del codice (efficiente, descrittivo)',
  'Lingua Inglese'
];

window.HARD_SKILLS_PAPYRUS = [
  'Papyrus Designer',
  'Papyrus Webrepository',
  'Papyrus Convertitori e tool risorse',
  'Papyrus strumenti di formattazione',
  'Setup ambiente operativo',
  'Programmazione batch',
  'Training neo risorse',
  'Utilizzo AI',
  'Gestione DB (SSMS)',
  'Accessibilità',
  'Qualità del codice (efficiente, descrittivo)',
  'Lingua Inglese'
];

window.KPI_QUADIENT = [
  'Aderenza alle stime',
  'Rispetto delle scadenze',
  'Tracciatura del lavoro su Zoho Project',
  'Gestione del carico di lavoro',
  'Qualità delle soluzioni',
  'Rispetto della compliance e degli standard',
  'Manutenibilità del lavoro',
  'Documentazione',
  'Comunicazione dell’avanzamento',
  'Gestione di imprevisti e blocchi',
  'Ottimizzazione dei workflow',
  'Approccio critico alle soluzioni cliente'
];

window.KPI_PAPYRUS = [
  'Aderenza alle stime',
  'Rispetto delle scadenze',
  'Tracciatura del lavoro su Zoho Project',
  'Gestione del carico di lavoro',
  'Qualità delle soluzioni',
  'Rispetto compliance e standard',
  'Manutenibilità del lavoro',
  'Documentazione',
  'Comunicazione dell’avanzamento',
  'Gestione di imprevisti e blocchi',
  'Ottimizzazione dei workflow',
  'Approccio critico alle soluzioni cliente'
];

window.RUOTA_MACRO_QUADIENT = [
  { titolo: 'Comunicazione',             voci: 'Coi responsabili · Con il cliente · Nel team' },
  { titolo: 'Disciplina personale',      voci: 'Puntualità · Concentrazione · Organizzazione' },
  { titolo: 'Atteggiamento & relazioni', voci: 'Autocontrollo · Lavoro in team · Ascolto' },
  { titolo: 'Autonomia & iniziativa',    voci: 'Proattività · Autonomia · Coinvolgimento' },
  { titolo: 'Quadient core',             voci: 'Inspire · Interactive · Evolve · Scaler' },
  { titolo: 'Scripting & integrazioni',  voci: 'Scripting Inspire · Extra' },
  { titolo: 'Competenze trasversali',      voci: 'SQL · Accessibilità · Business English' },
  { titolo: 'Qualità della consegna',    voci: 'Codice · Documentazione · Manutenibilità' }
];

window.RUOTA_MACRO_PAPYRUS = [
  { titolo: 'Comunicazione',             voci: 'Con i responsabili · Con il cliente · Nel team' },
  { titolo: 'Disciplina personale',      voci: 'Puntualità · Concentrazione · Organizzazione' },
  { titolo: 'Atteggiamento & relazioni', voci: 'Autocontrollo · Lavoro in team · Ascolto' },
  { titolo: 'Autonomia & iniziativa',    voci: 'Proattività · Autonomia · Coinvolgimento' },
  { titolo: 'Papyrus core',              voci: 'Designer · Convertitore · Tools Vari' },
  { titolo: 'Scripting & integrazioni',  voci: 'Scripting Papyrus WebRepo · Extra' },
  { titolo: 'Competenze trasversali',      voci: 'SQL · Accessibilità · Business English' },
  { titolo: 'Qualità della consegna',    voci: 'Codice · Documentazione · Manutenibilità' }
];

// Alias retro-compatibili (codice esistente che usa i nomi "neutri")
window.KPI_OPERATIVE = window.KPI_QUADIENT;
window.RUOTA_MACRO   = window.RUOTA_MACRO_QUADIENT;

// ════════════════════════════════════════════════════════════════════
// RUOTA · mapping voci → macro-area + funzione di calcolo automatico
// ════════════════════════════════════════════════════════════════════
//
// Indici macro nelle RUOTA_MACRO_*:
//   0 = Comunicazione
//   1 = Disciplina personale
//   2 = Atteggiamento & relazioni
//   3 = Autonomia & iniziativa
//   4 = Core (Quadient o Papyrus)
//   5 = Scripting & integrazioni
//   6 = Competenze trasversali
//   7 = Qualità della consegna
//
// Ogni array mapping ha lunghezza pari alla rispettiva lista voci.
// L'indice della voce dà l'indice della macro che alimenta.

window.RUOTA_MAPPING = {
  // Soft Skills (identiche tra Quadient e Papyrus)
  soft: [
    0,  // 0  Comunicazione (chiarezza, trasparenza) → Comunicazione
    1,  // 1  Puntualità e rispetto degli orari   → Disciplina personale
    3,  // 2  Coinvolgimento e partecipazione attiva → Autonomia & iniziativa
    2,  // 3  Lavoro in Team e collaborazione        → Atteggiamento & relazioni
    3,  // 4  Proattività                            → Autonomia & iniziativa
    2,  // 5  Atteggiamento e autocontrollo          → Atteggiamento & relazioni
    3,  // 6  Autonomia decisionale                  → Autonomia & iniziativa
    1,  // 7  Concentrazione e attenzione sui task   → Disciplina personale
    1,  // 8  Organizzazione e pianificazione        → Disciplina personale
    2,  // 9  Ascolto e apertura al confronto        → Atteggiamento & relazioni
    0,  // 10 Gestione cliente                       → Comunicazione
    0   // 11 Confronto con i propri responsabili    → Comunicazione
  ],
  // KPI Operative (identiche tra Q e PP per macro mapping)
  kpi: [
    1,  // 0  Aderenza alle stime                    → Disciplina personale
    1,  // 1  Rispetto delle scadenze                → Disciplina personale
    7,  // 2  Tracciatura del lavoro su Zoho Project → Qualità della consegna
    1,  // 3  Gestione del carico di lavoro          → Disciplina personale
    7,  // 4  Qualità delle soluzioni                → Qualità della consegna
    7,  // 5  Rispetto compliance e standard         → Qualità della consegna
    7,  // 6  Manutenibilità del lavoro              → Qualità della consegna
    7,  // 7  Documentazione                         → Qualità della consegna
    0,  // 8  Comunicazione dell’avanzamento         → Comunicazione
    3,  // 9  Gestione di imprevisti e blocchi       → Autonomia & iniziativa
    7,  // 10 Ottimizzazione dei workflow            → Qualità della consegna
    3   // 11 Approccio critico alle soluzioni cliente → Autonomia & iniziativa
  ],
  // Hard Skills Quadient (12 voci)
  hard_quadient: [
    4,  // 0  Quadient Inspire Designer          → Quadient core
    4,  // 1  Quadient Inspire Interactive       → Quadient core
    4,  // 2  Quadient Inspire Scaler            → Quadient core
    4,  // 3  Quadient Dynamic Communication     → Quadient core
    5,  // 4  Scripting Designer                 → Scripting & integrazioni
    5,  // 5  Scripting Interactive              → Scripting & integrazioni
    4,  // 6  Inspire Evolve                     → Quadient core
    6,  // 7  Utilizzo AI                        → Competenze trasversali
    6,  // 8  SQL · gestione DB (SSMS)           → Competenze trasversali
    6,  // 9  Accessibilità documenti — Inspire  → Competenze trasversali
    7,  // 10 Qualità del codice                 → Qualità della consegna
    6   // 11 Lingua Inglese                     → Competenze trasversali
  ],
  // Hard Skills Papyrus (12 voci)
  hard_papyrus: [
    4,  // 0  Papyrus Designer                       → Papyrus core
    4,  // 1  Papyrus Webrepository                  → Papyrus core
    4,  // 2  Papyrus Convertitori e tool risorse    → Papyrus core
    4,  // 3  Papyrus strumenti di formattazione     → Papyrus core
    5,  // 4  Setup ambiente operativo               → Scripting & integrazioni
    5,  // 5  Programmazione batch                   → Scripting & integrazioni
    6,  // 6  Training neo risorse                   → Competenze trasversali
    6,  // 7  Utilizzo AI                            → Competenze trasversali
    6,  // 8  Gestione DB (SSMS)                     → Competenze trasversali
    6,  // 9  Accessibilità                          → Competenze trasversali
    7,  // 10 Qualità del codice                     → Qualità della consegna
    6   // 11 Lingua Inglese                         → Competenze trasversali
  ]
};

/**
 * Calcola i valori della ruota (8 macro-aree, scala 0-10) aggregando
 * i rating compilati nelle 3 schede (Soft, Hard, KPI) tramite RUOTA_MAPPING.
 *
 * @param {Object} scheda     - oggetto scheda con softSkills/hardSkills/kpi
 * @param {string} variante   - 'quadient' | 'papyrus'
 * @returns {Array<number>}   - 8 valori interi 0..10
 */
window.computeRuotaFromScheda = function (scheda, variante) {
  const m = window.RUOTA_MAPPING;
  const hardMap = (variante === 'papyrus') ? m.hard_papyrus : m.hard_quadient;
  const buckets = [[], [], [], [], [], [], [], []];

  const collect = (data, mapping) => {
    if (!data || !mapping) return;
    Object.keys(data).forEach(k => {
      const idx = parseInt(k, 10);
      const r = data[k];
      const macroIdx = mapping[idx];
      if (typeof macroIdx === 'number' && typeof r === 'number' && r >= 1 && r <= 5) {
        const score = (r - 1) * 2.5;   // 1..5  →  0, 2.5, 5, 7.5, 10
        buckets[macroIdx].push(score);
      }
    });
  };

  collect(scheda.softSkills, m.soft);
  collect(scheda.hardSkills, hardMap);
  collect(scheda.kpi,        m.kpi);

  return buckets.map(arr => {
    if (arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return Math.round(sum / arr.length);
  });
};
