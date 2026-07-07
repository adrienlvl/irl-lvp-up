# Boucle #41 — Vue Jour de l'agenda (+ 1re vraie mise à jour auto)

**Date :** 2026-07-07
**Version :** 1.5.0 → 1.5.1

## Demande d'Adrien
> « Au niveau de l'agenda, la vue semaine est petite, et tu devrais mettre une vue par jour en vrai, ça serait mieux ! »

## Ce qui a été fait
- **Sélecteur de vue** `📆 Jour / 🗓️ Semaine` en tête de l'agenda (`#agendaViewSwitch`), avec **Jour par défaut** et mémorisation (`irl-agenda-view`). La « Vue mois » reste accessible.
- **Vue Jour** (`renderDayView`) : timeline lisible d'un **seul jour** — grosse heure à gauche, titre + type, pastille couleur par type (sport/vie/révision/focus), 🔴 priorité, barré si fait. Bien plus aéré que les 7 colonnes serrées de la semaine.
- **Navigation** ← → **jour par jour** en vue Jour (et toujours semaine par semaine en vue Semaine) ; bouton **Aujourd'hui** recale les deux.
- **Ajout rapide pré-réglé** : en vue Jour, le champ date se cale automatiquement sur le jour affiché → un clic « Ajouter » pose le bloc au bon jour.
- **Actions depuis la vue** : *Démarrer* une séance planifiée, *Valider* un bloc (créneau révision = +15 XP).
- **Filtres** (type + haute priorité) appliqués aussi à la vue Jour.
- Dispatcher `renderAgenda()` : masque/affiche la bonne vue (règles `[hidden]` explicites pour battre `display:grid`), synchronise les boutons.

## Vérifications
- `node --test` → **77/77** ✅ ; smoke → `SMOKE OK`, check `agendaDay:true`.
- Flux réel (Electron) : ouverture agenda → **vue Jour active**, semaine masquée ; label « mardi 7 juillet · aujourd'hui » ; « Rendez-vous A 10:00 » listé ; ← → passe au lendemain (« Rendez-vous B ») + date d'ajout = lendemain ; bascule Semaine → grille semaine ré-affichée. ✅

## Note — c'est la 1re mise à jour distribuée par l'auto-update
Après `npm run release` (par Adrien) + publication de la Release **v1.5.1**, les installations **v1.5.0** verront la bannière « Mise à jour prête ». → 1er test grandeur nature du système d'auto-update mis en place en #40.

## Suite
- **Nouvel audit UX complet** (toujours en attente).
