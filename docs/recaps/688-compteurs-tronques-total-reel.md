# #688 — Compteurs « séances manquées » / « révisions en retard » : le vrai total, pas la liste plafonnée (build 2.0.288)

**Contexte / mission.** Nuit du 22/07, mission datée = **robustesse / correction / tests / contenu, PAS de
design visuel**. Priorité nommée #2 « couverture de tests / fonctions pures sous-testées » (et #1
« robustesse & correction »). Priorité de nuit coaching **bloquée par la rotation** § 4 bis.

**Rotation § 4 bis (avant de coder).** 5 derniers recaps = `etudes (687), agenda (686), robustesse (685),
coach (684), etudes (683)` → **`etudes` + `agenda` interdits** (2 derniers ; `etudes` aussi 2×/5) ;
**`robustesse` libre** (1× en #685, hors 2 derniers). Domaine retenu : **robustesse**. Quota § 4 bis.4 non
déclenché (proposition #674 dans les 10 derniers).

**Piste vérifiée (sous-agent Explore sur 16 fonctions pures sous-testées).** Le lot de fonctions pures est
sain (gardes `isKey`, `Number(x)||0`, tie-breakers `localeCompare`, pas de mutation). **Un seul** défaut à
**effet utilisateur réel** isolé : deux compteurs du tableau de bord affichent la **longueur d'une liste
plafonnée** comme s'il s'agissait du total.

**Bug prouvé.**
- `missedSessions(agenda, workouts, todayKey, opts)` (`logic.js:2103`) plafonne à `cap = 5` (contrat
  documenté). L'appelant `renderRoadmapFeatures` (`app.js:427`, `#missedSessions`) affichait
  `` `${ms.length} séances … non faites` `` → **7 séances manquées ⇒ « 5 »**.
- `overdueStudy(agenda, todayKey, opts)` (`logic.js:2125`, même motif `cap = 5`). L'appelant
  `renderExamCountdown` (`app.js:977`, `#overdueStudy`) affichait `` `${od.length} révisions en retard` ``
  → **8 révisions en retard ⇒ « 5 »**.

Cas réel : pendant une pause de 2 semaines (blessure, révisions intensives), on dépasse vite 5 séances
sport / 5 révisions sur la fenêtre → le tableau de bord **sous-comptait** le problème.

**Correctif (côté rendu, § 3 — zéro champ, `logic.js` inchangé).** Les deux appelants demandent désormais
le vrai total (`cap: 60`, très au-dessus du max possible sur 14/21 j) puis **limitent l'affichage détaillé
à 5** et signalent le reste par un discret **« +N autres »** (motif déjà utilisé pour `#strengthRecords`).
Le **compteur d'en-tête affiche le vrai total** ; la liste reste courte et lisible. Contrats purs
(`missedSessions`/`overdueStudy` : array, `.length`, `.map`, `cap`) **intacts** — aucune assertion node
touchée.

**Preuve (2 checks smoke BLOQUANTS).**
- `missedSessionsTotal` : 7 séances sport forgées (`localDate() − 1..7`), `state.workouts = []` →
  `#missedSessions` doit contenir « 7 séances », « non faites » **et** « +2 autres ».
- `overdueStudyTotal` : 6 révisions forgées (`localDate() − 1..6`) → `#overdueStudy` doit contenir
  « 6 révisions en retard » **et** « +1 autre ».
Les deux **échouent avant / passent après** (avant : rendu plafonné à « 5 séances » / « 5 révisions »).
Pas de regex à backslash (§ 6) : `includes` uniquement, dates via arithmétique `Date`.

**Contrôle § 4 ter (rendu cumulé, lu en entier).** « 🗓️ 7 séances prévues non faites (14 j) — Pas de
culpabilité — reprends le fil quand tu veux : Seance 1 (…), … Seance 5 (…) **(+2 autres)**. » et
« 6 révisions en retard : [5 puces] **[+1 autre]** Reprogramme-les… » → honnête, non contradictoire, ton
bienveillant préservé.

**Effet utilisateur visible ⇒ bump 2.0.288** (CHANGELOG en tête + 2 assertions `CHANGELOG[0].v`).
586 tests + SMOKE OK (dont les 2 nouveaux checks).

**Écarté / noté.** Les 2 autres imperfections trouvées par l'Explore sont sans effet écran (documenté) :
`personalRecords.date` dépend de l'ordre du tableau **mais `.date` n'est jamais affiché** (consommateurs
`newRecords`/`sessionSummary`/`liveSetRecord` n'utilisent que `.load`/`.reps` ; la table visible passe par
`strengthRecords`) ; `blockHistorySummary` compte des blocs à `end` vide que ses sœurs excluent, mais aucun
chemin utilisateur ne produit `end:''`. Ne pas re-labourer sans piste précise.

_Domaine : robustesse._
