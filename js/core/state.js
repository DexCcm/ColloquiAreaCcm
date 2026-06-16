/**
 * ColloquiTeam · core/state.js
 * -------------------------------------------------------------------
 * Stato applicativo condiviso + helper periodo corrente.
 */

/**
 * Calcola anno e trimestre dalla data corrente (rivalutato a ogni chiamata).
 * Esempio: giugno 2026 → { year: 2026, quarter: 'Q2' }.
 * Usato sia per inizializzare lo state sia per il bottone "↺ Oggi"
 * del period picker.
 */
window.todayPeriod = function () {
  const d = new Date();
  return {
    year: d.getFullYear(),
    quarter: 'Q' + Math.ceil((d.getMonth() + 1) / 3)
  };
};

const _today = window.todayPeriod();

window.state = {
  currentUser:  null,
  year:         _today.year,
  quarter:      _today.quarter,
  scheda:       null,
  lockedAt:     null,
  saveTimer:    null,
  observer:     null,
  formContext:  null
};
