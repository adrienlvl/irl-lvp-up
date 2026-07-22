# #685 — « Ma journée » : « X/N blocs du jour terminés » (accord sur le nom, pas sur le compte)

**Build 2.0.286** · 2026-07-22 · Domaine : robustesse

## Contexte / rotation
Priorité nuit = coaching, **bloquée par la rotation §4 bis**. 5 derniers recaps :
`coach (#684), etudes (#683), robustesse (#682), coach (#681), etudes (#680)` →
`coach` (2×) et `etudes` (2×) interdits (2 derniers + 2×/5). **`robustesse` libre** (1× en #682,
hors 2 derniers). Quota §4 bis.4 non déclenché (#674 = proposition récente).

Piste **nommée** : note laissée par #683 (mémoire `fresh-domains-swept-quests-clean`) —
« Reste 1 mismatch hors-domaine noté (`app.js:269` blocs/terminé → future boucle robustesse/agenda) ».

## Manque prouvé
Dans `renderMyDay` (`app.js:269`), le résumé du jour (`#myDaySummary`) :

```
`${doneCount}/${items.length} bloc${items.length>1?'s':''} du jour terminé${doneCount>1?'s':''} · …`
```

Le **nom** « bloc » s'accorde sur `items.length` (total) mais l'**adjectif** « terminé » sur
`doneCount` (le nombre fait) → dès `doneCount ≤ 1 < items.length` (le cas courant), affichage
« 1/3 blocs du jour **terminé** » : nom au pluriel, adjectif au singulier juste après.

C'est exactement le bug d'accord de la famille #682 (quêtes) / #683 (révisions), dont la convention
fixée est : **l'adjectif s'accorde sur le nom qu'il qualifie**, pas sur le compteur « fait ».

## Correctif (§3 — curation, zéro champ)
Chirurgical : `terminé${doneCount>1?'s':''}` → `terminé${items.length>1?'s':''}`. L'adjectif suit
désormais le total de blocs, comme le nom.

## Vérif
- Check smoke **bloquant** `myDaySummaryPlural` : pilote le **vrai** rendu (`renderMyDay`), state
  forgé sur la date du jour (`localDate()`) → 3 blocs agenda, 1 complété ; plans/récurrents/
  anniversaires neutralisés pour un compte déterministe ; restaure ensuite. Assert
  `includes('blocs du jour terminés')` — échoue avant le fix (« terminé »), passe après.
- Contrôle §4 ter (texte lu par l'utilisateur) : rendu cumulé
  « X/N blocs du jour terminés · Y/Z quêtes validées. » relu en entier → cohérent.
- `cd src && xvfb-run -a npm run verify` → **584 tests + SMOKE OK**.

## Suite
La famille d'accord (nom↔adjectif sur X/N) est maintenant couverte sur les 3 surfaces connues
(quêtes #682, révisions #683, blocs du jour #685). Pas d'autre mismatch de ce type en attente noté.

Domaine : robustesse
