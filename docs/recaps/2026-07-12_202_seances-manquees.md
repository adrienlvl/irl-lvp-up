# Boucle #202 (autonome) — Cohérence agenda ↔ entraînement (séances manquées) · build 1.9.136

**Amélioration de fond (cohérence agenda/entraînement).** L'app programme des séances dans l'agenda (programme auto, plan course, planificateur) et connaît la **prochaine** séance (`nextTrainingSession`), mais ne signalait pas les séances **prévues et non faites** — l'utilisateur peut décrocher sans s'en rendre compte.

## Livré — rappel bienveillant des séances manquées

Dans Athlète, si des séances sport étaient prévues dans les **14 derniers jours** et n'ont été **ni faites ni loguées**, un encart mauve les liste avec un ton non culpabilisant :

> 🗓️ **2 séances prévues non faites (14 j)** — Pas de culpabilité, reprends le fil quand tu veux : Haut du corps (13/07), Course facile (11/07).

Une séance est considérée faite si elle est **cochée** dans l'agenda **ou** si une séance a été **loguée le même jour**.

## Détail technique

- **`lib/logic.js`** : `missedSessions(agenda, workouts, todayKey, {days=14, cap=5})` → `[{date, title}]` (récent→ancien) ; exclut le futur, le non-sport, hors fenêtre, complétées et jours entraînés. Pur + testé.
- **`app.js`** : rendu de `#missedSessions` sous le conseil de charge. **`index.html`** + **`athlete.css`** : encart `.missed-sessions`.

## Vérifs

- `npm run verify` → **236 tests / 236 pass** (+1 : `missedSessions`), garde-fou CSS vert, **SMOKE OK** (`missedSessions:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.136.exe** (app d'Adrien jamais fermée).

## Note

L'app est désormais extrêmement complète. Les prochaines idées vraiment neuves à forte valeur se raréfient — un point à Adrien approche.
