# #367 — Coach adaptatif : ancré dans les objectifs perso (3.0 · Vague 1) (2.0.11)

Dernière brique de la Vague 1 « cœur » : le coach comptait générique (« 2 jours actifs cette
semaine ») ; il compte maintenant **par rapport à ce qu'Adrien s'est fixé**.

## Ce qui change

- `adaptiveCoachFocus` enrichit l'insight du pilier choisi avec son **objectif hebdo perso**
  (semaine CALENDAIRE lundi → aujourd'hui, distincte de la fenêtre glissante 7 j de la dynamique) :
  - **sport** : `goals.sessions` → « Objectif hebdo : 1/4 séances. » (ou « déjà tenu … 💪 ») ;
  - **focus** : `focusWeekGoal` (cible 120 min/sem) → « Objectif hebdo : 25/120 min de focus. » ;
  - pas d'objectif défini → pas de ligne (aucun bruit) ; l'alternance affichait déjà le sien.

## Bug attrapé en route (leçon réapprise)

`\/` dans une regex du smoke → le template literal d'`executeJavaScript` le réduit en `/` → la regex
se termine trop tôt → `SyntaxError: Invalid regular expression flags`. Corrigé en `\\/` (même famille
que le piège `\\n` documenté en #358).

## Vérification navigateur

Sport en recul + objectif 4 séances → « … Un petit geste suffit à repartir. **Objectif hebdo : 1/4
séances.** » ✅. Aucune erreur console.

## Tests

384 tests (sport 1/4 calendaire, absence de ligne sans objectif, focus 25/120) + assertion smoke.

## Contexte

Build **2.0.11**, **publié en Release groupée du jour** (trio coach : mémoire #365 + taux de suivi
#366 + objectifs #367). La **Vague 1 « Coaching adaptatif » est fonctionnellement complète** :
observe → priorise (alternance) → se souvient → s'évalue → parle selon TES objectifs.
Prochaine vague (ordre validé) : **Fondations techniques** (IndexedDB, archi) — gros chantier à
découper en tranches sûres.
