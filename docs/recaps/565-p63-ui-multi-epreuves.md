# #565 — P6.3 : UI multi-épreuves (ajouter / lister / supprimer) — la série P6 close (build 2.0.188)

## Contexte & choix (rotation §4 bis)

Priorité de la nuit = **coach**, mais la **rotation des domaines (§4 bis) prime sur la demande de nuit**
(§3, arbitrage d'Adrien du 2026-07-19, postérieur à la demande du 2026-07-18). Contrôle des 5 derniers
recaps (`grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)`) : `coach`(#564) · `tests`(#563) ·
`etudes`(#562) · `coach`(#561) · `tests`(#560) → **coach** est dans les 2 derniers ET 2× dans les 5,
**tests** idem → les deux **interdits**. `etudes` (1× en #562, hors des 2 derniers) est **autorisé**.

→ 2ᵉ demande d'Adrien (**avancer CAP 3.0**), tâche **nommée P6.3**. C'est le pas à plus forte valeur :
tout le travail **P6.1** (#555, modèle `examGoals[]` + migration) et **P6.2** (#559/#562, les 6
consommateurs portés sur la liste via `nearestExam`) était **dormant** — #562 le dit : « Reste **P6.3**
(UI) pour rendre l'état multi-épreuves atteignable ». Sans moyen de **remplir** la liste, elle n'avait
jamais > 1 épreuve. P6.3 **débloque** enfin cette valeur, et c'est « le plus utile à Adrien » (BTS CG).

## Le manque, vérifié dans le code

`app.js` (submit `#studyPlanForm`) faisait `state.examGoals = normalizeExamGoals({examGoal: …})` :
générer un planning pour une **nouvelle date écrasait** la liste à **une seule** épreuve. Impossible de
suivre Droit et Compta à deux dates. Et **aucune UI** ne listait ni ne supprimait d'épreuve.

## Ce qui change (build 2.0.188)

**Logique pure (`logic.js`, exportée + testée) :**
- `sortExamGoals(list)` — tri d'affichage déterministe : date croissante (sans-date en dernier),
  départage stable par titre.
- `upsertExamGoal(list, goal)` — **ajoute OU met à jour** une épreuve par `id` (dérivé de la date).
  Même date (même id) → **remplace** le libellé (re-générer un planning corrige le titre), pas de
  doublon ; entrée vide → liste inchangée ; liste non-tableau tolérée. **C'est ce qui rend l'état
  multi-épreuves atteignable** (le formulaire n'écrase plus).
- `removeExamGoal(list, id)` — retire l'épreuve d'id donné, renvoie la liste normalisée triée.

**Rendu (`app.js`) :**
- Le submit du planning appelle désormais `upsertExamGoal(state.examGoals, …)` (au lieu d'écraser) →
  chaque planning **ajoute** son épreuve. `examGoal` legacy reste posé (dernière épreuve) pour compat.
- Nouvelle `renderExamList()` : carte **« 🎓 Mes épreuves (N) »** sous le planning de révision — une
  ligne par épreuve (date FR · titre · compte à rebours **J-…** / « examen passé » / « X sem. »), triées
  par date, chacune avec un bouton **×** (`data-del-exam`). Câblée dans la chaîne `render()`.
- Handler délégué sur `#examList` : suppression **immédiate** (comme les × anniversaire/récurrent, pas de
  `confirm()` — ça ne touche pas les créneaux agenda déjà posés) ; resynchronise `examGoal` legacy sur la
  1ʳᵉ épreuve restante (ou vide) pour éviter qu'une épreuve supprimée **ressuscite** via le repli legacy
  quand la liste se vide.

**HTML/CSS :** `<div id="examList">` après `#examCountdown` ; styles `.exam-list/.exam-row/.exam-cd`
dans `extras.css` (réemploi des tokens `--surface-2/--line/--muted`, cohérent avec `.overdue-study`).

## Contrôle de cohérence §4 ter (texte lu par l'utilisateur)

Rendu cumulé relu avec un état chargé (3 épreuves BTS) : liste **courte, claire, non contradictoire**.
Chevauchement mineur assumé avec `#examCountdown` (qui n'affiche QUE l'épreuve la plus proche, en
headline) : rôles distincts (headline vs surface de gestion avec ×). La note de bas de liste (« Chaque
planning… ajoute son épreuve ici · Retirer une épreuve ne supprime pas ses créneaux ») **clarifie** deux
comportements non évidents, sans redondance. **Aucune note/champ coach ajouté** (§3 : qualité pas volume).

## Vérif & tests

- Nouveau test logique `upsertExamGoal / removeExamGoal / sortExamGoals` : ajout sans écrasement, tri par
  date, upsert par id (nouveau titre gagne, pas de doublon), entrée vide ignorée, suppression + id inconnu
  + dernière retirée → `[]`, tri sans-date/alpha.
- Nouveau check smoke **bloquant** `examListUI` : deux plannings à deux dates via le **formulaire réel**
  → **les deux épreuves coexistent** (upsert, pas écrasement, cœur de P6.3) → `#examList` visible, 2
  lignes, 2 ×, triées par date → clic sur le × de la 1ʳᵉ → il n'en reste **qu'une**, DOM suivi. Aucun
  award/XP dans le flux → pas de flakiness (#557) : **3 runs smoke verts**. État intégralement restauré.
- `cd src && xvfb-run -a npm run verify` : **527 tests + smoke verts**. Build **2.0.188** (feature à
  effet utilisateur → bump + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v`).

**Série P6 (multi-épreuves BTS) close** : P6.1 (#555) · P6.2 (#559/#562) · P6.3 (#565).

Domaine : etudes
