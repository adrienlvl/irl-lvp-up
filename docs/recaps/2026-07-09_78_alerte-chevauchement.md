# Boucle #78 (autonome) — Alerte chevauchement (double-booking) · build 1.9.12

**Contexte :** 3ᵉ itération de la boucle autonome (cadence rapide).

## Livré

Dans la **grille horaire** de la vue Jour, les événements **qui se chevauchent** (déjà placés côte à côte en colonnes) sont désormais **signalés** :
- **contour ambre** (`.dg-conflict`) sur les blocs concernés,
- badge **« ⚠️ chevauchement »** dans l'en-tête du jour dès qu'il y a au moins un conflit.

→ On repère d'un coup d'œil un double-booking (deux rendez-vous à la même heure).

## Détail technique

- `app.js` : `renderDayView` calcule `conflicts = cols.filter(c => c.cols > 1).length` (à partir de `dayColumns`, déjà testé) ; ajoute la classe `dg-conflict` aux blocs en colonne multiple et le badge dans l'en-tête.
- `extras.css` : `.dg-event.dg-conflict` (outline ambre) + `.day-conflict` (badge).

## Vérifs

- `node --check app.js` OK ; `npm run verify` → **125 tests / 125 pass**, **SMOKE OK**.
- Logique de détection déjà couverte par le test `dayColumns` (chevauchement → 2 colonnes).
