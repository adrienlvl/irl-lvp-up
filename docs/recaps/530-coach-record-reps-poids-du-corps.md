# 530 — Coaching : le coach fête aussi tes records au POIDS DU CORPS (sportRepRecordToday)

**Build 2.0.161 · boucle #530 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

À la boucle #529, le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) a appris à
**fêter un record personnel battu aujourd'hui** — mais uniquement un record de **CHARGE** :
`sportRecordToday` lit `strengthRecords`, qui estime un 1RM et **ignore délibérément le poids du
corps** (`estimate1RM(0, reps)` → `null`, cf. son test « poids du corps → pas de record de charge »).
Conséquence : tout le progrès en **calisthénie** était **invisible** au coach. Gagner des répétitions
sur ses **tractions** (8 → 13), ses pompes ou ses dips ne déclenchait **rien**, alors que sur ces
exercices sans charge, **les répétitions SONT l'axe de progression**. Or l'app suit déjà exactement ce
signal : `personalRecords(workouts)` renvoie, par exercice, la meilleure `{ load, reps, date }` — et
pour un exercice purement au poids du corps la charge reste 0, donc sa **date** reflète le dernier
**record de reps**. Cette intelligence vivait dans l'onglet Athlète (palmarès) — **jamais** dans le
coach quotidien pour ce cas.

## Ce qui est livré

Nouveau champ **`sportRepRecordToday`** (`{ exercise, reps, prev }` ou `null`, **toujours** renvoyé).
Quand la séance du jour (`doneToday`) bat le record de **répétitions** sur un exercice **sans charge**
déjà pratiqué avant, le coach le **NOMME** et le **FÊTE**, **appendu à l'insight** :

> « 🏆 Et quelle séance : tu viens de battre ton record de répétitions sur le **Tractions** — **13
> reps au poids du corps** (ton meilleur passé : **10**), du jamais-vu chez toi. La force au poids du
> corps se construit rep après rep — chapeau. »

Le complément honnête de `sportRecordToday` : la charge **ET** le poids du corps sont désormais tous
deux célébrés. Réemploi total de `personalRecords` — **zéro** nouvelle fonction.

## Garde-fous & honnêteté

- **Poids du corps STRICT** : `rAll.load === 0` (jamais **aucune** charge sur cet exercice dans tout
  l'historique). Un exercice chargé (même s'il gagne des reps à charge égale) est **hors champ** — il
  relève de `sportRecordToday` (charge) ou reste muet (reps-à-charge, signal plus ambigu, non fêté).
- **Reps STRICTEMENT battues** : `rAll.reps > rPast.reps` — **égaler** son meilleur passé ne compte
  pas (cohérent avec la stricte-supériorité de `sportRecordToday`).
- **Pas de « record » trivial de première fois** : l'exercice doit figurer au palmarès **AVANT** ce
  jour (`rPast` présent). Un exercice inauguré aujourd'hui est **ignoré**.
- **Exclusion mutuelle avec `sportRecordToday`** : muet si un record de **charge** parle déjà — une
  seule célébration par jour, la charge prime (cohérent avec la priorité aux paliers chargés).
- **Réservé au pilier SPORT** + `doneToday` (comme `sportRecordToday`) : exclusif par construction de
  `sportProgress`/`sportPlateau`/`sportZoneFocus`/`sportSlot` (tous en `!doneToday`).
- **Vocabulaire distinct** (« record de répétitions », « au poids du corps », « rep après rep »,
  « chapeau ») → zéro collision regex avec `sportRecordToday` (« 1RM estimé », « c'est gravé »),
  `sportProgress` (« gagne du terrain »), `sportPlateau` (« marque le pas »).

## Vérification

- Test `logic.test.js` dédié : Tractions au poids du corps (meilleur passé 10) → 13 aujourd'hui →
  `sportRepRecordToday` = `{ Tractions, 13, 10 }`, `sportRecordToday` **null** (aucune charge), record
  nommé + chiffré dans l'insight ; égaler le passé → `null` ; première fois → `null` ; exercice chargé
  → `null` ; record de charge le même jour → `sportRepRecordToday` `null` (exclusion mutuelle) ; pas de
  séance du jour → `null` ; autre pilier → `null`.
- Check smoke **bloquant** `coachFocus` étendu : record de reps Tractions (13, passé 10) nommé,
  `sportRecordToday` muet ; égaler le passé → note de reps muette.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (508 tests node, SMOKE OK, EXIT=0).
