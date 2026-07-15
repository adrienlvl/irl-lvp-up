# #338 — Suggestion de pause après chaque bloc de focus (1.9.272)

## Le manque

Le cœur du Pomodoro, c'est **travail + pause**. L'app avait un excellent minuteur de travail
(presets 25/50/90, pause/reprise, persistance, bilan de fin) mais **aucune guidance de pause** :
à la fin d'un bloc, on te disait « puis une vraie pause » sans jamais dire *combien de temps*.
Résultat : soit on enchaîne sans souffler (le focus se dégrade), soit on part « juste 5 min »
qui deviennent 40. La boucle Pomodoro était à moitié ouverte.

## Ce qui change

Nouvelle fonction pure `breakSuggestion(focusMinutes, blocksToday)` :

- **Pause courte proportionnelle** au bloc qui vient de finir (≈ 1/5, bornée 5–20 min) :
  25 → 5 min, 50 → 10 min, 90 → 18 min.
- **Vraie pause longue tous les 4 blocs** (cadence Pomodoro classique) : 15–25 min, avec une
  invitation explicite à décrocher de l'écran.
- Note contextuelle (hydratation après un long bloc, micro-conseils sinon).

À la fin de chaque bloc, le dialogue « Bloc terminé » affiche en tête un encart
« ☕ Pause conseillée : N min » (ou « 🌿 Pause longue conseillée » au 4ᵉ) — juste avant les
champs de bilan. Rien de bloquant : une suggestion, pas un minuteur imposé.

## Vérification navigateur (flux réel)

| Cas | Résultat |
|---|---|
| 1er bloc de 25 min | ✅ « ☕ Pause conseillée : 5 min » + note courte |
| 4ᵉ bloc (3 déjà faits) de 50 min | ✅ « 🌿 Pause longue conseillée : 17 min » + invitation à décrocher |
| Dialogue de bilan | ✅ s'ouvre avec l'encart en tête, bordure orange (#f0883e), layout grid |

## Tests

359 tests `node:test` (proportionnalité + bornes, pause longue au 4ᵉ/8ᵉ, robustesse durée
nulle/négative/non-numérique, blocs absent → 1er bloc) + smoke `focusBreak` **bloquant**
(fonction exportée + `#focusBreakSuggest` présent).

## Rotation

#338 — rotation 32 (build 1.9.272). Prochain #339 clôture la rotation (tag v1.9.273).
