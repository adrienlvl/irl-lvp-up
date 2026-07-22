# #682 — Série de quêtes : « X/N jours parfait**s** » (accord sur le nom, pas sur le compte)

**Build 2.0.283** · 2026-07-22 · Domaine : robustesse

## Contexte / rotation

Priorité nuit = coaching, mais **bloquée par la rotation §4 bis**. 5 derniers recaps :
`coach (#681), etudes (#680), robustesse (#679), coach (#678), etudes (#677)` → `coach` et
`etudes` interdits (2 derniers **et** 2×/5). `robustesse` **libre** (1× en #679, hors 2 derniers).
Quota §4 bis.4 non déclenché (#674 = proposition, dans les 10 derniers).

Chasse d'un défaut **frais et non-gaté** via sous-agent Explore (domaines : sommeil non-coach,
agenda/calendrier, focus/pomodoro, habitudes/quêtes/XP, anniversaires, accords de libellés ;
zones gatées écartées : nutrition/athlete/alternance/coach/etudes). Résultat : le périmètre frais
est très propre ; **une seule** anomalie à effet utilisateur réel isolée, en domaine quêtes/XP.

## Le défaut (prouvé)

`renderDashboardCore` (`app.js:598`), ligne sous la carte « série de quêtes parfaites » :

```js
`<small>${qs.perfectDays}/${qs.loggedDays} jour${qs.loggedDays>1?'s':''} parfait${qs.perfectDays>1?'s':''} · ${qs.rate} %</small>`
```

Le **nom** « jour » s'accorde correctement sur `loggedDays` (nombre de jours suivis), mais
l'**adjectif** « parfait » — qui qualifie « jours » — s'accordait sur `perfectDays` (nombre de jours
parfaits). Or un adjectif s'accorde avec le nom qu'il qualifie, pas avec un autre compteur.

**Contre-exemple** (le plus courant : on n'est pas parfait tous les jours) — `questPerfectStreak`
renvoie `{perfectDays: 1, loggedDays: 3}` (1 jour parfait sur 3 suivis) :
- Produit : « 1/3 jours **parfait** · 33 % »
- Attendu : « 1/3 jours **parfaits** · 33 % »

Le défaut apparaît dès que `perfectDays ≤ 1 < loggedDays`. La ligne **jumelle** juste au-dessus
(« 🏅 N journées parfaites d'affilée », accordée 2× sur `qs.streak`) était déjà correcte — l'écart
de traitement rendait l'incohérence d'autant plus visible.

## Correctif (§4.4 rendu — chirurgical)

`parfait${qs.perfectDays>1?'s':''}` → `parfait${qs.loggedDays>1?'s':''}` : l'adjectif s'accorde
désormais sur le même compteur que le nom. Tous les cas couverts (`loggedDays===1` → « 1 jour
parfait » singulier ; `loggedDays>1` → « jours parfaits » pluriel, quel que soit `perfectDays`).
Aucun impact logique — purement cosmétique.

## Vérification

- **Check smoke bloquant `questStreakPlural`** : pilote le **vrai** `renderDashboardCore()` avec
  `state.questLog` forgé (2 jours passés distincts + aujourd'hui non parfait → `loggedDays=3,
  perfectDays=1`), lit `#questStreak`, restaure et re-rend. Assertion `txt.includes('3 jours
  parfaits')` → **échoue avant** le correctif (« 3 jours parfait », pas de « s »), **passe après**.
  Sans backslash (piège template literal §6), `includes` uniquement.
- Contrôle §4 ter (texte lu) : rendu cumulé relu — « 🏅 Aucune série en cours… » + « 1/3 jours
  parfaits · 33 % » : cohérent, court, non contradictoire.
- `cd src && xvfb-run -a npm run verify` → **583 tests + SMOKE OK** (100 % vert).

Effet utilisateur visible → **bump 2.0.283** + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v`.

_Domaine : robustesse._
