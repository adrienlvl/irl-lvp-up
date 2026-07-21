# #627 — Sommeil solide : le coach ne prescrit plus « coucher 30 min plus tôt » contre son propre verdict (2.0.237)

**Domaine : coach** — priorité de nuit coaching (§3 QUALITÉ, pas volume : contradiction insight↔action).
Rotation OK avant de coder : les 5 derniers recaps = athlete(626), nutrition(625), coach(624),
sommeil(623), robustesse(622). `coach` absent des **2** derniers et **1×** sur 5 → autorisé.

## Le manque (prouvé par rendu, pas supposé)

Sur la carte « Le focus du moment », quand **le sommeil est le pilier du jour** et qu'il n'y a **pas de
plan de recalage actif**, l'action était **toujours** :

> `sleepIns.irregular ? 'Couche-toi à heure fixe…' : 'Vise un coucher 30 min plus tôt ce soir.'`
> (`logic.js:6064`)

Or `sleepIns.tone === 'ok'` (verdict « **Sommeil solide : moy. X h, rythme régulier** ») implique
`durée ≥ 7 h` **ET** non irrégulier → il tombait dans la branche « vise un coucher 30 min plus tôt ».
Résultat, rendu sur état chargé (sommeil 8 h régulier, série célébrée) :

- **Verdict** : « Sommeil solide : moy. 8 h sur 6 nuits, rythme régulier. … 🔥 Ta série de 6 jours… 🏅 »
- **Action** : « Vise un coucher 30 min plus tôt ce soir. »

Le coach **félicite** un sommeil suffisant et régulier, puis **prescrit de le corriger** comme s'il
manquait quelque chose — une contradiction insight↔action franche, du même type que celles déjà closes
côté **sport** (#561→#585) et **focus** (#588), mais **jamais traitée côté sommeil** (angle neuf). Le
défaut était même **verrouillé** par un test (`logic.test.js:8695` attendait `/coucher 30 min plus tôt/`
sur un état sommeil 8 h solide — son intention réelle était l'absence de slogan sportif).

## Le correctif (curation §3 : cohérence, **zéro champ ajouté**)

`logic.js` — hors plan de recalage, une branche `else if (sleepIns.tone === 'ok')` fait précéder le
`else` corrigeant : action de **maintien** « **Rien à corriger côté sommeil : garde cette même heure de
coucher ce soir.** ». Les tons `court`/`attention` (branche `else` inchangée) gardent leur action
corrective **légitime** : court+régulier → « coucher 30 min plus tôt » ; irrégulier → « heure fixe » ;
plan actif → sa cible du soir (branches `pd` intactes). Aucun autre champ ni branche touché.

## Contrôle §4 ter (rendu réel, état chargé)

Carte cumulée relue (sommeil 8 h régulier + série 6 j + palier semaine) : verdict « Sommeil solide …
rythme régulier » **suivi de** l'action « Rien à corriger côté sommeil : garde cette même heure de
coucher ce soir. » → l'action **dit enfin la même chose que le constat**. Contre-preuve rendue : sommeil
6 h régulier → verdict « court » + action « coucher 30 min plus tôt » **conservée**.

## Vérif & versionnage

- `xvfb-run -a npm run verify` → **569 tests + smoke OK**, 100 % vert. Test dédié ajouté (tone ok →
  maintien, jamais « coucher 30 min plus tôt » ; contre-preuve court+régulier) + test #8670 ajusté
  (intention « pas de slogan sportif » préservée). Check smoke **bloquant** ajouté (verdict solide →
  action de maintien).
- Bump **2.0.237** (change ce que l'utilisateur voit sur la carte) : `src/package.json` + entrée
  `CHANGELOG` + 2 assertions `CHANGELOG[0].v` (logic.test.js + renderer-smoke.cjs).

Domaine : coach
