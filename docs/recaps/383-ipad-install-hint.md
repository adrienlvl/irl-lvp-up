# #383 — Aide d'installation reconnue sur iPad (2.0.27)

## Le manque (robustesse UX, vrai bug device)

`isIosInstallable(userAgent, standalone)` décidait d'afficher le bandeau d'aide « Ajoute l'app à
l'écran d'accueil » sur la seule présence de `iphone|ipad|ipod` dans le user-agent :

```js
return /iphone|ipad|ipod/i.test(String(userAgent || '')) && standalone !== true;
```

Or **depuis iPadOS 13 (2019), Safari sur iPad annonce un user-agent « Macintosh »** (plus aucune
occurrence de « iPad »), pour demander les sites de bureau. Conséquence : sur un iPad récent, le
test échouait et le rappel d'installation **ne s'affichait jamais** — l'iPad était le seul appareil
iOS privé de l'aide. Le commentaire prétendait « Pur + testé » alors que la fonction n'avait
**aucun test**.

## Le correctif (minimal, rétrocompatible)

On reconnaît l'iPad-déguisé-en-Mac à son **écran tactile** — signal fiable, car un vrai Mac de
bureau a `maxTouchPoints` à 0 :

```js
function isIosInstallable(userAgent, standalone, maxTouchPoints) {
  const ua = String(userAgent || '');
  const isTouchMac = /macintosh|mac os x/i.test(ua) && Number(maxTouchPoints) > 1;
  return (/iphone|ipad|ipod/i.test(ua) || isTouchMac) && standalone !== true;
}
```

- **Cas nominaux inchangés** : iPhone, iPad ancien (UA « iPad »), Android, standalone → identiques.
- **Pas de faux positif** : Mac de bureau (`maxTouchPoints` 0) → `false`.
- **Rétrocompatible** : 3ᵉ argument absent → `Number(undefined)` = NaN, `NaN > 1` = false — un appel
  hérité `isIosInstallable(ua, standalone)` garde le comportement d'avant.

Renderer (`app.js`) : l'appel passe désormais `navigator.maxTouchPoints`.

## Tests

- **logic.test.js** (+1 bloc) : `isIosInstallable` — iPhone, iPad ancien, Android, standalone,
  **iPad iPadOS 13+** (UA Macintosh + `maxTouchPoints` 5 → true), Mac de bureau (0 → false),
  absence du 3ᵉ arg (Macintosh reste non-iOS), entrées vides/null.
- **renderer-smoke.cjs** : nouveau check **bloquant** `iosInstallHint` (fonction + `#iosInstallHint`
  + cas iPhone/standalone/iPad-Mac tactile/Mac-bureau), poussé dans `errors`.

`verify` : **410 tests + smoke** verts (409 → 410).

## Contexte

Build **2.0.27**. Backlog autonome §4.1-4.2 (couverture d'une fonction pure non testée + robustesse
d'une détection device réelle). Domaine varié par rapport aux 2 itérations précédentes (parseurs).
Aucune Release, zéro dépendance, aucune donnée perso, aucune feature retirée.
