# Audit complet — IRL LVP UP 1.5.8 (2026-07-08)

_Demandé par Adrien avant de reprendre les boucles. Couvre : code, tests, sécurité, données, fonctionnel, UX. Les trouvailles alimentent directement les prochaines boucles._

---

## 1. État général

| Domaine | État | Détail |
|---|---|---|
| **Code** | 🟢 sain | `app.js` 290 l. (dense), `lib/logic.js` 839 l. (pur, testable), main 65 l., preload 2 l. Bonne séparation logique/rendu. |
| **Tests** | 🟢 solides | **93 tests** logique + 37 foods + smoke Electron à 25 checks. Tout vert. |
| **Sécurité** | 🟢 conforme Vague S | Sandbox + contextIsolation + CSP `self` + navigation verrouillée + IPC validés. `npm audit` : 9 « high » **tous dans la chaîne de build** (tar/node-gyp/electron-builder), rien dans le runtime livré. Nouvelles zones (habitudes, récurrents, anniversaires) : saisies passées par `escapeHtml` ✔. Auto-update : seul le main parle à GitHub ✔. |
| **Données** | 🟢 | Blob unique + backup disque + historique 14 j. Migrations douces via `normalizeState` (8 collections normalisées). |
| **UX** | 🟢 nettement amélioré | Dashboard 3,5 écrans (8 sections), Athlète **6,0**, Exercices 7,3 (catalogue + recherche collante), **réglages agenda 0,9 écran** (répliés ✔), Focus 2,6. Nav 6 onglets. |

## 2. 🔴 Trouvailles — écarts fonctionnels (le cœur de cet audit)

Les features récentes (récurrence, habitudes) ne sont **pas encore branchées partout** :

- [x] **F1 — Les notifications ignorent les événements récurrents.** → corrigé : le main réutilise `lib/logic.js` (`recurringToday`), résumé du matin + rappel « X min avant » couvrent les récurrents. ✅ _boucle #49 (1.5.9)._
- [x] **F2 — L'export .ics n'exporte pas les récurrents.** → corrigé : `buildRRuleLine` + `buildIcs` émettent des séries `RRULE` (round-trip testé), `exportAgendaIcs` inclut `state.recurring`. ✅ _boucle #49 (1.5.9)._
- [x] **F3 — Une occurrence récurrente n'est pas validable.** → corrigé : `doneLog[date]` sur `state.recurring`, bouton **Valider** dans « Ma journée » + vue Jour (`completeRecurringOn`), +15 XP pour les révisions, ✓ affiché. ✅ _boucle #50 (1.6.0)._
- [x] **F4 — Habitudes : le choix des jours n'est pas exposé.** → corrigé : 7 cases jours au formulaire (toutes cochées = tous les jours) ; la liste montre aussi les habitudes « pas aujourd'hui » (grisées, gérables). ✅ _boucle #50 (1.6.0)._
- [x] **F5 — Habitudes absentes du rappel du soir.** → corrigé : le bilan du soir compte blocs restants **+ occurrences récurrentes non validées + habitudes non faites**. ✅ _boucle #50 (1.6.0)._

> ✅ **Roadmap de l'audit terminée** (boucles #49–#50, 2026-07-08) — tous les écarts F1–F5 corrigés.

## 3. 🟡 Points de vigilance (pas bloquants)

- `index.html` : lignes très longues (sections monolithiques) — lisibilité du diff, pas un bug.
- Bibliothèque Exercices 7,3 écrans : catalogue assumé, recherche collante en place — rien à faire sauf demande.
- `tar` (build only) à purger quand electron-builder next sortira.
- Grosse file de versions non publiées (1.5.2 → 1.5.8) : un `npm run release` + Publish les diffusera d'un coup.

## 4. Plan de boucles proposé (repris immédiatement)

1. **Boucle A (F1+F2)** : notifications conscientes des récurrents (résumé matin, rappel avant, soir) + export .ics avec `RRULE`.
2. **Boucle B (F3)** : valider une occurrence récurrente (log `doneLog[date]`, XP, cohérent partout).
3. **Boucle C (F4+F5)** : habitudes — choix des jours dans l'UI + comptées dans le rappel du soir.

_Chaque boucle : tests purs + smoke + flux réel, bump + dist, commit + récap — sans fermer l'app d'Adrien._
