# Boucle #83 (autonome) — Cliquer un jour (vue Semaine) → vue Jour · build 1.9.17

**Contexte :** 8ᵉ itération de la boucle autonome. Navigation agenda.

## Livré

Dans la **vue Semaine**, cliquer sur une **colonne de jour** (n'importe où sauf sur un événement) **ouvre ce jour en vue Jour** : `dayCursor` réglé sur la date, vue basculée sur « Jour » (mémorisée), libellé et grille horaire du jour affichés.

Cliquer un **événement** ouvre toujours son édition (priorité au clic sur le chip) ; cliquer ailleurs dans la colonne saute au jour.

## Détail technique

- `app.js` : chaque `.week-page-day` porte `data-jump-day="<date>"` ; le handler `#weekGrid` teste d'abord `data-edit-agenda` (chip → édition, `return`) puis `data-jump-day` (→ `dayCursor` + `agendaView='day'` + `renderAgenda`).
- `calendar-page.css` : `cursor:pointer` + survol accentué sur `.week-page-day`.

## Vérifs

- `npm run verify` → **128 tests / 128 pass**, **SMOKE OK**.
- **Flux réel Electron** : vue Semaine (7 jours `data-jump-day`), clic sur le 3ᵉ jour (8 juillet) → bascule en vue Jour, libellé « mercredi 8 juillet », date de l'ajout rapide = 2026-07-08. ✅
