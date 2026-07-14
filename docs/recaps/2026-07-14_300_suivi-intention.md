# #300 — Suivi d'intention : matin → soir (1.9.234)

**Rotation 23 · item #1 · 300ᵉ boucle · piste « trous », dernier champ des rituels**

## Problème
`morningRituals[].intention` était le dernier trou identifié des rituels : sa seule
lecture dans `app.js` était le `.value=` de repeuplement de son propre champ.
Adrien pose une intention chaque matin, elle est conservée, et jamais relue.

**Mais** : après #296 (victoires), #297 (leçons) et #299 (« ce qui a avancé »),
un 4ᵉ bloc-liste plat de textes passés aurait été paresseux et répétitif. Le
champ méritait mieux qu'un historique de plus.

## Amélioration
Plutôt qu'un historique, un **nouvel indicateur** : relier l'intention du matin à
la victoire du soir **du même jour** donne un taux de **suivi d'intention** —
une information qui n'existait nulle part, dérivée de deux champs déjà saisis.

### Logique pure — `intentionFollowThrough(rituals, reflections, todayKey, opts)`
- Indexe les intentions non vides par date, et les victoires non vides par date.
- Une intention est **« suivie »** si une victoire a été notée le soir du même jour.
- **Le jour courant est exclu** : sa victoire du soir n'est pas encore écrite, le
  compter comme « non tenue » serait injuste. *(Verrouillé par un test dédié :
  même avec une victoire déjà écrite aujourd'hui, le jour reste hors du taux.)*
- Fenêtre `days = 14`, `cap = 5` paires affichées — mais **le taux porte sur toute
  la fenêtre**, pas seulement sur les paires affichées (testé).
- Renvoie `{ total, kept, rate, pairs: [{date, daysAgo, intention, win, kept}] }`
  ou `null` si aucune intention exploitable.

### Rendu — dans `renderFocusRitual()`
- Bloc `#intentionFollow`, liseré selon le taux (vert ≥ 70 %, ambre < 40 %).
- « 🎯 **Intentions suivies : 2/3** (67 %) », puis les paires :
  `✓ Finir le chapitre 3 de compta → Chapitre 3 bouclé`
  `· Réviser la TVA — pas de victoire notée ce jour-là`
- Note explicite sous le bloc pour que le critère soit transparent.

## Tests
- `logic.test.js` : taux et paires ; **exclusion du jour courant** (y compris
  quand une victoire du jour existe déjà) ; intentions vides / hors fenêtre
  exclues ; victoire vide ≠ victoire ; victoire sans intention ignorée ; `cap`
  n'altère pas le taux ; entrées invalides → `null`.
- `renderer-smoke.cjs` : check `intentionFollow`.
- `npm run verify` : **324 tests + SMOKE OK** (`whatsNew` vert).
- Vérif navigateur (4 intentions dont 1 aujourd'hui, 2 victoires) :
  « 🎯 Intentions suivies : **2/3** (67 %) » — l'intention du jour est bien exclue. ✔

## Fichiers
- `src/lib/logic.js` — `intentionFollowThrough()` + export + CHANGELOG[0] 1.9.234.
- `src/app.js` — bloc dans `renderFocusRitual()`.
- `src/index.html` — `#intentionFollow` après `#morningEnergyTrend`.
- `src/companion.css` — `.intention-follow`.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

## Bilan de la piste « trous » (#295 → #300, 6 succès)
Tous les champs des rituels matin/soir/focus sont désormais exploités :
`win` ✅ · `lesson` ✅ · `intention` ✅ (via le suivi) · `firstStep` (déjà surfacé)
· `energy` ✅ (tendance) · `outcome` ✅ · `next` (déjà surfacé). Restent hors
rituels : quêtes non faites, bien-être planifié non fait, `state.photos`,
`state.plans` non réalisés.
