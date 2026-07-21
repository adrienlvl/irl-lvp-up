# #650 — Plan de recalage sommeil : plus de double « Objectif atteint » (build 2.0.258)

**Priorité de nuit = coaching.** Rotation §4 bis (5 derniers par numéro : `nutrition, athlete,
coach, focus, athlete`) → `focus`/`athlete` (2 derniers) et `athlete` (2×) exclus ; `coach` (1×) et
`nutrition` (1×, mais proposition-gated #645/#619) permis ; **`sommeil`** pris — 0× sur les 5 derniers,
le domaine de coaching le plus frais, angle NEUF hors pistes closes.

## Le défaut (contradiction/redondance §3, prouvée en rendu chargé §4 ter)

Carte « 🌙 Plan de recalage » (`renderSleepPlan`, `app.js`). Quand l'objectif de coucher est **atteint**
(`sleepPlanDay(...).reached === true`, `logic.js:10301`), deux textes disaient la **même chose dos à
dos** :

1. Ligne d'arrivée (`sp-arrival`, ancien `app.js:648`+657) : `daysLeft === 0` → « **Objectif 23:30
   atteint.** »
2. Bandeau festif (`sp-reached`, `app.js:645`, rendu juste en dessous) : « 🎉 **Objectif atteint** : tu
   te couches désormais vers ton heure cible **(23:30)**. Tiens ce rythme — la régularité est ce qui
   l'ancre. »

Deux fois « objectif atteint », deux fois « 23:30 », adjacents. Systématique dès qu'un plan est atteint,
aucune garde. Distinct de #642 (opposait bilan↔plan, exigeait plan actif) et #647 (dédup insight↔action
du coach) : ici c'est une redondance **intra-carte** du plan lui-même.

**État déclencheur vérifié** : `sleepPlan={active:true, targetTime:'23:30', startTime:'01:00',
startKey:J-6, stepMin:25, stepDays:1}` + 3 dernières nuits couchées ~23:20–23:40 → `recentAnchor ≤
targetAnchor+15` → `reached=true` → `remaining=0` → `daysLeft=0` → l'arrivée tombe dans la branche
« atteint ».

## Le correctif (curation §3, zéro champ, rendu seul)

`app.js` : quand `daysLeft === 0`, la ligne d'arrivée **n'émet plus** « Objectif … atteint » (le bandeau
🎉 juste en dessous le porte déjà). Elle ne garde que l'info **distincte** — « Coucher réel récent : 23:35. »
— et disparaît (`<p>` non rendu) si elle n'a rien d'autre à dire. `arrivalLine` construite par
`[arrival, recentTail].filter(Boolean).join(' ')`. Aucune fonction pure touchée (bug purement au rendu),
aucune régression sur la branche `daysLeft>0` (arrivée estimée inchangée).

**§4 ter** : carte rendue en entier relue → une seule célébration (« 🎉 Objectif atteint … (23:30) ») +
le coucher réel récent chiffré en dessous, plus de doublon.

## Vérification
- `xvfb-run -a npm run verify` : **574 tests + smoke OK**.
- Nouveau check smoke **bloquant** `sleepReachedDedup` (pilote `renderSleepPlan` en état atteint) :
  « atteint » n'apparaît qu'**une** fois dans `#sleepPlan` et « Coucher réel récent » est conservé.
- Bump **2.0.258** : `package.json` + `CHANGELOG[0]` (`logic.js`) + 2 assertions `CHANGELOG[0].v`
  (`logic.test.js` + `renderer-smoke.cjs` check `whatsNew`).

Domaine : sommeil
