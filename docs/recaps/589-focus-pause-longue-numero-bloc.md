# #589 — Focus : la suggestion de pause longue affiche le bon numéro de bloc (build 2.0.205)

## Rotation des domaines (§4 bis.3) — contrôle AVANT de coder

`grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)` →
`coach · docs · athlete · coach · etudes`.

- **2 derniers recaps** = `coach`, `docs` → **interdits**.
- **coach** apparaît **2×** dans les 5 derniers → interdit aussi à ce titre (et la
  **priorité de nuit #1** — pousser le coaching à fond — reste **rotation-bloquée** ce tour :
  §3 sanctuarise la rotation du coach, la demande ne prime jamais sur §3).
- `athlete` et `etudes` = 1×, hors des 2 derniers → autorisés ; domaines **jamais vus** dans les
  5 derniers (focus, nutrition, sommeil, agenda, alternance…) → autorisés.

Domaine retenu : **`focus`** — absent des 5 derniers, et le plus proche de la mission « coaching »
sans être le coach adaptatif lui-même (le minuteur/Pomodoro est une fonction distincte).

## Contexte — protocole « backlog vide »

Backlog nommé **P1–P7 tout coché** ; P4 (regex FR) **épuisé** ; familles de bugs purs **closes**
(mémoire + recaps #584/#586). On applique donc le protocole « backlog vide » (§898 ROADMAP,
précédent #584) : **chasser un défaut prouvable dans un domaine autorisé**, sans forcer.

Une chasse ciblée (agent, trace manuelle des fonctions pures focus/nutrition/sommeil/agenda/
alternance) a conclu **zéro bug de calcul** — cohérent avec la maturité (546+ itérations). Mais elle
a relevé **une inexactitude de texte réelle et user-visible** dans le domaine focus, non couverte
par les audits précédents.

## Le défaut — prouvé

`breakSuggestion` (`logic.js:4588`) ferme la boucle Pomodoro : à chaque **multiple de 4** blocs de
concentration (`long = n % 4 === 0`), elle propose une **vraie pause longue**. Or sa note était
**figée** :

```
'Quatrième bloc d’affilée — accorde-toi une vraie coupure : marche, mange, éloigne-toi de l’écran.'
```

Le test existant (`logic.test.js:2102`) prouve pourtant que `breakSuggestion(50, 8).long === true` :
au **8ᵉ** (ou 12ᵉ, 16ᵉ…) bloc de la journée, la pause longue se déclenche **et** l'utilisateur lit
« **Quatrième** bloc d'affilée » — factuellement faux. La note est rendue telle quelle dans
`#focusBreakSuggest` (`app.js:1002`, via `escapeHtml(bs.note)`) → surface **lue par l'utilisateur**.

## Le correctif — chirurgical, aucune note ajoutée

Numéro **dynamique** au lieu du littéral figé (§3 : « rendre une formulation plus juste » ; **aucun
champ ni note ajoutés**) :

```js
`${n}ᵉ bloc d’affilée — accorde-toi une vraie coupure : marche, mange, éloigne-toi de l’écran.`
```

- `n` est déjà borné en amont (`Math.max(1, Math.round(...))`) et la branche `long` n'est atteinte
  que si `n % 4 === 0` → `n ≥ 4`, jamais `1` → pas de piège « 1er » sur l'ordinal `ᵉ`.
- n=4 → « 4ᵉ bloc d'affilée… » (équivalent à l'ancien « Quatrième »), n=8 → « 8ᵉ bloc… » (corrigé).
- La pause **courte**, sa durée conseillée et les autres notes ne changent pas.

## Contrôle de cohérence (§4 ter)

Surface `#focusBreakSuggest` = **une seule note** (pas un pavé cumulé). Rendu chargé relu pour n=8 :
« 8ᵉ bloc d'affilée — accorde-toi une vraie coupure : marche, mange, éloigne-toi de l'écran. » —
exact, cohérent, ne contredit rien d'adjacent.

## Vérification

- +3 assertions (`logic.test.js` : la note commence par « 4ᵉ / 8ᵉ / 12ᵉ bloc », plus de « Quatrième »
  figé).
- Check smoke **bloquant** `focusBreak` étendu : `breakSuggestion(50, 8).note` commence par
  « 8ᵉ bloc ».
- `cd src && xvfb-run -a npm run verify` → **537 tests + smoke, 100 % vert**.

Bump 2.0.204 → **2.0.205** ; entrée CHANGELOG en tête + les 2 assertions `CHANGELOG[0].v`.

Domaine : focus
