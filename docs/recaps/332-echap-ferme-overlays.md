# #332 — Échap ferme les overlays plein écran (a11y) (1.9.266)

## Relecture + fausse piste écartée

Après avoir ajouté un 8ᵉ onglet de nav (Poids, #329), j'ai vérifié le **nav sur mobile** : grille 3
colonnes, 8 boutons → 3 lignes propres, **aucun débordement horizontal**. Pas cassé → je n'ai pas
touché.

## Le manque retenu (type frais : a11y / interaction)

Les 3 overlays plein écran (`#weekPage` Agenda, `#calendarPage`, `#ultraPage`) sont des `div`
masqués par attribut `hidden`, pas des `<dialog>` natifs. Résultat : **la touche Échap ne les
fermait pas** — il fallait viser le bouton ×. Attente standard non satisfaite.

## Ce qui change

Un handler global `keydown` sur Échap :
1. si un `<dialog>` natif est ouvert → on ne fait rien (guidée, onboarding, édition agenda gèrent
   Échap eux-mêmes, pas de doublon) ;
2. sinon, si une **édition d'habitude** est en cours → on l'annule ;
3. sinon, on ferme l'**overlay plein écran** actuellement visible (calendrier / semaine / ultra).

## Vérification navigateur (vraie touche Échap)

| Scénario | Résultat |
|---|---|
| Agenda (weekPage) ouvert → Échap | ✅ fermé |
| Calendrier ouvert → Échap | ✅ fermé |
| `<dialog>` natif ouvert → Échap ne touche pas l'overlay dessous | ✅ (le dialog gère) |

## Tests

355 tests `node:test` + smoke `escapeOverlay` **bloquant** (Échap ferme weekPage et calendarPage).

## Rotation

#332 — ouvre la rotation 31 (build 1.9.266).
