# #621 — Le conseil de plateau de force ne se fait plus reléguer derrière les félicitations (2.0.231)

**Domaine : coach** — priorité de nuit coaching (§3 QUALITÉ, pas volume : hiérarchisation).
Rotation OK avant de coder : les 5 derniers recaps = robustesse(620), nutrition(619), coach(618),
etudes(617), robustesse(616). `coach` absent des **2** derniers et **1×** sur 5 → autorisé.

## Le manque (prouvé par lecture du code, pas supposé)

La carte du coach « Le focus du moment » range ses notes de la plus **urgente** à la plus **anodine**
(`coachNoteUrgency` + `orderCoachNotes`, `logic.js`). Le palier « anodin » (rang 5, relégué en dernier)
est réservé aux **félicitations** (« du rab », « aucune obligation », « offert », « bravo »). Or son
motif contenait un **`record` NU**, qui attrapait la note **corrective de plateau de force** :

> « Côté progression : ton développé couché marque le pas — son 1RM estimé stagne … depuis 3 séances,
> **sans nouveau record**. Pour débloquer ça : ajoute une répétition … »

C'est une **action** (« voici comment débloquer ton plateau »), classée à tort comme une félicitation.
Asymétrie absurde : son pendant **positif** « ta force MONTE » (`sportProgress`) est rang 4 (défaut),
donc **mieux** classé que le correctif « ta force STAGNE, agis » (rang 5). Résultat concret : les jours
où l'objectif de séances est **déjà bouclé** (`sessionGoalBonus` appendu tôt, ~L5589), la carte pouvait
afficher « chaque séance en plus est du **pur bonus** » en tête et cacher le conseil de déblocage
derrière « ＋ plus de contexte » — exactement le bug que `orderCoachNotes` a été écrit pour empêcher.

Pas dans les angles déjà clos (sport #561→#585, focus #588, milestones #558, digest sommeil #618,
`coachDayPriority` #602→#607/#620, protéines #619, révision #617).

## Le correctif (curation §3 : hiérarchisation, **zéro champ ajouté**)

1. **`coachNoteUrgency`** — `record` nu → `ton record|record perso`. Les 5 célébrations réelles
   (`logic.js` 7358/7397/7766/7771/7800) disent **toutes** « ton record » ou « record perso » → restent
   anodines. Le plateau (« sans nouveau record ») retombe au **défaut (4)**, à parité avec `sportProgress`.
2. **`orderCoachNotes`** — le contrôle **§4 ter** (rendu sur état chargé) a révélé un effet de bord : la
   note plateau fait **2 phrases** (« Côté progression … » + « Pour débloquer ça … »). Sa prémisse,
   désormais au défaut, **héritait** du rang de la note qui la précède (le bonus anodin 5) car le
   détecteur d'ouverture de note ne connaissait que « Et … »/« Bonne nouvelle … » → la note se retrouvait
   **déchirée** (prémisse tout en bas, conclusion remontée seule). Ajout de « **Côté progression** » et
   « **Sur ta lancée** » (les deux ouvreurs de notes progression, sans « Et ») aux ouvreurs reconnus →
   chaque note garde son rang propre et solde correctement sa conclusion.

## Contrôle §4 ter (rendu réel, état chargé)

Insight cumulé « objectif bouclé (bonus) + plateau » rendu via `orderCoachNotes` :
verdict → **« Côté progression … marque le pas »** → **« Pour débloquer ça … »** (soudées) → bonus « du
rab » en dernier. Idem pour `sportProgress` (« Sur ta lancée … » → « À ce rythme … » → bonus). Le
conseil actionnable remonte à sa juste place, la note reste soudée, l'anodin part bien en dernier.

## Vérif & versionnage

- `xvfb-run -a npm run verify` → **566 tests + smoke OK**, 100 % vert. Test dédié ajouté (plateau ≠ anodin,
  célébrations restent anodines, soudage anti-déchirure des 2 notes progression).
- Bump **2.0.231** (change ce que l'utilisateur voit sur la carte) : `src/package.json` + entrée
  `CHANGELOG` + 2 assertions `CHANGELOG[0].v` (logic.test.js + renderer-smoke.cjs).

Domaine : coach
