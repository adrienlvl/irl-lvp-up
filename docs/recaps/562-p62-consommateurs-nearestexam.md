# #562 — P6.2 (fin) : les consommateurs mono-valués lisent `examGoals[]` via `nearestExam`

**Domaine : etudes** · build inchangé (2.0.186, **pas de bump**) · 526 tests + smoke verts.

## Pourquoi cette tâche

- **Rotation §4 bis.** Les 5 derniers domaines : `tests` (#561), `coach` (#560), `etudes` (#559),
  `coach` (#558), `robustesse` (#557). La **priorité de nuit** (coach) est **bloquée** : `coach`
  apparaît dans les 2 derniers recaps (#560) **et** 2× dans les 5 derniers → §3 impose que la rotation
  prime, même sur la demande de nuit. `etudes` est autorisé (1× en #559, hors des 2 derniers).
- **2ᵉ demande d'Adrien** (avancer la roadmap CAP 3.0), tâche **nommée** dans ROADMAP → P6.2, dont #559
  avait explicitement laissé la suite : « Reste 4 consommateurs mono-valués → sélecteur *épreuve la plus
  proche* ».

## Le manque, vérifié dans le code

P6.1 (#555) a posé le modèle `examGoals[]` + la migration ; #559 a porté les **2 surfaces liste**
(`upcomingKeyDates`, `keyDateMarkers`, qui itèrent une puce/marqueur par épreuve). Restaient **4
consommateurs mono-valués** lisant l'ancien `examGoal` unique :

- `examCountdown(examGoal, todayKey)` (`logic.js`) — compte à rebours de l'onglet Études.
- `examReminderDue` et `studyPacing` — délèguent à `examCountdown`.
- `attentionDigest` (`logic.js:4981`, le coach) — appelait `examReminderDue(s.examGoal, …)`.
- Côté rendu : `app.js` `renderExamCountdown` passait `state.examGoal` à `examCountdown`/`studyPacing`.

## Ce qui a été fait

- **Nouveau sélecteur pur `nearestExam(examGoals, todayKey)`** (exporté, testé) : parmi une liste
  `examGoals[]` (objet unique toléré), renvoie **l'épreuve à venir la plus proche** ; s'il n'y en a
  aucune à venir, **la plus récemment passée** (pour que le compte à rebours puisse encore dire
  « examen passé »). Départage **stable par titre** à date égale. `null` si aucune épreuve datée ou
  `todayKey` invalide.
- `examCountdown` devient **polymorphe** : `Array.isArray(examGoal)` → résolu via `nearestExam`, sinon
  chemin objet **inchangé**. `examReminderDue` et `studyPacing` en héritent gratuitement (ils passent
  leur argument tel quel à `examCountdown`).
- **Câblage** : `attentionDigest` et `app.js` (Études) passent `state.examGoals` avec **repli sûr** sur
  `examGoal` quand la liste est vide → les tests et états legacy (objet unique) restent identiques.

## Pourquoi pas de bump (§2.6)

Sans l'UI P6.3, le **seul writer runtime** de `examGoals` est le formulaire de planning, qui **écrase**
`examGoal` puis resynchronise → `state.examGoals` n'a **jamais plus d'une épreuve**. `nearestExam` sur
une liste à 1 élément renvoie cet élément → **sortie identique** au chemin précédent. Aucune surface lue
par l'utilisateur ne change tant que P6.3 n'existe pas. Précédents : #559, #555.

## Vérification

- `xvfb-run -a npm run verify` : **526 tests** `node:test` + smoke Electron **verts**.
- 3 nouveaux tests logiques : `nearestExam` (à venir / tout passé / départage / objet unique / invalides
  / `todayKey` invalide) et le chemin **liste** sur `examCountdown`/`examReminderDue`/`studyPacing`.
- Check smoke `examCountdown` étendu : vérifie `typeof nearestExam === 'function'` **et** que
  `examCountdown([Droit 25/01, Compta 08/01], '…01')` retient bien **Compta** (la plus proche).
- Piège §6 respecté : dans le check injecté, pas de regex ni de `${}` — juste une IIFE `(c => …)(…)`.

## Suite

- **P6.3** — UI ajouter / lister / supprimer une épreuve (renderer → check smoke bloquant). C'est elle
  qui rendra l'état multi-épreuves **atteignable** ; à ce moment seulement, ces consommateurs auront un
  effet visible (et il faudra appliquer le contrôle §4 ter en rendu chargé).

Domaine : etudes
