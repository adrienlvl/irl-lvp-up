# #647 — Coach Focus : la consigne de coucher ne se répète plus dans l'insight ET l'action (2.0.255)

## Rotation (§4 bis)

Priorité de nuit = coaching. Contrôle des 5 derniers recaps **par numéro** :
`642 sommeil · 643 athlete · 644 coach · 645 nutrition · 646 athlete`.
→ `nutrition` (645) et `athlete` (646, dans les 2 derniers + 2×) exclus ; `sommeil` (642) et `coach`
(644) permis (1× chacun, absents des 2 derniers). **`coach`** pris : 1× sur 5, hors 2 derniers, aligné
priorité de nuit. Angle NEUF trouvé par exploration ciblée des surfaces sommeil du coach adaptatif.

## Défaut prouvé (redondance insight↔action intra-carte, cas nominal, §4 ter)

Sur la carte **« Le focus du moment »** (`adaptiveCoachFocus` → `renderCoachFocus`, app.js), quand le
pilier retenu est le **sommeil**, l'insight et l'action sont rendus l'un **sous** l'autre. La branche
sommeil (`logic.js`) :

- `insight = sleepIns.verdict` (`logic.js:6091`) où `sleepIns = sleepCoachInsight(s.recovery, todayKey)`
  était appelé **sans opts** (`logic.js:5549`) → le verdict **conservait** sa consigne de coucher
  générique en queue.
- Puis la branche réémet **toujours** sa propre action de coucher (`logic.js:~6137-6146` : cible du plan
  / maintien / consigne générique).

**Cas nominal prouvé en rendu chargé** (`/tmp` script, sans plan de recalage) :

- **attention** (court+régulier, moy. 6 h) →
  insight : « Sommeil court : moy. 6 h sur 6 nuits, dette de 9 h sur 14 j **— vise un coucher 30 min plus tôt.** … »
  action : « **Vise un coucher 30 min plus tôt** ce soir. » → **doublon dos à dos**.
- **urgent** (court+irrégulier) →
  insight : « … **— avant d'allonger les nuits, stabilise d'abord une heure de coucher fixe.** »
  action : « **Couche-toi à heure fixe** ce soir, même le week-end. » → doublon « heure fixe ».

**Distinct des 4 clos** : #642 (sommeil) exigeait un **plan de recalage actif** et opposait l'insight à
une **AUTRE carte** (Bilan sommeil de l'onglet Récup) — et laissait **explicitement** les appels internes
du coach inchangés (recap #642 : « byte-identique »). #627 n'a corrigé que la **contradiction** du verdict
`ok`. Ici : **aucun plan requis**, doublon **interne** à la carte Coach Focus (insight vs sa propre
action), sur les tons **attention/urgent** (jamais traités).

## Correctif (curation §3, zéro champ ajouté)

`sleepCoachInsight` gagne un 2ᵉ déclencheur d'amputation `opts.actionCarried`, **synonyme** de
`planActive` : la fabrique `act(tail)` clôt le diagnostic par un point dès que l'un des deux est vrai.
L'appel interne du coach (`logic.js:5549`) passe désormais `{ actionCarried: true }` — car cette branche
porte **toujours** sa propre action de coucher juste sous l'insight, ce qui rend la queue générique du
verdict structurellement redondante. Le **diagnostic chiffré** (tone, moy., dette, irrégularité, notes de
pente) est **intégralement conservé** ; seule la consigne redondante disparaît.

**Ripple zéro.** `sleepIns` n'est lu ailleurs que par `.tone`/`.irregular`/`.avg`/… — jamais `.verdict`
(seul champ touché par `act()`). Le 2ᵉ appel interne (`logic.js:5417`, `attentionDigest`) ne lit que
`.tone` et affiche un texte fixe → inchangé. Le point de rendu **Bilan sommeil** (`app.js:615`) garde son
`{ planActive }` d'origine : **sans plan actif, il reste seul à guider et conserve sa consigne**
(non-régression vérifiée).

## Contrôle §4 ter (surface lue par l'utilisateur)

Insight + action **rendus ensemble** sur états chargés :
- attention → « … dette de 9 h sur 14 j. » (diagnostic seul) + « Vise un coucher 30 min plus tôt ce soir. »
- urgent → « … coucher variant de ~91 min d'un soir à l'autre). » + « Couche-toi à heure fixe ce soir… »
Lecture cumulée : un diagnostic, puis une action — plus de répétition dos à dos.

## Vérification

`cd src && xvfb-run -a npm run verify` → **100 % vert** (EXIT=0, css-lint vert).

- **574 tests** (bloc `adaptiveCoachFocus … tone ok` étendu : insight sans « coucher 30 min plus tôt »
  côté attention, sans « heure fixe » côté urgent, action portant bien la consigne, + non-régression
  bilan sans opts).
- Check smoke **bloquant `coachFocus`** étendu (volet urgent : insight sans « heure fixe », action la
  porte).

Build **2.0.255** (bump `package.json` + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v`).

Sources : hygiène du sommeil / une seule instruction actionnable prime — retirer une note en vaut deux
ajoutées (§3).

_Domaine : coach._
