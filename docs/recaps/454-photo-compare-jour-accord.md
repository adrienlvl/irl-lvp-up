# Boucle #454 — Écart photos : « jour » accordé au singulier (2.0.84)

**Type** : Polish UX honnête (§4.4), domaine Croissance / progression photo.
**Build** : 2.0.84. **Vérif** : 447 tests + smoke verts (`xvfb-run -a npm run verify`).

## Problème

`renderGrowth` (`app.js:440`), encart « 📸 Avant / Après » : quand deux photos comparées n'ont
pas de poids associé (branche `weightDelta == null`), le libellé de l'écart temporel était codé
en dur au pluriel — `${cmp.days} jours d’écart`. Or `photoComparePair` (`logic.js:5800`) renvoie
`days = Math.round((after − before)/86400000)`, qui vaut **1** dès que les deux photos sont à un
jour d'intervalle (voire **0** le même jour) → affichage « 1 jours d'écart », fautif en français
(0 et 1 → singulier).

C'est le même filon que #453 (`ageLabel` appliqué à la liste des anniversaires) et #452
(« encore N séances ») : un accord de pluriel divergent d'un des emplacements. Aucun helper
`jour`/`jours` n'existe (contrairement à `ageLabel` pour « an ») → correctif par ternaire, idiome
majoritaire du fichier (`séance${x>1?'s':''}`, `bloc${x>1?'s':''}`, etc.). La branche sœur avec
poids (`… kg sur ${cmp.days} j`) utilise l'abréviation « j », insensible au pluriel : intacte.

## Correctif

`app.js:440` — `${cmp.days} jours d’écart` → `${cmp.days} jour${cmp.days>1?'s':''} d’écart`.
`cmp.days > 1` couvre correctement 0 et 1 (singulier) et 2+ (pluriel).

## Garde-fou

Check smoke **bloquant** `photoCompareDelta` (`renderer-smoke.cjs`, modèle `ageLabelList`) :
injecte deux photos à 1 jour d'écart sans poids, appelle `renderGrowth()`, restaure l'état, et
vérifie que `#photoCompare` contient « 1 jour d’écart » et **pas** « 1 jours ». Erreur bloquante
dédiée poussée dans `errors`.

## Périmètre / non-régression

- Aucun changement au-delà de 2 jours d'écart (pluriel inchangé).
- Aucune logique pure touchée (`photoComparePair` inchangé). Rien de supprimé.
- Bump 2.0.83 → 2.0.84 (effet utilisateur visible) : `package.json`, `CHANGELOG[0]` (logic.js) et
  les 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).

## Suite

Le filon « pluriel/accord codé en dur, divergent d'un emplacement » reste productif (#452→#454).
Prochaines pistes (cf. mémoire `backlog-leads-distinct-days-legacy`) : d'autres libellés
`app.js`/`logic.js` où un compte peut valoir 1 sans accord, ou pivot couverture/a11y/robustesse
pour varier le type et le domaine.
