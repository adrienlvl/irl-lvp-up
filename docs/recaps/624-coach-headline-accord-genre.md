# #624 — Coach « Le focus du moment » : accord du déterminant du headline (genre + élision)

Build **2.0.234** · boucle #624 · 2026-07-21

## Contexte

Priorité de nuit = coaching (§3 QUALITÉ : « rendre une formulation plus juste »). **Rotation OK
avant de coder** : les 5 derniers recaps sont `sommeil` (#623), `robustesse` (#622), `coach` (#621),
`robustesse` (#620), `nutrition` (#619) → `coach` absent des 2 derniers, 1× sur 5 → autorisé.
`sommeil`/`robustesse` bloqués (2 derniers ; robustesse 2× sur 5). La série coaching élite est finie
(seul « Base d'exercices » reste, proposition-gated #610) → rotation normale.

## Défaut prouvé par mesure (rendu §4 ter)

Rendu de `adaptiveCoachFocus` sur états chargés (P5 — mesurer, pas supposer) : le **headline** de la
carte coach construisait son déterminant en dur — `Ton ${L}` (rebuild/reinforce) et `Reprends le ${L}`
(revive) — sans accord de genre ni élision. Trois formes fautives visibles dès que le pilier choisi
était la NUTRITION (féminin) ou l'ENTRAÎNEMENT (voyelle initiale) :

- `Ton nutrition s'essouffle` / `Ton nutrition monte en régime` → **faute de genre** (« nutrition » est féminin) ;
- `Reprends le nutrition` → même faute de genre ;
- `Reprends le entraînement` → **élision oubliée**.

Preuve interne que c'est un oubli, pas un choix : le même fichier écrit déjà **« ta nutrition »** dans
la phrase des piliers secondaires (`POSSESSIF = { …, nutrition: 'ta nutrition' }`, ligne 7509) — mais
cette map est définie plus bas et hors de portée du code des headlines (~5526).

## Correctif (§3, zéro champ ajouté)

Au site des headlines : dérivation du déterminant à partir du genre du pilier (seule la nutrition est
féminine) et d'un test de voyelle initiale pour l'élision.

```js
const femPillar = chosen.pillar === 'nutrition';
const vowelL = /^[aeiouâàäéèêëîïôöûü]/i.test(L);
const Poss = femPillar && !vowelL ? 'Ta' : 'Ton'; // « ton » se maintient devant une voyelle
const art  = vowelL ? 'l’' : (femPillar ? 'la ' : 'le ');
```

Résultat vérifié en rendu :

| pilier | rebuild | revive | reinforce |
|---|---|---|---|
| sport | Ton entraînement s'essouffle | Reprends **l'**entraînement | Ton entraînement monte en régime |
| focus | Ton focus s'essouffle | Reprends le focus | Ton focus monte en régime |
| sommeil | Ton sommeil s'essouffle | Reprends le sommeil | Ton sommeil monte en régime |
| nutrition | **Ta** nutrition s'essouffle | Reprends **la** nutrition | **Ta** nutrition monte en régime |

Piliers masculins **inchangés**. Le fond du conseil est identique — seul le déterminant est corrigé.

## §4 ter — contrôle de cohérence

Carte cumulée relue sur état chargé (nutrition rebuild + note hydratation) : « **Ta nutrition
s'essouffle.** 2 jours actifs cette semaine, contre 6 la précédente. Un petit geste suffit à repartir.
Côté hydratation en revanche, ça décroche… » → titre correct, suite cohérente, rien à curer.

## Vérification

- Test dédié ajouté (`adaptiveCoachFocus : accorde le déterminant du headline (genre + élision)`) :
  nutrition rebuild/revive/reinforce → « Ta/la » ; entraînement revive → élision ; sport rebuild &
  sommeil revive → masculins inchangés.
- `xvfb-run -a npm run verify` : **568 tests + smoke 100 % vert**.
- Bump 2.0.234 + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v` (logic.test.js & smoke).

Domaine : coach
