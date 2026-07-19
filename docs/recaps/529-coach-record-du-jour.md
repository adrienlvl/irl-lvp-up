# 529 — Coaching : le coach fête ton RECORD personnel battu aujourd'hui (sportRecordToday)

**Build 2.0.160 · boucle #529 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) savait, sur le pilier SPORT,
projeter une force qui **MONTE** (`sportProgress`, #527) et signaler une force qui **STAGNE**
(`sportPlateau`, #526) — mais ces deux notes n'existent que les jours SANS séance (`!doneToday`).
Le jour où Adrien s'entraîne ET **bat un record personnel**, le coach ne servait qu'un crédit
générique (« Séance déjà faite aujourd'hui 💪 — verrouille avec 5 min d'étirements ») : il passait
à côté du moment le plus fort de tous — le **sommet de « l'adaptation aux progrès »** demandée pour
la nuit. Or l'app calcule déjà exactement ce signal : `strengthRecords(workouts)` renvoie, par
exercice **chargé**, la meilleure performance estimée (1RM) **avec la date** où elle a été posée.
Un record du jour = un exercice dont le meilleur 1RM de **toute son histoire** porte la date
d'aujourd'hui. Cette intelligence ne vivait que dans l'onglet Athlète (palmarès) — **jamais** dans
le coach quotidien.

## Ce qui est livré

Nouveau champ **`sportRecordToday`** (`{ exercise, e1rm, load, reps }` ou `null`, **toujours**
renvoyé). Quand la séance du jour est faite (`doneToday`) et qu'elle a établi un nouveau record sur
un exercice **déjà pratiqué avant ce jour**, le coach le **NOMME** et le **FÊTE**, **appendu à
l'insight** :

> « 🏆 Et pas n'importe quelle séance : tu viens de battre ton record sur le **Squat** — **110 kg ×
> 5** (1RM estimé à **128,5 kg**), ta meilleure perf à ce jour. Ça, c'est gravé — savoure. »

Un chiffre gravé transforme « séance faite » en victoire concrète (« ton RPG motivant »). Réemploi
total de `strengthRecords` (+ `estimate1RM`) — **zéro** nouvelle fonction.

## Garde-fous & honnêteté

- **Record STRICTEMENT battu aujourd'hui** : `strengthRecords` n'écrase un ancien best que si le
  nouveau 1RM est `>` — **égaler** un record ne compte donc pas (le best garde sa date d'origine, la
  note reste muette). On ne fête que le vrai dépassement.
- **Pas de « record » trivial de première fois** : le déclenchement exige que l'exercice figure au
  palmarès **AVANT** ce jour (`strengthRecords` sur les séances antérieures à `todayKey`). Un
  exercice pratiqué pour la première fois aujourd'hui (où tout est « record » par construction) est
  **ignoré** — on ne fête qu'un dépassement d'une meilleure perf **documentée**.
- **Poids du corps ignoré** : `estimate1RM(0, reps)` renvoie `null` → aucun record de charge sur les
  exercices sans charge.
- **Exclusion mutuelle par construction** avec `sportProgress`/`sportPlateau`/`sportZoneFocus`/
  `sportSlot` : tous exigent `!doneToday`, celui-ci `doneToday` → jamais dans le même insight.
- **Affine, ne remplace pas** : note **appendue** à l'insight ; l'action du jour (crédit « séance
  faite », étirements) reste intacte.
- **Vocabulaire distinct** (« battre ton record », « ta meilleure perf à ce jour », « c'est gravé »)
  → zéro collision à l'œil ni en regex avec `sportProgress` (« gagne du terrain », « passes la barre
  des »), `sportPlateau` (« marque le pas ») ni les guards récup.

## Vérification

- Test `logic.test.js` dédié : Squat déjà au palmarès (meilleur passé 104×5 → 1RM 121,5) puis 110×5
  aujourd'hui → `sportRecordToday` = `{ Squat, 128,5, 110, 5 }`, record nommé + chiffré dans
  l'insight ; effort en deçà du meilleur passé → `null` ; première fois sur un exercice → `null` ;
  pas de séance du jour → `null` ; poids du corps → `null` ; autre pilier → `null`.
- Check smoke **bloquant** `coachFocus` étendu : record du jour Squat nommé (`e1rm` 128,5) dans
  l'insight ; premier passage sur un exercice → note muette.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (507 tests node, SMOKE OK, EXIT=0).
</content>
</invoke>
