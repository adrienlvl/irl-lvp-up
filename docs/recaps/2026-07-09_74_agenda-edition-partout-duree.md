# Boucle #74 — Agenda : édition partout + durée + report · build 1.9.8

**Demande d'Adrien :** « dans la section agenda aussi, tu peux toujours l'améliorer ! »

## Livré (3 améliorations)

1. **Éditer depuis les 3 vues.** Avant, seule la vue Jour permettait d'éditer, et en vue **Mois un clic supprimait** l'événement (dangereux). Désormais :
   - **Vue Mois** : clic sur un événement → **boîte d'édition** (suppression déplacée dans la boîte, plus par accident). Icône `✎` au lieu de `×`.
   - **Vue Semaine** : les chips de **vrais événements** sont cliquables → édition (les récurrents/plans/anniversaires ne sont plus faux-cliquables).
2. **Durée d'événement.** Champ « ⏱️ durée (min) » dans la boîte d'édition ; l'**heure de fin** s'affiche en vue Jour (« 15:00 → 16:30 »). Défaut 1 h (comme Google Agenda), alimente aussi l'export `.ics` (DTEND). `todayItems` propage `durationMin`.
3. **« → demain ».** Bouton sur chaque événement de la vue Jour pour le **reporter au lendemain** en un clic.

## Détail technique

- `lib/logic.js` : `todayItems` propage `durationMin`.
- `app.js` : `renderMonthCalendar` (event → `data-edit-agenda`), `#monthCalendar.onclick` → `openAgendaEdit` ; `renderWeekPage` (chips éditables → `data-edit-agenda`, gardés aux vrais événements), `#weekGrid.onclick` ; `endTimeOf()` + affichage heure de fin ; bouton/handler `data-day-postpone` ; boîte d'édition + `openAgendaEdit`/submit gèrent `durationMin`.
- `index.html` : `#editAgendaDuration`. `extras.css` : `.day-move`, `.day-end`, curseurs.

## Vérifs

- `npm run verify` → **124 tests / 124 pass**, **SMOKE OK**.
- **Flux réel Electron** : événement 15:00 durée 90 → vue Jour affiche **« 15:00 → 16:30 »** ✓ ; bouton **« → demain »** décale la date ✓ ; **clic chip Semaine** (vrai événement, id 7) → édition ouverte ✓ ; **clic événement Mois** → édition (pas suppression), item conservé ✓ ; chips non-éditables sans `data-edit-agenda` (1 éditable sur 8) ✓.
- Bug attrapé au passage : les chips Semaine des plans/récurrents portaient `data-edit-agenda` (faux-cliquables) → restreint aux vrais événements agenda.
