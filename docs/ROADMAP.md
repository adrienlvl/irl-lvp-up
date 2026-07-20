# Roadmap d'évolution — IRL LVP UP

_Établie le 2026-07-05. Séquencée par vagues. Chaque vague est livrable indépendamment et laisse l'app fonctionnelle._

Légende : 🟥 P0 (fondations, bloquant) · 🟧 P1 (haute valeur) · 🟨 P2 (qualité/confort) · 🟩 P3 (plus tard).

---

## 🚀 VERSION 2.0.0 (2026-07-16) — jalon coupé (boucle #356)

Toutes les vagues de la roadmap sont **terminées** ; la 2.0 acte la maturité de l'app (décision d'Adrien après une passe QA : rendu des 7 pages sans erreur, 370 tests + smoke verts). Détail : **[docs/recaps/356-version-2.0.md](recaps/356-version-2.0.md)**. La boucle autonome continue ensuite en **2.0.x** (polish/qualité + retours). Reste hors boucle (actions d'Adrien) : 📸 scan frigo (IA/réseau), ⌚ sync Strava/Garmin/Polar (OAuth).

## 🧭 CAP 3.0 — ordre validé par Adrien (2026-07-16)

Route vers la 3.0, dans l'**ordre recommandé et validé** (détail : **[docs/AUDIT-ET-ROADMAP-3.0.md](AUDIT-ET-ROADMAP-3.0.md)**) :

1. 🤖 **Coaching adaptatif** — ✅ **terminé et GELÉ** le 2026-07-19 (voir « État actuel »).
2. 🧱 **Fondations techniques** (IndexedDB, archi) _(← en cours)_ — prérequis de la sync.
3. 🔒 **Sécurité & prêt pour le public** — socle sécu (chiffrement, CSP, audit) **avant** d'ouvrir la moindre surface réseau (App Store iOS + Google Play + site web ; aucune fuite de donnée critique).
4. ☁️ **Sync multi-appareils** — chiffrée de bout en bout dès le jour 1.
5. 🎓 **Planning multi-échéances (études)** — généralisable.
6. 📷 **Scan frigo / assiette** — en dernier.

> Différence assumée avec la liste initiale : Fondations + Sécurité passent **avant** la Sync, car la Sync en dépend (stockage robuste + chiffrement) et le socle sécu doit précéder l'ouverture réseau.

## 📍 État actuel — build 2.0.195 (2026-07-20)

> 💼 **#572 — P4.3 : « pas encore postulé » n'est plus classé « postulé » (domaine `robustesse`, build
> 2.0.195).** Rotation §4 bis : les 5 derniers domaines = `a11y · coach · robustesse · athlete · coach`
> → `a11y` (2 derniers) et `coach` (2 derniers + 2×) interdits ; `robustesse` (#569, 1×, hors 2 derniers)
> autorisé → 2ᵉ demande d'Adrien (avancer CAP 3.0/qualité), tâche nommée **P4.3** (balayage regex non
> ancrées). Balayage §2.3 : les deux seuls classificateurs de texte FR libre sont `jobStatusFromText`
> (statut Alternance) et `warmupFor`/`cooldownFor` (déjà P4.2) ; `exerciseZones` est un lookup exact.
> **Faux positif PROUVÉ** (piste mémoire #446) : « pas encore postulé » / « pas postulé » / « non envoyée »
> → le verbe `postule`/`envoye` est capté DANS une **négation** → la candidature basculait en « Postulé »
> du funnel et gonflait `applicationStats` (answered/responseRate) à **chaque sync du Sheets**, alors
> qu'elle est **à faire** (module sacré 💼). Fix : garde `\b(pas|non|jamais)\b…(postul|envoy)` → `a_postuler`,
> placé APRÈS refus/accepté/entretien/relance (ils gardent la priorité) ; **seuls** les verbes d'action
> (`candidat` ambigu — « pas un bon candidat » = refus — et `retenu` déjà en refus sont écartés). L'ordre
> protège le positif (« postulé, pas de nouvelles » reste postulé). 11 assertions (faux positifs +
> non-régression), 17/17 au rejeu. **Aucune note/texte ajouté** (§4 ter : classement, pas prose). 529 tests
> + smoke verts. Recap #572. **Les deux classificateurs FR sont désormais durcis** (P4.1/#569, P4.2/#568,
> P4.3/#572). _Domaine : robustesse._

> ♿ **#571 — P2.4 : noms accessibles des champs de recherche (domaine `a11y`, build 2.0.194).**
> Rotation §4 bis : les 5 derniers domaines = `coach · robustesse · athlete · coach · a11y` → `coach`
> (priorité de nuit) dans le dernier recap ET 2× dans les 5 = **interdit** (§3 : la rotation prime même
> sur la demande de nuit), `robustesse` dans les 2 derniers = interdit → 2ᵉ demande d'Adrien (avancer
> CAP 3.0), tâche nommée **P2.4**, domaine `a11y` (1×, hors 2 derniers) autorisé. Vérif §2.3 : trois
> champs de recherche n'ont qu'un `placeholder` (WCAG 3.3.2 : pas un nom accessible, disparaît à la
> saisie) — `#foodSearch`, `#agendaSearch` **et `#exerciseSearch`**. **La roadmap se trompait** : elle
> disait `#exerciseSearch` déjà doté d'un `aria-label` — il n'en a **aucun** (ni `<label>`, ni
> `aria-labelledby`) → piste corrigée (§4 bis.5), champ inclus. `aria-label` ajouté aux **trois**, comme
> `#altSearch` déjà correct. **Aucun texte visible** (aria-label non rendu) → §4 ter sans objet ; a11y
> bumpe (précédents #549/#550/#566). Check smoke **bloquant** `searchFieldLabels` (les 4 champs, altSearch
> inclus pour verrouiller l'existant). 528 tests + smoke verts. Recap #571. **Toutes les pistes P2 sont
> traitées.** _Domaine : a11y._

> 🩹 **#570 — Coach : une décimale à point n'est plus tronquée → nombre FAUX sur la carte (domaine
> `coach`, build 2.0.193).** Rotation §4 bis : les 5 derniers domaines (mtime) = `robustesse · athlete ·
> a11y · coach · etudes` → `coach` (#567) absent des 2 derniers (#569 robustesse, #568 athlete) et **1×**
> dans les 5 → **autorisé** ; priorité de nuit (coaching à fond) et rotation convergent. Attrapé en **rendu
> chargé (§4ter)**, pas en test unitaire : insight sommeil de 322 c → carte résumée → « moy. **5.3 h** »
> devenait « moy. **3 h** ». `splitCoachSentences` découpait avec `match(/[^.!?]+.../g)` : `[^.!?]+`
> s'arrête au point **interne** de « 5.3 », et comme ce point n'est pas suivi d'un espace, le fragment
> « 5. » **tombait dans le trou entre deux captures et était PERDU** (« Tu dors 5.3 h » → « 3 h » : tête
> escamotée aussi). Cas courant : le verdict `sleepCoachInsight` écrit « moy. `${week.avg}` h » avec un
> **point**. Fix : frontière = `.!?` **suivi d'un espace/fin** (`/[.!?]+(?=\s|$)/`) — un point collé à un
> chiffre n'en est plus une — et découpage **par offsets** (aucun caractère jeté). Recollage
> parenthèses/minuscule **inchangé** (« (moy. 5 h… » reste une phrase). **Aucune note ajoutée** (§3 :
> curation, on répare un nombre inexact). +3 assertions. 528 tests + smoke verts. Recap #570. _Domaine :
> coach._

> 💼 **#569 — P4.1 : `relanc` classé AVANT les états terminaux → funnel Alternance corrompu (domaine
> `robustesse`, build 2.0.192).** Rotation §4 bis : les 5 derniers domaines = `athlete · coach · a11y ·
> etudes · coach` → `coach` (priorité de nuit) dans le dernier recap ET 2× dans les 5 = **interdit**,
> `athlete` dans les 2 derniers = interdit → 2ᵉ demande d'Adrien (avancer Cap 3.0/qualité), tâche nommée
> **P4.1**, domaine `robustesse` (absent des 5 derniers) autorisé. Méthode P4 sur les 3 motifs :
> `entretien`/`entrevue` et le seau `postule` **corrects** (ordre déjà protecteur, dit §4 bis.5) ;
> `relanc` **faux positif d'ORDRE prouvé** — testé en 2ᵉ position, AVANT refus/accepté/entretien (rangs
> 3-5 > relance rang 2), exactement le défaut corrigé pour `entretien`. « Relancé, sans suite » →
> **relance** au lieu de refus ; « relancé, entretien décroché » → relance au lieu d'entretien. Double
> corruption du module prioritaire : `mergeApplications` ne régresse jamais le rang → candidature **figée**
> en colonne « Relancé » ; `applicationStats` (answered = entretien+accepté+refus) **exclut** relance →
> **taux de réponse sous-évalué**. Fix : `relanc` déplacé juste avant le seau `postule` (reste rang 2 > 1,
> « postulé puis relancé » = relance préservé). +9 assertions. **Aucune note coach ajoutée.** §4ter :
> classement, pas prose. 528 tests + smoke verts. Recap #569. _Domaine : robustesse._

> 🏋️ **#568 — P4.2 : motifs courts ancrés dans `warmupFor`/`cooldownFor` (domaine `athlete`, build
> 2.0.191).** Rotation §4 bis : les 5 derniers domaines = `coach · a11y · etudes · coach · tests` →
> `coach` (priorité de nuit) dans le dernier recap ET 2× dans les 5 = **interdit**, `a11y` dans les 2
> derniers = interdit → 2ᵉ demande d'Adrien (avancer Cap 3.0/qualité), tâche nommée **P4.2**, domaine
> `athlete` (absent des 5 derniers) autorisé. **Faux positifs PROUVÉS** (méthode P4, fonctions rejouées) :
> `haut` matchait « hau**t**e intensité » → un cardio/HIIT héritait d'un échauffement **haut du corps** ;
> `press` matchait « pre**ss**e à cuisses/jambes » → une séance de **jambes** aussi. Fix : `\bhaut\b`,
> `\bpress\b` (l'anglais « floor/bench press » reste haut du corps, correct) ; ajout de `cuisse` +
> `bas du corps` au seau jambes → « presse à cuisses » et la séance **générée** « Bas du corps » (qui
> tombait en général) obtiennent enfin l'échauffement bas-du-corps. Cible non retenue dite (§4 bis.5) :
> « Leg press » anglais reste ambigu, non forcé. 10 assertions ajoutées. **Aucune note coach ajoutée.**
> Table de vérité rejouée §4ter. 528 tests + smoke verts. Recap #568. _Domaine : athlete._

> 🌙 **#567 — Coach : le crédit de suivi n'écrase plus l'action d'un pilier NON-sport (domaine
> `coach`, build 2.0.190).** Rotation §4 bis : les 5 derniers domaines = `a11y · etudes · coach · tests ·
> etudes` → `coach` (priorité de nuit) **absent des 2 derniers** (#566 a11y, #565 etudes) et **1×** dans
> les 5 → **autorisé** ; priorité de nuit (coaching à fond) et rotation convergent. Piste vérifiée #561
> (mémoire `coach-leads-contradictions-2guards`). Depuis #561, le crédit de suivi (`reinforce` + `coachFollowThrough
> ≥ 70 %`) ne réécrivait l'action « Un jour actif de plus… » que si le SPORT ne devait pas lever le pied —
> mais `sportEaseToday` exige `pillar === 'sport'`, donc pour les piliers **non-sport** (sommeil/focus/nutrition)
> la condition `!sportEaseToday` était **toujours vraie** → un **slogan sportif** écrasait l'action pilier
> (rendu chargé : sommeil `reinforce` ft 100 → « Vise un coucher 30 min plus tôt ce soir » remplacé par « Un
> jour actif de plus »). Fix : `if (chosen.pillar === 'sport' && !sportEaseToday)` — hors sport l'action riche
> reste, le crédit demeure dans l'insight ; **sport strictement inchangé** (readiness vert/plancher préservés).
> **Aucune note ajoutée** (§3 qualité). Rendu cumulé relu §4ter (5 états). 528 tests + smoke verts. Recap #567.
> _Domaine : coach._

> ♿ **#566 — P2.2 : `aria-live` sur les panneaux d'entraînement générés (domaine `a11y`, build
> 2.0.189).** Rotation §4 bis : les 5 derniers domaines = `etudes · tests · coach · etudes · coach`
> → `coach` (priorité de nuit) 2× dans les 5 derniers = **interdit** (§3 : la rotation prime même sur
> la demande de nuit) ; `etudes`/`tests` aussi (2 derniers) → 2ᵉ demande d'Adrien (avancer CAP 3.0),
> tâche nommée **P2.2**, domaine `a11y` (absent des 5 derniers) autorisé. Vérif §2.3 : deux
> générateurs — `#quickSessionResult` (séance express, `app.js:379`) et `#wpResult` (ma semaine,
> `app.js:720`) — remplacent leur `innerHTML` au clic **sans rien annoncer** au lecteur d'écran,
> alors que leurs voisins `#objectiveResult`/`#runPlanResult` ont `aria-live="polite"`. **La roadmap
> affirmait à tort que `#wpResult` l'avait déjà** (piste corrigée, §4 bis.5). Fix : `aria-live="polite"`
> ajouté aux **deux**. Bonus révélé : le check smoke `a11yObjective` était **défini mais jamais poussé
> dans `errors`** (non bloquant) → **étendu aux 4 panneaux + rendu bloquant** (nouveau `errors.push`).
> Aucun texte visible ajouté (juste l'attribut) → §4ter sans objet ; a11y bumpe (précédents #549/#550).
> 527 tests + smoke verts, `a11yObjective:true`. Recap #566. _Domaine : a11y._

> 🎓 **#565 — P6.3 : UI multi-épreuves (ajouter / lister / supprimer) → SÉRIE P6 CLOSE (domaine
> `etudes`, build 2.0.188).** Rotation §4 bis : `coach` (priorité de nuit) est dans les 2 derniers
> recaps (#564) ET 2× dans les 5 (#561/#564), `tests` idem (#560/#563) → les deux interdits ; `etudes`
> (1× en #562, hors des 2 derniers) **autorisé** → 2ᵉ demande d'Adrien (avancer CAP 3.0), tâche nommée
> **P6.3**. **Débloque** enfin le travail P6.1 (#555) + P6.2 (#559/#562) qui était **dormant** : le submit
> de `#studyPlanForm` **écrasait** `examGoals[]` à une seule épreuve (impossible de suivre Droit ET Compta
> à deux dates), et aucune UI ne listait/supprimait. 3 fonctions pures testées : `upsertExamGoal`
> (ajoute/met à jour par id — même date remplace le libellé, pas de doublon), `removeExamGoal`,
> `sortExamGoals` (tri date puis titre). Le submit **ajoute** désormais son épreuve au lieu d'écraser ;
> nouvelle carte **« 🎓 Mes épreuves (N) »** (`renderExamList`, sous le planning) : une ligne par épreuve
> (date · titre · **J-…**/« passé »), triées, avec un **×** (suppression immédiate, ne touche pas les
> créneaux agenda ; resync du `examGoal` legacy pour qu'une épreuve supprimée ne ressuscite pas). Check
> smoke **bloquant** `examListUI` (2 plannings à 2 dates → **coexistence** → liste → suppression → 1
> restante) : **3 runs verts**, état restauré. Contrôle §4ter : rendu cumulé relu, court/clair, aucune
> note coach ajoutée. 527 tests + smoke verts. Recap #565. **Série P6 close.** _Domaine : etudes._

> ⚖️ **#564 — Coach : plus de contradiction « coupe tes calories » vs « tiens tes calories » (domaine
> `coach`, build 2.0.187).** Rotation §4 bis (par n° de recap) : 2 derniers = #563 (tests) / #562 (etudes),
> `coach` (#561) hors des 2 derniers et 1× dans les 5 derniers → **autorisé** ; priorité de nuit (coaching
> à fond) et rotation **convergent**. Piste vérifiée en #561 (mémoire `coach-leads-contradictions-2guards`).
> Focus nutrition, objectif de **perte**, balance **flat** + tour de taille qui fond (recomposition) :
> l'insight donnait un **ordre de coupe** — vague (« baisse un peu tes calories ») ou **chiffré** avec profil
> (« vise ~2126 kcal/j, ~125 de moins ») — **puis**, dans la même phrase, le recadrage « tiens tes calories…
> **avant de couper** ». Deux ordres opposés collés ; avec profil, le premier portait un **nombre concret** à
> retrancher (le plus dangereux). Fix : détecter la recomposition **AVANT** de formuler le conseil calorique
> (`recompDetect`) → quand elle s'applique, **aucun ordre de coupe** (ni conseil vague, ni cible chiffrée :
> `calorieTarget` reste `null`), on clôt l'observation et le recadrage porte **seul** — ouvreur « **Avant de
> resserrer pour autant** : … » (supprime aussi le double « Mais »). Hors recomposition : **rien ne change**
> (contrôle rendu §4ter : le plateau chiffré normal reste intact). **Aucune note ajoutée** (§3 qualité pas
> volume). 526 tests + smoke verts, rendu cumulé relu (§4ter). Recap #564. _Domaine : coach._

> 🧪 **#563 — P7.3 : parcours « onboarding complet » dans le smoke → SÉRIE P7 CLOSE (domaine `tests`,
> pas de bump).** Rotation §4 bis : `coach` (priorité de nuit) est bloqué — il est dans le dernier
> recap (#561) ET 2× dans les 5 derniers (#558/#561) ; `etudes` est 2× (#559/#562) et dans les 2
> derniers → les deux interdits ; `tests` (1× en #560, hors 2 derniers) est **autorisé** → 2ᵉ demande
> d'Adrien (avancer CAP 3.0), tâche nommée **P7.3** (P1.5 tranchée, option B). Le smoke ne jouait que
> **deux** parcours scriptés (séance #556, planning #560) ; le **premier lancement** n'était couvert
> par aucun test de bout en bout. Nouveau check **bloquant** `onboardingJourney` : remplir
> `#onboardingDialog` → **clic réel** sur « Démarrer » → assertions **état cohérent en sortie** — profil
> + objectif appliqués, programme placé dans `state.agenda` au **bon nombre** (recalculé, pas figé),
> quêtes du jour + habitude de départ créées, `onboardingDone`/`blockStart` posés, **et le DOM suit**
> (dialogue fermé, récap ouvert affichant le nombre de séances, page Athlète active). État
> **intégralement restauré**. Piège attrapé pendant l'écriture : `normalizeAgendaItem` réécrit
> `source:'objprog'` en `'manual'` (hors `AGENDA_SOURCES`) mais garde le `refId` → filtrage par
> **refId `objprog-`**, pas par source. Aucune XP dans ce flux → pas de flakiness (#557) : **5 runs
> smoke verts**. Piège §6 respecté (concat + `indexOf`, zéro gabarit/regex). **Tests-only, aucun effet
> utilisateur → pas de bump.** 526 tests + smoke verts. Recap #563. _La série P7 (parcours scriptés)
> est close ; restent P6.3 (`etudes`) et P4 (`robustesse`) côté rotation._ _Domaine : tests._

> 🎓 **#562 — P6.2 terminé : les 4 consommateurs mono-valués lisent `examGoals[]` (domaine `etudes`,
> pas de bump).** Rotation §4 bis : `coach` (priorité de nuit) est bloqué — il apparaît dans les 2
> derniers recaps (#560) ET 2× dans les 5 derniers (#558/#560) → 2ᵉ demande d'Adrien (avancer CAP 3.0),
> tâche nommée **P6.2 (fin)**. `etudes` autorisé (1× en #559, hors 2 derniers). #559 avait porté les 2
> surfaces « liste » (`upcomingKeyDates`/`keyDateMarkers`) ; restaient 4 consommateurs **mono-valués**
> qui lisaient l'ancien `examGoal` unique : `examCountdown`, `examReminderDue`, `studyPacing` (rendu
> Études) et `attentionDigest` (coach). Nouveau sélecteur **pur `nearestExam(examGoals, todayKey)`** —
> « l'épreuve à venir la plus proche » (repli sur la plus récemment passée pour que le compte à rebours
> dise encore « examen passé »), départage stable par titre à date égale, tolère l'objet unique.
> `examCountdown` accepte désormais une **liste** (le résout via `nearestExam`) ; `examReminderDue` et
> `studyPacing` en héritent (ils délèguent). `app.js` (Études) et `attentionDigest` passent
> `state.examGoals` avec **repli sûr** sur `examGoal` (tests/états legacy inchangés). **Aucun effet
> utilisateur** : sans l'UI P6.3, le formulaire écrase `examGoal` → `examGoals` n'a jamais > 1 épreuve →
> sortie identique → **pas de bump** (§2.6, précédents #559/#555). 3 nouveaux tests logiques (sélection,
> passé, départage, liste sur les 3 fns) + check smoke `examCountdown` étendu au chemin liste. 526 tests
> + smoke verts. Recap #562. _Domaine : etudes._

> 🩹 **2.0.186 — #561 : le crédit de suivi du coach n'écrase plus l'action « lève le pied » (domaine
> `coach`, priorité de nuit).** Rotation §4 bis OK (`coach` #558 hors des 2 derniers recaps, 1× dans les
> 5 derniers). Contradiction entre deux guards, attrapée en **rendu chargé (§4ter)** : en ton `reinforce`
> avec un suivi élevé des conseils, le coach crédite l'effort dans l'insight **et** réécrivait l'action en
> « Un jour actif de plus aujourd'hui » — y compris les jours où readiness était **au plancher** (15/100,
> « récupération prioritaire » venait d'être posé l. 5533). Son garde-fou ne testait qu'`if (loadSpike ==
> null)`, or `loadSpike` (pic de charge, exige readiness null/≥50) est **mutuellement exclusif** des deux
> autres signaux « garde léger » (readiness < 50 et `readinessSlide`, qui exigent readiness < 50 / 50-74) →
> il ne les couvrait jamais. Résultat reproduit en vrai : « repose-toi » et « fais un jour actif de plus »
> côte à côte. Fix : le garde-fou reprend la **définition canonique de `sportEase`** (l. ~7200) — les trois
> signaux, pas le seul pic ; le crédit **reste dans l'insight**, seule l'écrasement de l'action cesse. **Ni
> ajout ni retrait** de contenu (une contradiction en moins). Piliers non-sport inchangés. Nouveau test
> logique (3 cas : readiness<50, forme qui glisse, readiness verte). 524 tests + smoke verts. Recap #561.
> _Pistes coach vérifiées mises de côté : recompFraming vs coupe calorique, followThrough hors sport (détail
> dans le recap)._ _Domaine : coach._

> 🧪 **#560 — P7.2 : parcours « générer un planning de révision » dans le smoke (domaine `tests`, pas
> de bump).** Rotation §4 bis : `coach` (priorité de nuit) est dans les 2 derniers recaps (#558) et
> `etudes` apparaît 2× dans les 5 derniers (#555, #559) → **les deux interdits** ; `tests` (1× en
> #556, hors 2 derniers) est autorisé → 2ᵉ demande d'Adrien (avancer CAP 3.0), tâche nommée **P7.2**
> (P1.5 tranchée, option B). Le smoke n'avait qu'**un** parcours scripté (`recordSessionJourney`,
> P7.1) ; les autres checks sont des rendus ponctuels. Nouveau check **bloquant** `studyPlanJourney`
> qui remplit `#studyPlanForm` → `dispatchEvent('submit')` **réel** → assertions : les créneaux
> « Révision » atterrissent dans `state.agenda` (`kind:'study'`, `source:'planner'`) au **bon
> nombre** (recalculé via `planStudySessions`, pas figé), le **statut** `#studyPlanStatus` affiche
> leur nombre, et **le DOM suit** (`#monthCalendar` contient un `[data-edit-agenda]` généré, avec
> `calendarCursor` calé sur juillet 2026). État **intégralement restauré** (agenda/examGoal/
> examGoals/cursor). Aucun award/haptic dans ce flux → pas de flakiness (#557) : 4 runs smoke verts.
> Piège §6 respecté (concat + `indexOf`, zéro gabarit/regex dans les checks injectés). **Tests-only,
> aucun effet utilisateur → pas de bump.** 523 tests + smoke verts. Recap #560. _Domaine : tests._

> 🎓 **#559 — P6.2 (1/3) : les échéances clés lisent `examGoals[]` (domaine `etudes`, pas de bump).**
> `coach` (priorité de nuit) est interdit par la rotation §4 bis (dans #558 ET 2× dans les 5 derniers) →
> 2ᵉ demande d'Adrien (avancer CAP 3.0), tâche nommée **P6.2**. `upcomingKeyDates` (puces « Ma journée »)
> et `keyDateMarkers` (marqueurs du calendrier) prenaient une **épreuve unique** ; ils acceptent
> désormais un **tableau** d'épreuves (une puce/marqueur par épreuve — ce sont les 2 surfaces « où la
> liste a du sens » pour un BTS multi-épreuves), avec **tolérance ascendante** (objet unique enveloppé →
> tests/checks existants inchangés) et **départage stable par libellé** à date égale. `app.js` lit
> `state.examGoals` ; le formulaire de planning (seul writer runtime) resynchronise la liste dans la
> foulée (sans perte tant que P6.3 n'existe pas). **Aucun effet utilisateur** (seul l'état mono-épreuve
> est atteignable sans l'UI P6.3) → **pas de bump** (§2.6, précédent #555). Tests logiques + checks
> smoke `keyDateMarkers`/`upcomingDeadlines` étendus au chemin array. 523 tests + smoke verts. Recap
> #559. _Reste 4 consommateurs mono-valués (`examCountdown`/`examReminderDue`/`studyPacing`/coach) →
> prochaine boucle `etudes` avec un sélecteur « épreuve la plus proche »._ _Domaine : etudes._

> 🧵 **2.0.185 — #558 : les conseils du coach à DEUX phrases ne se déchirent plus (domaine `coach`,
> priorité de nuit).** Rotation §4 bis OK (`coach` absent des 5 derniers recaps). Piste prête depuis
> #557 (mise de côté par §5 ce jour-là). Défaut réel attrapé en **rendu chargé (§4ter)** :
> `orderCoachNotes` hiérarchisait les notes **phrase par phrase**, or plusieurs guards tiennent sur
> deux phrases — un constat **classé** (ex. sommeil×sport, rang 2) + une conclusion **non classée**
> (« Bien dormir démultiplie l'effort que tu fournis déjà. », rang 4). Le tri les **séparait** : la
> conclusion tombait **orpheline tout en bas**, loin de sa prémisse → charabia dès qu'on dépliait
> « plus de contexte ». Fix : une phrase non classée **hérite du rang de la dernière phrase classée
> qui la précède** (bloc soudé, tri stable → ordre intra-bloc intact). **Ni ajout ni retrait** de
> contenu, juste l'ordre d'affichage (curation au rendu, §3). Garde-fou : une note neutre SANS
> prémisse (« Objectif hebdo », appendue AVANT les notes secondaires) reste au rang par défaut, jamais
> tirée vers le haut — vérifié au rendu + test dédié. Test logique + assertion bloquante `coachCuration`.
> 523 tests + smoke verts. Recap #558. _Domaine : coach._

> 🔧 **#557 — Smoke DÉFLAKÉ (domaine `robustesse`, réparation §5, pas de bump).** `verify` était
> rouge de façon **intermittente** (~1/5) AVANT tout changement → §5 impose « répare le harnais
> d'abord, rien d'autre ». Cause : le parcours `recordSessionJourney` (#556) évitait la célébration
> de **record** (pré-remplissage d'un Squat lourd) mais pas celle de **niveau** — le +XP de la séance
> pouvait franchir un palier de 100 → `renderDashboardCore` (`app.js:551`) `haptic('levelUp')` →
> `navigator.vibrate` bloqué par Chromium → warning console → SMOKE FAIL, selon l'XP du moment (run
> rouge : `levelSet 90/100` ; run vert : `20/100`). Préexistant à mes changements (master propre :
> 1 échec sur 4 runs). Fix : neutraliser **tout** `haptic` pendant le journey (`window.haptic = ()
> => {}`, restauré après), comme le check `overlayFocus` (l. ~794) — aucune assertion affaiblie.
> Preuve : **6 runs smoke consécutifs verts** (contre ~1/5 rouge). Recap #557. _Domaine : robustesse._
> _Piste coach mise de côté (§5) : `orderCoachNotes` déchire les guards à 2 phrases → conclusion
> orpheline en bas ; correctif prêt (héritage de rang intra-bloc), à reprendre. Détail dans le recap._

> 🧪 **#556 — P7.1 : premier PARCOURS scripté dans le smoke (domaine `tests`, pas de bump).** `coach`
> (priorité de nuit) étant dans les 2 derniers domaines (#554), la rotation §4 bis l'interdit cette
> boucle (§3 : elle prime même sur la demande de nuit) → tâche nommée **P7.1** de la 2ᵉ demande
> (avancer CAP 3.0), exactement l'ordre conseillé au démarrage VPS. Le smoke était un **rendu
> ponctuel** : aucun check ne jouait un **enchaînement** utilisateur. Nouveau check **bloquant**
> `recordSessionJourney` qui enregistre une séance **de bout en bout** — clic `#addWorkoutButton` →
> saisie → `dispatchEvent('submit')` → assertions : séance en tête de `state.workouts`, **XP** et
> **santé** créditées du bon montant, dialogue refermé, et le **DOM suit** (`#historyList` contient
> `[data-history-workout="<id>"]`). Piège traité : une 1ʳᵉ séance battrait un record → `haptic` →
> `navigator.vibrate` bloqué par Chromium → warning console → SMOKE FAIL ; corrigé en pré-remplissant
> l'historique d'un Squat plus lourd/plus de reps, donc aucune célébration. État **parfaitement
> restauré** (workouts/xp/health/pendingPlanId). Motif de parcours réutilisable posé pour P7.2/P7.3.
> 522 tests + smoke verts. Recap #556. _Domaine : tests._

> 🎓 **#555 — P6.1 : le modèle multi-épreuves `examGoals[]` + sa migration (domaine `etudes`, pas de
> bump).** Le coach étant le **dernier** domaine joué (#554), la rotation §4 bis l'interdit cette
> boucle (et §3 dit que la rotation prime, même sur la demande de nuit) : j'ai donc servi la 2ᵉ
> demande d'Adrien — **avancer la roadmap CAP 3.0** — avec la tâche nommée **P6.1** (⭐ « le plus
> utile à Adrien », son BTS CG). `examGoal` était un **objet unique** que le formulaire de planning
> **écrasait** à chaque envoi → impossible de suivre Droit et Compta à deux dates. Deux fonctions
> **pures + testées** dans `logic.js` : `normalizeExamGoal` (`{id,subject,title,date}`, `subject`
> texte libre, id stable `exam-<date>`/slug sans accents) et `normalizeExamGoals(state)` (migration
> **rétro-compatible** : l'ancien `examGoal` unique devient le **premier élément sans perte** ; état
> neuf → `[]` ; dédoublonnage par id). Câblage minimal : `examGoals: []` aux defaults +
> `normalizeState` l'alimente, **`examGoal` toujours lu** pour compat. **Aucun consommateur porté**
> (P6.2) ni UI (P6.3) → aucun effet utilisateur → **pas de bump** (§2.6). 522 tests + smoke verts.
> Recap #555. _Domaine : etudes._

> 📅 **2.0.184** — Coaching adaptatif poussé à fond (priorité de la nuit) : le coach connaît enfin
> **TON JOUR d'entraînement** (`sportHabitDay`) — le **QUAND**, un axe jamais lu. Tous les guards sport
> parlaient de CHARGE (`loadSpike`), de MODALITÉ (`trainBalanceGuard`), de ZONES (`pushPullGuard` /
> `sportZoneFocus` / `sportNeglectGuard`), de VOLUME de course (`runVolumeGuard`) ou de PROGRESSION —
> le **QUOI** et le **COMBIEN**, jamais sur quel **jour de semaine** repose l'habitude. `trainingByWeekday`
> (8 sem : séances par jour + jour dominant) existait mais ne vivait **QUE** dans l'onglet Athlète (0 appel
> côté coach). Or l'ancrage à une habitude **existante** (habit stacking) est le levier de comportement le
> plus solide : rappeler « c'est aujourd'hui ton jour » le jour même où le corps a le réflexe rend la séance
> bien plus probable qu'une injonction abstraite — ton RPG qui **célèbre** une régularité acquise. Nouveau
> champ **`sportHabitDay`** (`{ weekday, count, total, pct }` ou `null`, toujours renvoyé) : quand
> AUJOURD'HUI est le jour dominant, le coach le **nomme** — « c'est le jeudi que tu t'entraînes le plus
> (6 séances sur 9, 67 %)… honore-le aujourd'hui : t'appuyer sur une ancre d'habitude qui existe déjà rend
> la séance bien plus facile à lancer. » **Honnête** : exige une VRAIE habitude (≥ 8 séances sur 8 sem, jour
> vu ≥ 3 fois, part ≥ 30 %, **pic unique** — pas d'ex æquo), muet les autres jours, si la séance du jour est
> **déjà faite** (habitude honorée), en ré-amorçage dormant, si la forme ordonne le repos (`readiness < 50`)
> ou la charge est en pic (`loadSpike`). Axe **orthogonal** (~1 j/sem) → aucun sur-empilement, vocabulaire
> distinct. Note **appendue**, action du jour intacte. **Zéro** nouvelle fonction (réemploi
> `trainingByWeekday`, `doneToday`, `reviveEligible`, `loadSpike`, `readiness`). Tests + check smoke
> `coachFocus`/`whatsNew`. Recap #554.

> ✍️ **2.0.183 — accord de « fait(s) » en vue Jour (P2.5, domaine `agenda`).** Le pluriel se calait
> sur le **dénominateur** → « 1/3 fait**s** » avec un seul bloc réalisé, alors que la convention
> correcte est utilisée juste à côté (`app.js:555`) et dans `renderMyDay`. Check smoke **bloquant**
> `dayViewPlural`. _Piège du harnais re-rencontré et déjà documenté (§6) : dans les checks injectés
> par template literal, écrire `\\/` et `\\s`._ Recap #552. _Domaine : agenda._

> 🩹 **2.0.182 — le fix #446 était incomplet : des candidatures étaient « acceptées » à tort**
> (domaine `robustesse`). `\bpris` matche aussi `prise` : « **prise de contact** », « **pris
> contact** », « **pris en compte** », « **rendez-vous pris** » — les formulations les plus courantes
> d'une recherche d'alternance — basculaient toutes en **offre décrochée**, gonflant l'entonnoir et
> `applicationStats`, **automatiquement à chaque sync du Sheets**. « pris » exige désormais une
> tournure d'acceptation ; `\baccept` corrige aussi « in-accept-able ». L'attente documentée
> « candidature prise » → accepté est **préservée, pas renversée** (⚠️ ambiguë, à trancher par Adrien).
> 519 tests. Recap #551. _Domaine : robustesse._

> 🔎 **2.0.181 — plus de zone blanche (P2.3, domaine `alternance`).** Le suivi Alternance filtré à
> zéro rendait une chaîne vide (`app.js:268`) : compteur « 0 / 2 » mais liste **blanche**, de quoi
> croire ses candidatures perdues — sur le module prioritaire d'Adrien. Idem `#questList` une fois
> toutes les quêtes supprimées. Ces deux listes étaient les **seules** sans état vide (15 autres en
> ont un). Check smoke **bloquant** `listEmptyStates`. Recap #550. _Domaine : alternance._

> ⌨️ **2.0.180 — focus clavier des 3 overlays plein écran (P2.1, domaine `a11y` — rotation reprise).**
> `#weekPage`/`#calendarPage`/`#ultraPage` recouvrent `<main>` mais étaient ouvertes par un simple
> `.hidden=false` (6 emplacements) : le focus restait **dans le dashboard caché derrière**, on tabulait
> à l'aveugle, et la fermeture ne rendait pas le focus au bouton. Nouveaux `openOverlay`/`closeOverlay`
> (focus entrant, `inert`+`aria-hidden` sur `<main>`, focus restitué ; déclencheur d'origine préservé
> à travers les transitions). Piste **vérifiée exacte** avant codage. Check smoke **bloquant**
> `overlayFocus` + parcours clavier validé en navigateur. Recap #549. _Domaine : a11y._

> 🎯 **2.0.179 — la carte du coach redevient brève, sans jamais cacher une alerte.** La curation
> gardait « 2 phrases » quelle que soit leur longueur → **25 % des cartes dépassaient 300 c** (jusqu'à
> 420). Budget désormais en **caractères** : médiane **273 → 53 c**, plus aucune carte > 300 c. Nuance
> décisive : le budget ne filtre que **l'accessoire** — une alerte d'intégrité physique ou de charge
> passe **même si elle est longue** (un budget aveugle reléguait 96 alertes, annulant #547). Mesuré
> par fuzz sur 576 scénarios. _Piste des contradictions explorée et **déclarée fausse** : 0 doublon,
> 0 contradiction sur 1 260 scénarios._ Recap #548. _Domaine : coach — **2ᵉ d'affilée par exception
> explicite d'Adrien** ; la rotation §4 bis reprend en #549._

> 🚨 **2.0.178 — le coach dit d'abord ce qui compte.** Ses ~89 notes étaient concaténées dans l'ordre
> du **code**, pas de l'**urgence** : les notes anodines ayant été ajoutées tôt (`sessionGoalBonus`
> L5164) et les graves tard (kilométrage/fracture de fatigue L6726), la carte pouvait afficher
> « c'est du pur bonus, sans pression » **en cachant l'avertissement de blessure**. Désormais
> `orderCoachNotes` classe par urgence (0 blessure → 5 anodin), **verdict toujours en tête**, tri
> stable. Rien d'ajouté ni retiré : **l'ORDRE** change. Au passage, le contrôle navigateur §4 ter a
> attrapé ce que la suite verte laissait passer — le découpeur cassait « (moy. 5 h » en deux
> « phrases », invisible tant que l'ordre était préservé, charabia dès qu'on reclasse → nouveau
> `splitCoachSentences`. 518 tests + smoke. Recap #547. _Domaine : coach → la prochaine itération
> DOIT changer de domaine (§4 bis)._

**L'app est mature et stable** : 517 tests `node:test` + smoke Electron bloquant, **0 dépendance
runtime**, desktop (Electron) + **PWA en ligne**, auto-update silencieux. Le module **Alternance** 💼
(sync Google Sheets, cible du jour, relances) est opérationnel — c'est la **priorité de vie d'Adrien**
jusqu'à la rentrée, on l'améliore et on ne le casse jamais.

> ⚖️ **Le coach adaptatif : qualité, pas volume (arbitrage d'Adrien, 2026-07-19).** Adrien **tient au
> coach** et refuse le gel dur : on continue à l'améliorer, mais **en qualité** — corriger les
> contradictions, fusionner les redondances, **hiérarchiser** ce qui remonte en premier. Ajouter une
> note reste possible **sous condition de preuve** (§3). C'est la **rotation des domaines** (§4 bis),
> pas une interdiction, qui empêche de refaire 60 itérations d'affilée. Contexte du diagnostic :
> les versions **2.0.87 → 2.0.177** (89 entrées,
> commits **#487→#546**) ont porté **presque exclusivement** sur `adaptiveCoachFocus`. La fonction
> renvoie aujourd'hui **93 champs** (dont 60+ notes `…Guard` / `…Trend` / `…Driver`) et concatène
> jusqu'à **89 `insight +=`** ; `src/lib/logic.js` est passé de **5 649 à 9 488 lignes (+68 %)**.
> Les derniers ajouts ne faisaient plus que boucher les trous laissés par les précédents. Le pavé de
> texte que ça produisait a été corrigé **au rendu** en #546 (curation + « ＋ plus de contexte »).
> **Le gisement de valeur restant est donc dans la HIÉRARCHISATION**, pas dans une 90ᵉ clause.
> Règle en vigueur : **VPS-AUTOPILOT.md §3**.
>
> **Le détail version par version n'est plus recopié ici** (il vivait sur ~1 400 lignes) : il est
> déjà conservé **deux fois** — dans `docs/recaps/` (#487→#546) et dans la constante `CHANGELOG` de
> `src/lib/logic.js`. Cette page redevient une **roadmap** (où l'on va), pas un **journal** (où l'on
> est passé).

---

## 🌙 DÉMARRAGE VPS — nuit du 2026-07-19 (lis ceci EN PREMIER)

**État au moment du relais** : `master` = **2.0.183**, publiée (tag `v2.0.183`). 519 tests + smoke
verts. Rotation des domaines **amorcée** — les 7 derniers recaps sont étiquetés
`coach · coach · a11y · alternance · robustesse · agenda · tests`.

**Ta prochaine boucle est #554.** Domaines **interdits** au démarrage (§4 bis.3, apparaissent dans les
5 derniers) : `tests`, `agenda`, `robustesse`.

**Ordre conseillé pour la nuit** (respecte la rotation d'une boucle à l'autre) :

1. **#554 → `a11y`** : **P2.2** (ajouter `aria-live` à `#quickSessionResult` — **lui seul**) puis, une
   autre boucle, **P2.4** (`aria-label` sur `#foodSearch` et `#agendaSearch` — **eux seuls**).
2. **#555 → `etudes`** : **P6.1**, le modèle `examGoals[]` + migration. **C'est le plus utile à
   Adrien** (BTS CG). Logique pure : aucun risque renderer.
3. **#556 → `tests`** : **P7.1**, premier parcours scripté dans le smoke.
4. Puis alterne librement entre **P6.2**, **P7.2/P7.3**, **P4** (regex non ancrées) et **P2**, en
   changeant de domaine à chaque fois.

**✅ LES 6 PROPOSITIONS P1 SONT TRANCHÉES** (Adrien, 2026-07-19 — il a validé **la recommandation de
chaque document**). Attention : **deux recommandations étaient des « non »**. Ce qui s'ouvre :

| | Décision | Pour toi, VPS |
|---|---|---|
| **P1.1** coach | Gel refusé → « qualité, pas volume » | Déjà appliqué (§3) — le coach reste un domaine **comme les autres**, soumis à la rotation |
| **P1.2** IndexedDB | ✅ option B | ⛔ **NE L'ENTAME PAS.** Réservé à une session supervisée : réécrit le boot en **asynchrone** et touche la **persistance** — risque sur les données d'Adrien sans surveillance |
| **P1.3** multi-examens BTS | ✅ option A | ▶️ **AUTORISÉ, par étapes** — voir P6 ci-dessous |
| **P1.4** modules ES | ⛔ attendre | Rien à faire (rouvre après P1.2) |
| **P1.5** parcours E2E | ✅ option B (smoke, zéro dép.) | ▶️ **AUTORISÉ** — voir P7 ci-dessous |
| **P1.6** i18n | ⛔ ne rien faire | Rien à faire. **N'amorce pas d'i18n.** |

**Playwright reste interdit** (§3 « aucune dépendance ») : la décision retenue est d'étendre le smoke.

**⚠️ Deux corrections de cap à connaître** (elles t'éviteront deux boucles perdues) :
- **P3 est une impasse** — sondée en #553, les fonctions pures sont correctes et déjà couvertes.
- **L'audit a11y était partiellement faux** — `#wpResult` et `#exerciseSearch` ont déjà ce qu'on leur
  reprochait. Les périmètres de P2.2 et P2.4 sont corrigés ci-dessous. **Vérifie toujours avant de
  coder** : c'est la règle §2.3, et elle vient de payer trois fois.

---

## 🎯 Prochaines priorités — ce sur quoi travailler MAINTENANT

> **Pourquoi cette section existe.** 60 itérations autonomes d'affilée sont parties dans le même
> fichier parce que le backlog était formulé en **catégories** (« polish », « robustesse ») et non en
> **tâches nommées**. Une catégorie ouverte se remplit toujours par le chemin de moindre résistance.
> Ci-dessous : des tâches **nommées, vérifiées dans le code, et rangées par domaine** — on en prend
> **une**, on la coche, on **change de domaine** à la suivante (VPS-AUTOPILOT §4 bis).

### P1 — Réveiller le mécanisme de PROPOSITIONS _(✅ écrites — en attente de décision)_

`docs/proposals/` n'existait pas : la soupape « gros chantier = proposition » n'a **jamais** servi en
546 boucles. Ces six sujets sont les **vrais** verrous du Cap 3.0. Chacun = **un document de design**
(problème · 2-3 options · reco · risques · ce qui dépend d'Adrien), **PAS une implémentation**.

> ✅ **Les 6 propositions sont ÉCRITES (2026-07-19)** — elles attendent maintenant **les décisions
> d'Adrien**, listées en fin de chaque document. **Rien ne s'implémente avant qu'il ait tranché.**
> Recommandations : **P1.1** geler (A) · **P1.2** IDB primaire (B) · **P1.3** modèle `examGoals[]`
> d'abord (A) · **P1.4** attendre, après P1.2 · **P1.5** étendre le smoke sans dépendance (B) ·
> **P1.6** ne rien faire pour l'instant (D). _Les deux dernières concluent volontairement par un
> « non » : une proposition honnête peut recommander de ne pas faire le travail._

- [x] **P1.1 — `coach-freeze.md`** — acter le gel : périmètre exact de ce qui reste autorisé
      (correctif d'un guard qui se déclenche à tort / se contredit, curation au rendu) vs interdit
      (tout nouveau champ ou `insight +=`). _Le VPS ne modifie PAS §3 lui-même : il propose, Adrien acte._
- [x] **P1.2 — `indexeddb-primary-persistence.md`** — **prérequis n°1 de la sync multi-appareils.**
      Aujourd'hui `app.js:32` démarre sur `localStorage['irl-level-up']` et `save()` (`app.js:54`)
      écrit localStorage **en premier** ; IndexedDB n'est qu'une **copie de secours** lue uniquement
      en récupération après éviction (`app.js:104-119`), **jamais au démarrage normal** → le plafond
      ~5-10 Mo et le risque d'éviction iOS restent **entiers**. Options : sauvegarde seule / IDB
      primaire asynchrone / schéma versionné prêt pour la sync. Le vrai risque à peser : le boot
      devient **asynchrone**.
- [x] **P1.3 — `multi-exam-etudes-bts.md`** — **le besoin réel d'Adrien (BTS CG).** `examGoal` est un
      **objet unique** `{title,date}` (`app.js:22`) et le formulaire de planning **écrase** l'examen
      précédent à chaque envoi (`app.js:872`) : impossible de suivre deux épreuves à des dates
      différentes. 5 fonctions le consomment au singulier (`examCountdown`, `examReminderDue`,
      `studyPacing`, `upcomingKeyDates`, `keyDateMarkers`) et `studyBySubject` (`logic.js:1750`)
      déduit la matière du **titre** sans date d'examen propre. Reco : modèle `examGoals[]`
      `{id,subject,title,date}` + migration rétro-compatible. **Doc seul** — le portage des
      consommateurs et l'UI multi-examens sont un chantier multi-commits.
- [x] **P1.4 — `es-modules-split.md`** — `logic.js` **9 488 lignes** (un seul `module.exports` final),
      `app.js` **367 Ko / 1 089 lignes ultra-denses**, 5 scripts chargés en **globals**
      (`index.html:287-291`), aucun bundler. Options : modules ES natifs (zéro dép) / bundler en
      devDep / hybride. Contrainte dure : le harnais CommonJS des tests **et** le smoke doivent rester
      verts. Dépend d'Adrien : accepter ou non un bundler.
- [x] **P1.5 — `e2e-playwright.md`** — aucun test de **parcours** utilisateur (le smoke est un rendu
      ponctuel). ⚠️ Playwright = **devDependency + binaire navigateur**, ce qui heurte de plein fouet
      la règle « aucune dépendance » → **décision d'Adrien obligatoire**, d'où la proposition.
- [x] **P1.6 — `i18n-groundwork.md`** — `<html lang="fr">`, des milliers de littéraux FR en dur
      (`WEEKDAY_FR` `logic.js:9426`, `monthLabelFr` `logic.js:2259`), **aucune** infra `t()`. Reco :
      helper minimal + catalogue FR + **une tranche bornée** (libellés de nav/réglages). Piège à
      signaler : `logic.js` renvoie des **phrases pré-composées** qui résistent à l'extraction naïve.
      _Priorité basse (l'audit la séquence « en continu ») — à ne prendre qu'après les autres._

### P2 — Accessibilité & polish honnête _(pistes à VÉRIFIER avant de coder)_

⚠️ **Ces cinq pistes n'ont PAS été contre-vérifiées** (l'audit s'est arrêté sur une limite d'usage).
Elles viennent d'une lecture réelle du code mais **doivent être reconfirmées** (grep + lecture) avant
implémentation — exactement ce qu'exige VPS-AUTOPILOT §2.3. Si une piste s'avère fausse : **le dire**
dans le recap et passer à la suivante.

- [x] **P2.1 — Focus des 3 overlays plein écran** ✅ _fait #549 (2.0.180) — piste VÉRIFIÉE exacte_ — `#weekPage` / `#calendarPage` /
      `#ultraPage` sont des `<section>` `position:fixed;inset:0` ouvertes par un simple
      `.hidden=false` (`app.js:852-853, 864-865`) : **aucun** déplacement de focus à l'ouverture,
      **aucune** restitution au déclencheur à la fermeture, `<main>` jamais `inert`. Au clavier on
      reste donc dans le dashboard **caché derrière**. (Les vrais `<dialog>` en `showModal` gèrent ça
      tout seuls — d'où l'écart.) Check smoke **bloquant** obligatoire.
- [x] **P2.2 — `aria-live` manquant sur les panneaux générés** ✅ _fait #566 (2.0.189)_ — vérif du
      code : **`#quickSessionResult` ET `#wpResult`** en manquaient (la note « `#wpResult` l'a déjà »
      était **fausse**), là où `#objectiveResult`/`#runPlanResult` l'avaient → circuit généré = silence
      au lecteur d'écran. `aria-live="polite"` ajouté aux deux ; check smoke `a11yObjective` **étendu
      aux 4 panneaux et rendu bloquant** (il était défini mais jamais poussé dans `errors`).
- [x] **P2.3 — États vides manquants** ✅ _fait #550 (2.0.181) — piste VÉRIFIÉE exacte_ — `#altList` filtré à zéro rend `''` (`app.js:220`) : la zone
      devient **blanche** alors que des candidatures existent (l'utilisateur croit ses données
      perdues). Idem `#questList` (`app.js:506`) quand toutes les quêtes sont supprimées.
- [x] **P2.4 — Noms accessibles des champs de recherche** ✅ _fait #571 (2.0.194)_ — le périmètre
      « corrigé » du 2026-07-19 se trompait : **`#exerciseSearch` n'avait PAS d'`aria-label`** (ni
      `<label>`, ni `aria-labelledby`), tout comme **`#foodSearch`** et **`#agendaSearch`** — les
      trois n'avaient qu'un `placeholder` (WCAG 3.3.2 : un placeholder n'est pas un nom accessible).
      `aria-label` ajouté aux **trois**, comme `#altSearch` déjà correct. Nouveau check smoke
      **bloquant** `searchFieldLabels` (les 4 champs, altSearch inclus pour verrouiller l'existant).
- [x] **P2.5 — Accord de « fait(s) » en vue Jour** ✅ _fait #552 (2.0.183)_ — `app.js:487` accorde sur le **dénominateur**
      (`doable.length`) : « 1/3 fait**s** » alors qu'un seul est fait. `renderMyDay` (`app.js:200`)
      accorde correctement sur le **numérateur**. _(Valeur faible — à prendre en bouche-trou.)_

### P3 — Tests & robustesse _(⚠️ prémisse INVALIDÉE — voir recap #553)_

**Sondé en #553 : ce n'est PAS un gisement de bugs.** `jobDateFromText` (dates aberrantes),
`recurrenceMatches` (fins de mois, 29/02, intervalles), `parseIcsDateTime`, `agendaMatch`,
`normalizeApplication`+`mergeApplications` (espaces parasites → **0 doublon** à la sync) : tous
**corrects** face à des entrées hostiles, et **déjà couverts** (34 / 23 / 20 / 11 assertions).

Ne reprends ce sujet **que** sur une fonction précise dont tu as prouvé le manque — ne le prends pas
pour un chantier ouvert, ça coûterait une boucle pour rien.

> 🎯 **Le vrai gisement de qualité, lui, est identifié** : les **regex non ancrées** sur du français.
> Trois occurrences dans la seule session du 2026-07-19, plus le bug #446 en production, plus le faux
> positif corrigé en #551 (« prise de contact » classée « acceptée », funnel corrompu à chaque sync).
> **Toute regex de classification de texte FR doit être ancrée** (`\b`, ou exiger une tournure
> explicite) — un mot français en contient souvent un autre.

### P4 — Chasse aux REGEX NON ANCRÉES _(le vrai gisement, prouvé)_

C'est la dette de qualité identifiée par les faits : **un mot français en contient souvent un autre**.
Historique réel — bug **#446** (`pris` dans « entre**pris**e »), faux positif **#551** (« **prise** de
contact » → candidature « acceptée », entonnoir corrompu **à chaque sync**), et deux pièges heurtés le
même jour (`repos` dans « cerveau repos**é** », `blessure` en incise dans une note pédagogique).

**Méthode par cible** : lire la regex, **construire 5-10 phrases FR réalistes** contenant le motif
dans un mot plus long ou dans un autre sens, exécuter, **prouver** le faux positif, ancrer (`\b` ou
exiger une tournure explicite), verrouiller par un test. **Si aucun faux positif réaliste n'existe :
le dire dans le recap et passer à la cible suivante** — ne force pas.

- [x] **P4.1 — `jobStatusFromText`, motifs restants** ✅ _fait #569 (2.0.192)_ (`/relanc/`,
      `/entretien|entrevue/`, seau `postule`). `entretien`/`postule` **corrects** (ordre déjà protecteur) ;
      `relanc` était classé AVANT les états terminaux (rang 2 sous refus/accepté/entretien) → « relancé,
      sans suite » figé en « Relancé » et exclu du taux de réponse → **déplacé après** eux, avant `postule`.
- [x] **P4.2 — Classement des séances par nom** ✅ _fait #568 (2.0.191)_ (`logic.js:2019/2032` warmupFor
      + `:2021/2034` cooldownFor) : `/poussée|tirage|haut|
      traction|pompes|press|militaire/`, `/jambe|chaîne|squat|fessier|fente|mollet/`,
      `/trail|côte|course|puissance|longue|swing|explos/`. Motifs courts (`haut`, `press`, `côte`,
      `course`) dans des noms d'exercices libres — vérifier chacun.
- [x] **P4.3 — Balayage du reste de `logic.js`** ✅ _fait #572 (2.0.195)_ : balayage complet des
      `.test(`/`.match(` — les **deux seuls** classificateurs de texte FR libre sont `jobStatusFromText`
      (déjà P4.1/#569) et `warmupFor`/`cooldownFor` (P4.2/#568) ; `exerciseZones` = lookup exact, les
      autres `.includes` = recherches de sous-chaîne intentionnelles. Dernier faux positif de
      `jobStatusFromText` corrigé : « pas encore postulé » (négation de l'action) → `a_postuler` au lieu
      de `postule`. **Les classificateurs FR du fichier sont durcis** ; plus de cible P4 ouverte.

### P5 — Mesurer avant de supposer _(méthode qui a marché, à réemployer)_

La boucle #548 a trouvé un vrai défaut en **mesurant** plutôt qu'en devinant : rejouer une fonction
sur des centaines d'états réalistes et observer la distribution de ce qui sort. Elle a aussi
**invalidé** une piste (0 contradiction sur 1 260 scénarios) — un résultat négatif est un résultat.

- [ ] **P5.1 — Longueur des textes utilisateur ailleurs que le coach** : mêmes mesures (p50/p90/max)
      sur les résumés « Ma journée », la revue hebdo, les partages texte. Un pavé se corrige au rendu.
- [ ] **P5.2 — Cohérence des conseils entre panneaux** : un même jour, le coach, « Ma journée » et la
      revue hebdo peuvent-ils se **contredire** ? Fuzzer et comparer.

### P6 — Multi-épreuves BTS `examGoals[]` _(P1.3 VALIDÉE — option A)_ ⭐ **le plus utile à Adrien**

Aujourd'hui `examGoal` est un **objet unique** et le formulaire de planning **écrase l'épreuve
précédente** (`app.js:872`, affectation directe) : impossible de suivre Droit et Compta à deux dates.
**Une étape par boucle**, chacune verte, dans cet ordre :

- [x] **P6.1 — Le modèle + la migration** ✅ _fait #555 — logique pure testée, pas de bump_ :
      `normalizeExamGoal` + `normalizeExamGoals(state)` dans `logic.js` (exportées), `examGoals: []`
      aux `defaults`, alimenté par `normalizeState` — migration **rétro-compatible** (ancien
      `examGoal` unique → premier élément sans perte ; état neuf → `[]`), `examGoal` **toujours lu**
      pour compat. Migration testée en premier. Aucun consommateur porté (→ P6.2), aucune UI (→ P6.3).
      ❗ `subject` en **texte libre** — aucune matière BTS ni date inventée.
- [x] **P6.2 — Porter les consommateurs** ✅ _fait #559 (list) + #562 (mono-valués), pas de bump_ :
      ~~`upcomingKeyDates`~~ ✅ #559, ~~`keyDateMarkers`~~ ✅ #559 (itèrent la liste) ;
      ~~`examCountdown`~~ ~~`examReminderDue`~~ ~~`studyPacing`~~ ✅ #562 (sélecteur `nearestExam`
      « l'épreuve la plus proche »), ~~le coach (`attentionDigest`)~~ ✅ #562. Règle appliquée :
      **prendre l'épreuve à venir la plus proche** (repli sur la plus récemment passée). Reste **P6.3**
      (UI) pour rendre l'état multi-épreuves atteignable.
- [x] **P6.3 — UI ajouter / lister / supprimer une épreuve.** ✅ _fait #565 (2.0.188)_ — le submit du
      planning **ajoute** l'épreuve (`upsertExamGoal`, ne l'écrase plus) ; carte « 🎓 Mes épreuves (N) »
      (`renderExamList`) listant date · titre · J-… avec un **×** par épreuve (`removeExamGoal`). Check
      smoke **bloquant** `examListUI` (coexistence de 2 épreuves + liste + suppression). **Série P6 close.**

### P7 — Parcours utilisateur dans le smoke _(P1.5 VALIDÉE — option B, zéro dépendance)_

Le smoke est un rendu ponctuel ; **aucun test ne joue un enchaînement**. On y ajoute des parcours
scriptés (clic → saisie → assertion), **sans aucune dépendance** (Playwright reste interdit, §3).
Un parcours par boucle, chacun en check **bloquant** :

- [x] **P7.1 — Enregistrer une séance** → historique et XP à jour. ✅ _fait #556 — check bloquant
      `recordSessionJourney` (clic → saisie → submit → assertions état + DOM), état restauré, pas de bump._
- [x] **P7.2 — Générer un planning de révision** → créneaux visibles dans l'agenda. ✅ _fait #560 —
      check bloquant `studyPlanJourney` (remplir #studyPlanForm → submit → créneaux `study/planner`
      dans state.agenda + visibles dans #monthCalendar + statut à jour), état restauré, pas de bump._
- [x] **P7.3 — Onboarding complet** → état cohérent en sortie. ✅ _fait #563 — check bloquant
      `onboardingJourney` (remplir #onboardingDialog → « Démarrer » → profil/objectif appliqués,
      programme placé dans state.agenda, quêtes + habitude créées, onboardingDone/blockStart posés,
      récap ouvert sur la page Athlète), état restauré, pas de bump._ **Série P7 close.**

_Restaure toujours l'état à la fin du check (voir `listEmptyStates` et `dayViewPlural` pour le motif)._

### 🌙 SI LE BACKLOG SE VIDE — dans cet ordre, sans jamais inventer

1. Reprends **P4** (il y a de quoi tenir : chaque regex est une cible).
2. Écris une **proposition** manquante ou approfondis-en une (`docs/proposals/`).
3. **Améliore les recaps/commentaires** là où le code est piégeux (domaine `docs`).
4. **Ne commite RIEN** et dis-le (§5). Un run vide vaut mieux qu'un commit inventé — c'est
   explicitement ce qu'Adrien préfère.

### 🚫 Ce qui n'est PAS à faire en autonomie

Nouvelle note du coach **sans la double preuve exigée par §3** · tag/release · dépendance npm ·
données personnelles dans le repo · `.github/workflows/` et posture sécurité · retrait/désactivation
d'une fonctionnalité · réécriture de fond de VPS-AUTOPILOT.md ou de la roadmap 3.0.

---

## 🗄️ Archive — historique du projet (2.0.86 et antérieurs)

_Tout ce qui suit est un **journal de ce qui a été livré**, conservé pour mémoire. Ce n'est **pas** un
backlog : pour savoir quoi faire, remonte à « 🎯 Prochaines priorités » ci-dessus. Le détail des
versions **2.0.87 → 2.0.177** n'est plus recopié ici (voir `docs/recaps/` et la constante `CHANGELOG`)._

App **desktop (Electron) + PWA mobile EN LIGNE** sur https://adrienlvl.github.io/irl-lvp-up/ (GitHub Pages activé le 2026-07-14) — installation iPhone : voir **[docs/INSTALLER-SUR-IPHONE.md](INSTALLER-SUR-IPHONE.md)**. Hors accès réseau **opt-in**. **447 tests + smoke** verts (harness durci, dont garde-fou CSS + 69 gardes smoke bloquants, wrapper smoke async). Releases desktop **espacées** (~1/jour max hors session active) ; dernière Release publiée : `v2.0.11` (trio coach). **Vague 1 complète ; Vague 2 « Fondations » entamée.** Livré au-delà de la roadmap initiale (boucles #36→**454**) :

- 🏃 **Programme auto : « course » accordée au pluriel quand runs > 1** (2.0.86) : le résumé de
  « Mon programme selon mon objectif » (`runObjectiveProgram` `app.js:620` + `objectiveProgramText`
  `logic.js:3268`, texte copié/partagé) affichait `${p.runs} course/sem.` figé au singulier, alors
  que `p.runs` vaut 2/3/4 pour 4 des 5 objectifs (`FITNESS_OBJECTIVES`) → « 4 course/sem. ». Fix =
  ternaire d'accord aux 3 emplacements (dont le détail « (X muscu, Y courses) »), « muscu » laissé
  invariable ; Prise de muscle (1 run) reste « 1 course/sem. ». Filon pluriel dans le sens inverse
  de #452→#454 (compte > 1). Test unitaire + check smoke bloquant `objectiveRunPlural` (rendu réel
  piloté) → **449 tests** + smoke vert. Polish UX honnête (§4.4), domaine Athlète.
  (`docs/recaps/456-objective-course-plural.md`). ✅ _boucle #456._

- 💼 **Import Alternance : DOM à 3 chiffres + en-tête « Score /100 » mieux détectés** (2.0.85) :
  `parseAlternanceTargets` (`logic.js:345`) — `deptOf` n'extrayait qu'`(\d{2})` → un département
  d'outre-mer `(972)` n'était jamais reconnu (non ciblable) ; `iScore` faisait `includes('10')` →
  « Score /100 » était pris pour la colonne `/10`, scores hors [0,10] → `NaN`, et avec `minScore>0`
  **import silencieusement vide**. Fix pur : `\d{2}`→`\d{2,3}` et `includes('10')`→`/\b10\b/`, sans
  effet sur les données actuelles (« Score /10 », villes métropolitaines). +2 tests → **449 tests**
  + smoke vert. Robustesse (§4.2), module sacré amélioré. Pivot après 3 boucles d'accord de pluriel.
  (`docs/recaps/455-alternance-parse-dom-score100.md`). ✅ _boucle #455._

- 📸 **Progression photo : « jour » accordé au singulier à 1 jour d'écart** (2.0.84) :
  `renderGrowth` (`app.js:440`), encart « Avant / Après », affichait « 1 **jours** d'écart » quand
  deux photos sans poids étaient à un jour d'intervalle (`photoComparePair.days` = 1, voire 0 le
  même jour) — pluriel codé en dur, fautif en FR. Même filon que #453/#452. Correctif = ternaire
  `jour${cmp.days>1?'s':''}` (idiome du fichier, aucun helper `jour` n'existe). Check smoke bloquant
  `photoCompareDelta` → **447 tests** + smoke vert. Polish UX honnête (§4.4), domaine Croissance.
  (`docs/recaps/454-photo-compare-jour-accord.md`). ✅ _boucle #454._

- 🎂 **Liste des anniversaires : âge accordé au singulier (« 1 an » via `ageLabel`)** (2.0.83) :
  `renderBirthdays` (`app.js:182`) codait « ans » en dur (`${nowY-b.year} ans`) → « 1 ans » pour un
  premier anniversaire, là où les 2 vues sœurs (bandeau « 🎂 À venir » `app.js:469`, calendrier
  mensuel `app.js:474`) passent déjà par le helper `ageLabel` (`logic.js:471`, « 1 an »/« 2 ans »,
  0/1 → singulier). Correctif = réutilisation du helper (`ageLabel(nowY-b.year)`) — dernier des 3
  emplacements resté au pluriel figé. Check smoke bloquant `ageLabelList` (« 1 an< » présent, « 1 ans »
  absent) → **447 tests** + smoke vert. Polish UX honnête (§4.4), domaine Anniversaires.
  (`docs/recaps/453-birthday-list-agelabel.md`). ✅ _boucle #453._


- 🎯 **Bilan hebdo : « encore N séances » (nom accordé) au lieu de « encore N »** (2.0.82) :
  `weeklyInsights` (`logic.js:2303`, carte « Comment va ma semaine ») terminait son conseil objectif
  par « encore 2 **pour** ton objectif hebdo » — le nombre restant **sans son nom**, là où le message
  frère d'`app.js:146` inclut déjà « N séance(s) pour boucler ton objectif ». Correctif = le reste à
  faire porte « séance(s) » accordé sur le nombre restant (`left > 1 ? 's'`), aligné sur `app.js` et
  la convention FR. Seul le libellé change. +2 assertions au test `weeklyInsights` (singulier ET
  pluriel du reste) → **447 tests** + smoke vert. Polish UX honnête (§4.4), domaine Bilan hebdo.
  (`docs/recaps/452-weekly-insights-encore-seances.md`). ✅ _boucle #452._

- 🏋️ **`blockWindowStats` : décompte des séries robuste aux séances saisies à la main** (sans build) :
  `blockWindowStats` (`logic.js:3828`) comptait le tonnage via `workoutTonnage` (qui gère les séances
  saisies au formulaire `{load,reps,sets}` sans setLogs + le legacy `w.exercise`) mais les séries via
  `completedSetCount`, qui n'additionne QUE les setLogs cochés → un bloc rempli à la main donnait
  `tonnage > 0` mais `sets: 0` (jumeau de l'incohérence #444, restée ouverte côté séries). Nouveau
  helper `workoutSetCount` symétrique de `workoutTonnage` (chemin setLogs INCHANGÉ, repli sur `sets`
  hors setLogs + legacy). Champ `sets` **non rendu** aujourd'hui → aucun effet visible, **pas de bump**
  (§6). +1 test + assertions au test `blockWindowStats` → **447 tests** + smoke vert. Correctness/robustesse
  (§4.1/§4.2), domaine Musculation. (`docs/recaps/451-blockwindowstats-sets-legacy.md`). ✅ _boucle #451._

- 🎨 **Cycle de thème : commentaire recalé sur le 4ᵉ mode « selon l'heure »** (docs, sans build) :
  `nextThemeMode` (`logic.js:13`) cycle sur `['auto','light','dark','time']` (4 modes) mais son
  commentaire (l. 12) annonçait « auto → clair → sombre → auto » (3 modes), omettant `'time'` — pourtant
  de plein droit (`resolveTheme`, icône 🕐/tooltip, bouton `#themeToggle`, test l. 55-58). Commentaire
  seul corrigé, aucune ligne de code ni de test touchée → **pas de bump** (§6). 446 tests + smoke vert.
  Docs (§4.6), domaine Thème/UI. (`docs/recaps/450-nextthememode-comment-time.md`). ✅ _boucle #450._

- 🗓️ **Bloc d'entraînement : décompte des jours robuste au changement d'heure** (2.0.81) :
  `currentBlock` (`logic.js:3751`) comptait les jours écoulés avec `Math.floor((today − start) /
  86400000)` sur des minuits **locaux** ; à travers un DST, deux minuits successifs sont distants de
  23 h (printemps) → 7 jours calendaires devenaient `6,958` rabattu sur 6. Le lundi suivant le passage
  à l'heure d'été, `phaseSetsForDay` prescrivait **3 séries au lieu de 4** (S1 Base au lieu de S2
  Volume) et la fin de bloc glissait d'un jour. Tout le reste du fichier utilise déjà `Math.round`
  pour absorber ce ±1 h. Correctif = `floor` → `round`. Rétro-compatible (hors semaine DST : identique).
  +1 test DST (`Europe/Paris`, TZ forcé/restauré) → **446 tests** + smoke vert (`currentBlock`,
  `phaseSetsForDay`). Correctness (§4.1), domaine Musculation. (`docs/recaps/449-currentblock-dst-round.md`).
  ✅ _boucle #449._

- 😴 **Bilans hebdo/mensuel : moyenne de sommeil dédupliquée par date** (2.0.80) :
  `weeklySummary` (`logic.js:2180`) et `monthlyRecap` (`logic.js:2247`) moyennaient les **saisies
  brutes** de `recovery[]` là où leurs sœurs (`weeklySleepStats`, `sleepDebtHours`, `sleepSeries`)
  dédupliquent par date. Deux relevés sur la même nuit (import/restauration/double check-in) pesaient
  double : `weeklySummary.sleepAvg` → 6,7 h au lieu de 6 ; `monthlyRecap` → 6 au lieu de 4. Faussait la
  moyenne affichée + l'alerte « sommeil bas » (`weeklyInsights`). Correctif = dédup `sleepByDate`
  (dernier check-in), aligné sur #436. Rétro-compatible. +3 tests → **445 tests** + smoke vert
  (`weeklyText`/`monthlyRecap`). Correctness (§4.1), domaine Sommeil.
  (`docs/recaps/448-sleep-avg-dedup-date.md`). ✅ _boucle #448._

- ⚖️ **Coach Poids : seuil « maintien » d'`energyPlan` aligné sur `weightTargetAdvice`** (2.0.79) :
  les deux fonctions dérivent le même verdict perte/prise/maintien depuis `poids − cible` et
  alimentent le **même écran** Coach Poids, mais `energyPlan` (`logic.js:4596`) basculait en « perte »
  dès 0,3 kg d'écart (déficit ~500 kcal/j) là où `weightTargetAdvice` (l. 5146, seuil 0,5) disait
  « maintien/recomposition » — deux verdicts opposés au même endroit pour un écart (0,35 kg) dans la
  fluctuation quotidienne eau/sel. Correctif = seuil aligné à 0,5. Rétro-compatible (seule la zone
  `[0,3 ; 0,5[` bascule vers maintien). +4 tests → **444 tests** + smoke vert (`targetAdvice`).
  Correctness (§4.1/§4.4), domaine Nutrition. (`docs/recaps/447-energyplan-maintien-seuil.md`).
  ✅ _boucle #447._

- 💼 **Alternance : « refusé/accepté après entretien » = état terminal** (2.0.78) :
  `jobStatusFromText` (`logic.js:296`, partagé par tous les imports manuels + sync Google Sheets)
  testait `entretien` AVANT les refus/accepté → tout statut contenant « entretien » (« Refusé après
  entretien », « Non retenu à l'entretien », « Retenu après entretien ») était classé `entretien` au
  lieu de `refus`/`accepte`. La candidature restait bloquée en colonne Entretien du funnel (gonflant
  `applicationStats.entretiens`) et, `rankOf` entretien < refus, ne pouvait plus régresser au re-sync.
  Correctif = déplacer `entretien` APRÈS les états terminaux (négation « non retenu » toujours avant
  `accepte`). Rétro-compatible : un entretien à venir reste `entretien`. +4 tests → **444 tests** +
  smoke vert (`alternance`, `altStatusRefresh`). Correctness (§4.4), domaine Alternance.
  (`docs/recaps/446-alternance-statut-entretien.md`). ✅ _boucle #446._

- 💪 **Tonnage séance : compter les séances au format legacy `w.exercise`** (2.0.77) :
  `workoutTonnage` (`logic.js:5856`) alimentait à `0` toute la cascade tonnage (`lifetimeTonnage`
  💪 bilan à vie, `bestSessionTonnage`, `bestTonnageWeek`, `weeklyTonnageTrend`, graphe « Tonnage
  soulevé ») pour une séance legacy mono-exercice `w.exercise`. Le doute de #443 (« choix de
  design ? ») est **levé** : `lastExerciseSession` (`logic.js:4462`) et `exerciseHistoryStats` en
  calculent déjà le tonnage → la même vieille séance chiffrée pesait un tonnage dans la fiche
  exercice mais 0 kg dans le bilan à vie et les graphes (deux chiffres contradictoires). Correctif =
  repli legacy avant la réduction (aligné sur #440→#443), rétro-compatible. +2 tests (`workoutTonnage`
  legacy + `lifetimeTonnage` mix) → **444 tests** + check smoke `tonnage` étendu **et promu bloquant**
  (68 gardes). **Famille « repli legacy `w.exercise` » désormais entièrement close (#440→#444).**
  Correctness/robustesse (§4.4/§4.2), domaine Athlète. (`docs/recaps/444-workout-tonnage-legacy.md`).
  ✅ _boucle #444._

- 🏆 **Palmarès de force : compter les séances au format legacy `w.exercise`** (2.0.76) :
  `strengthRecords` (`logic.js:4502`) alimente le « 🏆 Palmarès de force » (`renderStrengthRecords`,
  `app.js:311`). Sa garde `!Array.isArray(w.exercises)` ignorait la forme legacy mono-exercice
  `w.exercise`, que sa sœur `personalRecords` (corrigée en #440) et toutes les autres du domaine
  gèrent → une meilleure série posée dans une vieille séance importée était **absente du palmarès**,
  alors que les records perso juste à côté la comptaient (deux compteurs contradictoires). Correctif =
  repli legacy avant la boucle (aligné sur #440), rétro-compatible. +1 test (legacy + mix legacy/
  moderne) → **443 tests** + check smoke `strengthRecords` étendu **et promu bloquant**. La famille
  « repli legacy » n'était donc PAS entièrement close (#440/#441 avaient laissé passer cette fonction).
  Correctness/robustesse (§4.4/§4.2), domaine Athlète. (`docs/recaps/443-strength-records-legacy.md`).
  ✅ _boucle #443._

- 🗓️ **Coach Poids « Ta semaine type » : semaine lundi-en-tête, dimanche en dernier** (2.0.75) :
  `coachWeekPlan` (`logic.js:5266`, rendu `app.js:266`) triait ses séances au comparateur brut
  (`a.weekday - b.weekday`, dimanche=0) → dès que le dimanche était coché dans les jours dispo, il
  remontait en tête de semaine, à rebours de la convention `(weekday+6)%7` de toute l'app
  (`runPlanWeek`, `objectiveProgram`, `scheduleCoachWeek`…). Souci d'affichage + de répartition ;
  la programmation agenda était déjà correcte. Correctif = helper `mon = w => (w+6)%7` pour les deux
  tris (`uniq` répartition + `sessions` affichage), rétro-compatible (jours 1-6 inchangés). +2 cas
  de test (dimanche dispo) + check smoke `coachWeek` étendu **et promu bloquant** (67 gardes). Piste
  #1 d'un audit frais de `logic.js`. Correctness/cohérence UX (§4.4), domaine Athlète.
  (`docs/recaps/442-coach-week-monday-first.md`). ✅ _boucle #442._

- 🎯 **Cible du jour : compter les séances au format legacy `w.exercise`** (2.0.74) :
  `progressionSuggestion` (`logic.js:6076`) alimente la « 🎯 Cible du jour » (séance guidée
  `app.js:337`, fiche exercice `app.js:305`/`663`). Sa garde `!Array.isArray(w.exercises)` ignorait
  la forme legacy mono-exercice `w.exercise`, que sa voisine `estimatedOneRmSeries` et toutes ses
  sœurs gèrent. Historique legacy chargé → aucune cible affichée (`null`) alors que les données
  existaient. Correctif = repli legacy avant la boucle (aligné sur #440). +2 cas de test + check
  smoke `progression` étendu **et promu bloquant** (66 gardes). Piste #4 (dernière) de la mémoire
  d'audit → **famille legacy/jours-distincts close** (#438→#441). Correctness/robustesse (§4.4/§4.2),
  domaine Athlète. (`docs/recaps/441-progression-suggestion-legacy.md`). ✅ _boucle #441._

- 🏆 **Records perso : compter les séances au format legacy `w.exercise`** (2.0.73) :
  `personalRecords` (`logic.js:4105`) alimente les toasts « 🎉 Nouveau record » (`newRecords` au
  save `app.js:641`), le bilan guidé et `liveSetRecord`. Sa garde `if (!Array.isArray(w.exercises))
  return` ignorait la forme legacy mono-exercice `w.exercise`, que TOUTES ses sœurs gèrent
  (`bestE1rmByExercise`, `workoutsTable`…). Un record all-time posé dans une vieille séance importée
  était **volé** → une charge inférieure au vrai record pouvait déclencher à tort « record battu ».
  Correctif = repli legacy avant la boucle (`exos = … : (w.exercise ? [{name,load,reps}] : [])`),
  rétro-compatible. +1 bloc de test (mix 2 séances legacy + 1 moderne → charge legacy comptée).
  Piste #3 de la mémoire d'audit (famille #425). Correctness/robustesse (§4.4/§4.2), domaine Athlète.
  (`docs/recaps/440-personal-records-legacy.md`). ✅ _boucle #440._


- 📈 **Tendance de forme : agréger des JOURS distincts, pas des saisies** (2.0.72) :
  `readinessTrend` (`logic.js:6280`) alimente le mini-graphe « Forme · N derniers check-ins » +
  flèche (`app.js:320`). Seule sœur asymétrique : filtrait/triait/`slice(-lim)` **sans dédup par
  date**, alors que `weeklySleepStats`/`sleepSeries`/`sleepRegularity`/`sleepDebtHours` dédupliquent
  toutes. L'écriture dédup pourtant déjà (`saveRecovery` `app.js:686` filtre la date avant `push`) →
  doublon possible seulement par import/restauration/legacy (porte #436/#437/#438). Sur une date en
  double : deux points pour un jour → `slice(-lim)` glissait sur des saisies, `delta`/`direction`/
  `latest` faussés. Correctif = dédup `Map` (dernier gagné) avant tri/slice, rétro-compatible. +2 cas
  de test + check smoke `readinessTrend` étendu **et promu bloquant** (442 tests). Piste #2 de la
  mémoire d'audit. Correctness/robustesse (§4.4/§4.2), domaine Athlète / Récupération.
  (`docs/recaps/439-readiness-trend-distinct-days.md`). ✅ _boucle #439._

- 🌱 **Pas du jour : le suivi compte des JOURS distincts, pas des saisies** (2.0.71) :
  `lifeStepStats` (`logic.js:1363`) alimente « 🌱 X jours d'affilée · doneDays/loggedDays · R % »
  (`app.js:454`). `streak` passe par `dailyStreak`, qui **déduplique par date** (`Set`) ; mais
  `doneDays`/`loggedDays`/`rate` comptaient les **entrées** (`.length`) — sur une date en double, le
  **même bandeau** affichait deux comptes contradictoires (série = jours distincts, « X/Y » = saisies).
  `logLifeStep` déduplique pourtant à l'écriture, mais `lifeStepLog` n'est **pas** normalisé (import/
  restauration → doublon possible, même porte que #428/#431/#436/#437). Correctif = dédup par date
  (Map, dernier gagné, cohérent avec `logLifeStep`), rétro-compatible. +2 cas de test (date en double
  → doneDays/loggedDays comptent des jours) + check smoke `lifeStep` étendu **et promu bloquant** (442
  tests). Jumeau direct de #437 (piste #1 de l'audit mémorisé). Correctness/robustesse (§4.4/§4.2),
  domaine Objectifs de vie / RPG. (`docs/recaps/438-life-step-stats-distinct-days.md`). ✅ _boucle #438._

- 🏅 **Journées parfaites (quêtes) : compter des JOURS distincts, pas des saisies** (2.0.70) :
  `questPerfectStreak` (`logic.js:1411`) alimente « 🏅 X journées parfaites d'affilée · Y/Z jours · R % »
  (`app.js:488`). `streak` passe par `dailyStreak`, qui **déduplique par date** (`Set`) ; mais
  `perfectDays`/`loggedDays`/`rate` comptaient les **entrées** (`.length`) — sur une date en double, le
  **même bandeau** affichait deux comptes contradictoires (série = jours distincts, « Y/Z » = saisies).
  `logQuestDay` déduplique pourtant à l'écriture, mais `questLog` n'est **pas** normalisé (import/
  restauration → doublon possible, même porte que #428/#431/#436). Correctif = dédup par date (Map,
  dernier gagné, cohérent avec `logQuestDay`), rétro-compatible (sans doublon : identique). +2 cas de
  test (date en double → perfectDays/loggedDays comptent des jours) + check smoke `questStreak` étendu
  **et promu bloquant** (442 tests). Correctness/robustesse (§4.4/§4.2), domaine Quêtes / RPG.
  (`docs/recaps/437-quest-perfect-streak-distinct-days.md`). ✅ _boucle #437._

- 📊 **Adhérence hebdo : compter des JOURS distincts, pas des saisies** (2.0.69) :
  `weeklyAdherence` (`logic.js:5327`) comptait les lignes « Protéines à la cible (X **j**) » et
  « Hydratation (X j) » par `.length` sur les **entrées**, alors que le libellé dit « j » et que le
  seuil est `minProteinDays`/`minWaterDays` (des **jours**). Une date en double (import/restauration/
  legacy, ou `bumpWater`/`bumpProtein` d'`app.js`) comptait double : « Hydratation (3 j) » pouvait
  s'afficher pour **2 vrais jours** et l'objectif se validait à tort ; `sleepAvg` moyennait aussi les
  entrées, pas les nuits distinctes. Le panneau **Nutrition** dédupliquait pourtant déjà par date
  (`daysHittingTarget`/`proteinDaysOnTarget`), tout comme `weeklySleepStats`/`sleepDebtHours` pour le
  sommeil : `weeklyAdherence` était le **seul asymétrique** (deux nombres « j » contradictoires).
  Correctif = **délégation aux sœurs déjà testées** + dédup sommeil par date (garde `v > 0`), zéro
  choix de design, rétro-compatible. +bloc pur `weeklyAdherence` (date en double → 2 j) + check smoke
  `coachAdherence` étendu **et promu bloquant** (442 tests). Correctness/robustesse (§4.4/§4.2),
  domaines Nutrition + Hydratation + Sommeil. (`docs/recaps/436-weekly-adherence-distinct-days.md`). ✅ _boucle #436._

- 🏋️ **Équilibre poussée/tirage : un exercice dos+épaules ne compte plus des deux côtés** (2.0.68) :
  `muscleBalance` (`logic.js:2427`) additionnait poussée (pecs+épaules) vs tirage (dos) par **deux `if`
  indépendants** — un exercice à la fois `back` ET `shoulders` (`Suspension barre`, `Marche fermier
  kettlebell`, seuls concernés de la bibliothèque) ajoutait ses séries **des deux côtés** : une séance
  de pur gainage dos/épaules ressortait « push/pull équilibré » (ratio 1) sans aucun pressing ni rowing,
  et `pushPullAdvice` disait « continue ». Correctif fondé sur la convention **déjà documentée** (« zone
  principale en premier », `logic.js:2345`) : chaque série comptée **une fois**, du côté de la 1re zone
  taguée (ici `back` → tirage). Zéro régression sur les exercices non ambigus. +3 assertions au test
  existant + check smoke `muscleBalance` étendu **et promu bloquant** (441 tests). Correctness/robustesse
  (§4.4/§4.2), domaine Force / Athlète. (`docs/recaps/435-muscle-balance-double-count.md`). ✅ _boucle #435._

- ♿ **Accessibilité : le bouton boussole « 🧭 » de « Ma semaine » a enfin un nom accessible** (2.0.67) :
  `#weekQuickEstimate` (`index.html:240`, estime le temps de trajet) n'affichait qu'une icône sans
  texte ni `aria-label` — sur l'iPhone d'Adrien, VoiceOver l'annonçait « boussole, bouton » sans dire
  à quoi il sert (le `title` n'est pas annoncé de façon fiable au tactile), alors que ses **deux
  jumeaux** faisant la même action affichent « 🧭 Estimer ». Audit complet des boutons : c'était le
  **seul** bouton icône-seule sans nom accessible (tous les autres, dont ceux générés par `app.js`,
  en avaient déjà un). `aria-label` ajouté, aligné sur le motif existant, **zéro changement visuel**.
  +check smoke `iconButtonsA11y` bloquant (441 tests). Accessibilité (§4.3), domaine Agenda / Ma semaine.
  (`docs/recaps/434-icon-button-aria-label.md`). ✅ _boucle #434._

- 🧘 **Records de série : une date impossible ne gonfle plus le record (bien-être & protéines)** (2.0.66) :
  `wellnessBestStreak` (`logic.js:3384`) et le `best` de `proteinStreak` (`logic.js:6201`) filtraient par
  la seule regex de format puis calculaient les écarts via `new Date(key + 'T12:00:00')` ; une date
  impossible (`2026-04-31`) **débordait** au 1er mai et fabriquait une paire consécutive **fantôme** qui
  gonflait le record — alors que la sœur affichée à côté (`wellnessStreak` / `current`, walk-based)
  l'ignorait déjà (contradiction). Même classe que #431/#432, réel sur import/restauration (pas de
  `normalizeState` sur `wellnessDone`/`nutrition`). Nouveau helper `isRealDateKey` (aller-retour `new Date`,
  rejette aussi 29/02 non bissextile) appliqué aux deux filtres → date impossible ignorée partout,
  rétro-compatible. +bloc pur `isRealDateKey` + 2 blocs étendus + 2 checks smoke bloquants (441 tests).
  Robustesse/correctness (§4.2/§4.4), domaines Bien-être + Nutrition.
  (`docs/recaps/433-real-date-key-streak-records.md`). ✅ _boucle #433._

- 🎂 **Anniversaires : une date impossible ne crée plus d'anniversaire « fantôme »** (2.0.65) :
  `normalizeBirthday` (`logic.js:390`) validait `day` (1–31) et `month` (1–12) **indépendamment** ;
  une date impossible mais aux champs individuellement valides (ex. 31 févr.) survivait, puis
  `upcomingBirthdays` la faisait **déborder** au 3 mars via `new Date` et l'annonçait « à venir » —
  alors que sa sœur `birthdaysForDay` ne la matchait **jamais** (deux fonctions incohérentes).
  Non saisissable via l'UI (`<input type="date">`), mais réel sur import/restauration/legacy (comme
  #431). Jour désormais borné au max RÉEL du mois (févr. = 29 pour préserver le 29/02, fêté le 1er
  mars les années non bissextiles) → date impossible ignorée partout, rétro-compatible. +2 blocs de
  tests purs + check smoke `birthdays` étendu bloquant (440 tests). Robustesse/correctness (§4.1/§4.2),
  domaine Anniversaires. (`docs/recaps/432-birthday-impossible-date.md`). ✅ _boucle #432._

- 😴 **Sommeil : la dette ne perd plus une vraie nuit sur une date à double saisie** (2.0.64) :
  `sleepDebtHours` (`logic.js:6286`) écrivait son index `byDate` **inconditionnellement**, seule
  asymétrique face à ses 4 sœurs (`weeklySleepStats`/`sleepSeries`/`sleepRegularity`/`bedtimeRegularity`,
  toutes gardées par `if (v > 0)`). Deux check-ins de même date — nuit chiffrée le matin + « coucher seul »
  (`sleep:0`) le soir — et l'entrée à 0, si elle vient après, écrasait la vraie nuit, qui disparaissait
  ensuite du filtre `s > 0` : dette sous-estimée, `nights`/`avg` faussés (réel sur legacy/import/restauration).
  Garde `if (v > 0)` ajoutée → symétrie retrouvée, rétro-compatible. Referme la piste ouverte par #430.
  +2 blocs de tests purs (2 ordres) + check smoke `sleepDebt` étendu bloquant (439 tests).
  Robustesse/correctness (§4.2/§4.4), domaine Sommeil.
  (`docs/recaps/431-sleep-debt-same-date-guard.md`). ✅ _boucle #431._

- 🔁 **Calendrier : re-synchroniser un abonnement ne réinitialise plus les récurrents** (2.0.63) :
  `applyImportedIcs` (`app.js:854`) reconstruisait chaque événement **récurrent** à neuf à chaque re-sync
  (`syncCalendarSubs`), au lieu d'emprunter le mécanisme préservateur des ponctuels (`mergePlannedEvents`) :
  `doneLog`/`skipLog` repassaient à `[]`, la pause sautait, l'`id` changeait — cases cochées et jours sautés
  perdus à chaque synchro. Nouvelle fonction pure sœur `mergeRecurring` (`logic.js`) : un récurrent connu
  (même `refId`) garde `id`/`doneLog`/`skipLog`/`paused` ; seuls titre, heure, type et règle (le calendrier
  fait foi) sont rafraîchis. +2 blocs de tests purs + check smoke `icsRecurringMerge` bloquant (439 tests).
  Robustesse / idempotence des fusions (§4.2), domaine Calendrier/ICS.
  (`docs/recaps/430-recurring-resync-preserve.md`). ✅ _boucle #430._

- 💼 **Alternance : une cible « à postuler » datée n'est plus comptée comme envoyée** (2.0.62) :
  `applicationStats` (`logic.js:202`) calculait `sent` (candidatures envoyées) par la **seule présence
  d'une date** (`logic.js:210`), sans tester le statut. Or l'import CSV (`parseApplicationsCsv`) crée des
  lignes `a_postuler` **datées** (deadline/repérage) : elles gonflaient à tort la série (`🔥`), « postulé
  aujourd'hui ✓ », le compteur hebdo et l'ancienneté — alors que `byStatus.postule` restait à 0 (fonction
  incohérente avec elle-même). Le moteur de motivation ne compte désormais que les candidatures réellement
  envoyées (`status !== 'a_postuler'`). Module Alternance (sacré) fiabilisé, non cassé. +4 assertions pures
  + check smoke `alternance` étendu (437 tests). Cohérence/correctness (§4.4), domaine Alternance.
  (`docs/recaps/429-alternance-a-postuler-datee-non-envoyee.md`). ✅ _boucle #429._

- 🎖️ **Trophées : le badge « Cible atteinte » se fie au poids le plus récent** (2.0.61) :
  `computeAchievements` (`logic.js:5559`) lisait le poids courant comme le **dernier élément** du tableau
  (`weights[length-1]`) au lieu du plus récent par date — alors que la fonction sœur `weightGoalProgress`
  (`logic.js:5394`) et `app.js` trient déjà défensivement. Sur un tableau `weights` non trié (restauration
  de sauvegarde / import legacy), le badge `weight-goal` restait **verrouillé** alors que la dernière pesée
  touchait la cible (ou se débloquait à tort). Corrigé : pesée la plus récente par date, repli chaîne vide
  pour les entrées legacy sans date (tri stable → rétro-compatible). +3 assertions pures + check smoke
  `achievements` étendu (437 tests). Cohérence/correctness (§4.4), domaine achievements/RPG.
  (`docs/recaps/428-achievement-weight-goal-latest.md`). ✅ _boucle #428._

- 📊 **Habitudes : la régularité ne pénalise plus le jour courant pas encore fait** (2.0.60) :
  le panneau affiche côte à côte la série (`🔥`, `habitStreak`, tolère le jour en cours) et le badge de
  régularité (`📊 %`, `habitConsistency`, `logic.js:603`). `habitConsistency` comptait le jour courant
  prévu-mais-pas-encore-fait comme un **raté** → une habitude jeune parfaite affichait `🔥 4` **et**
  `📊 80 %` en pleine journée (contradictoire), 80 % identique à un vrai trou passé. La régularité tolère
  désormais le jour en cours **exactement comme la série** (`i===0 && !fait` non compté) ; un vrai jour
  manqué révolu compte toujours. +4 assertions pures + check smoke `habitConsistency` étendu (437 tests).
  Cohérence/correctness (§4.4), domaine habitudes. (`docs/recaps/427-habit-consistency-jour-courant.md`).
  ✅ _boucle #427._

- 🍽️ **Coach poids : la baisse calorique annoncée = la baisse réelle près du plancher** (2.0.59) :
  quand la perte stagne et que la cible est déjà proche du plancher (1200 kcal), `calorieAdjustment`
  (`logic.js:5472`) annonçait toujours « −125 kcal/jour » alors que « Nouvelle cible » ne pouvait pas
  descendre sous 1200 — baisse réelle parfois de **50 kcal** (conseil auto-contradictoire, `1250→1200`).
  Le montant annoncé (et `delta`) correspond désormais à la baisse **réelle** (`cut = min(125, dt−1200)`),
  et une fois au plancher le coach oriente vers le **cardio**. Cas à marge large et prise de poids
  inchangés. +1 check smoke bloquant `calorieFloor`. Robustesse (§4.2), domaine nutrition/poids.
  (`docs/recaps/426-calorie-adjustment-plancher.md`). ✅ _boucle #426._

- 🏋️ **Couverture : `bestE1rmByExercise` — formes legacy et garde-fous verrouillés** (tests seuls, pas de bump) :
  le meilleur 1RM estimé par exercice (`logic.js:3924`) sait lire la forme moderne `exercises[]/setLogs[]`
  **et** la forme legacy mono-exercice `w.exercise`+`load/reps` (encore présente dans d'anciennes séances),
  plus le repli `{load,reps}` sans setLogs. Le test existant n'exerçait que la forme moderne : legacy, repli
  sans setLogs, max de 1RM sur plusieurs séries, bornes de fenêtre et garde-fous (date mal formée, charge
  nulle, `exercises[]` vide→legacy, entrées hostiles) n'étaient **jamais** couverts. Nouveau test dédié figé
  après exécution sur le vrai code, valeurs dérivées de `estimate1RM` (le test suit la formule). +1 test (437).
  Domaine force/1RM, couverture (§4.1). (`docs/recaps/425-best-e1rm-legacy-coverage.md`). ✅ _boucle #425._

- 📅 **Agenda : un `.ics` récurrent « N fois » (COUNT) s'arrête enfin** (2.0.58) :
  à l'import ICS, `parseRRule` (`logic.js:878`) ne lisait pas `COUNT` (RFC 5545), la façon dont
  Google/Apple encodent une série **finie**. Le modèle n'a pas de compteur d'occurrences →
  `recurrenceMatches` ne s'arrête que sur `until` : une série `COUNT=4` récurrait **à l'infini**
  (vérifié : match encore en 2030). Correctif chirurgical (une seule fonction) : `COUNT` traduit en la
  borne `until` équivalente = date de la **N-ième occurrence**, simulée avec `recurrenceMatches`
  lui-même (cohérence exacte, mois sans le jour visé et 29 févr. compris) ; `UNTIL` explicite prime,
  repli sûr si non atteint. Tout l'aval gère déjà `until` (aucun autre point touché). +1 test (436) +
  check smoke bloquant `icsCount`. Domaine Agenda/import ICS, robustesse (§4.2).
  (`docs/recaps/424-ics-count-recurrence-finie.md`). ✅ _boucle #424._

- 🎂 **Anniversaires : l'âge accordé au singulier (« 1 an », plus « 1 ans »)** (2.0.57) :
  l'âge s'affiche à trois endroits, mais seul `todayItems` (`logic.js:1132`, « Ma journée ») l'accordait
  correctement ; le bandeau « 🎂 À venir » (`app.js:469`) et le calendrier mensuel (`app.js:474`) écrivaient
  **toujours** « ans » → un premier anniversaire (âge 1) donnait « (1 **ans**) ». Nouveau helper pur
  `ageLabel(age)` (0/1 → « an », ≥2 → « ans », âge inconnu → vide, tolère chaîne numérique) réutilisé aux
  **trois** points (DRY). Test pur + check smoke bloquant `ageLabel`. +1 test (435). Domaine
  Anniversaires/Agenda, polish UX (§4.4). (`docs/recaps/423-anniversaire-age-singulier.md`). ✅ _boucle #423._

- 🌅 **Couverture : `morningEnergyTrend` — tendance « à la hausse » et bornes verrouillées** (tests seuls, pas de bump) :
  la tendance d'énergie du matin (`logic.js:6182`) renvoie `dir` (`up`/`down`/`flat`) et `level`
  (`high`/`ok`/`low`). Le test existant n'exerçait que `down`+`low` et `flat`+`high` : le signal
  **positif `up`** et le niveau courant **`ok`** n'étaient jamais testés, ni les bornes exactes des
  seuils (delta ±0,3 vs 0,2 ; avg 3 vs 4), ni le clamp de fenêtre (2..60). Cinq cas figés après
  exécution sur le code réel (hausse+ok, bornes de `dir` et de `level`, `windowDays` 100→60 et 1→2).
  Aucun `logic.js` touché ; assertions ajoutées au `test()` existant → compte inchangé (434). Domaine
  humeur/énergie, couverture. (`docs/recaps/422-morning-energy-trend-coverage.md`). ✅ _boucle #422._

- 🌱 **Pas de vie : le « Dernier tenu » d'un pas passé enfin tronqué comme celui du jour** (2.0.56) :
  `lifeStepStats` (`logic.js:1293`) renvoie `lastDone`, affiché en « Dernier tenu : « … » » (`app.js:454`).
  Le texte du pas **du jour** était nettoyé (`trim`) puis tronqué à 140 caractères, mais le pas **passé**
  était renvoyé **brut** — un texte à rallonge d'un jour précédent s'affichait en entier et pouvait déborder
  la petite ligne. Aligné sur la même normalisation (`trim` + `slice(0,140)`) ; conservateur pour un texte
  court. +2 assertions au test existant, compte inchangé (434). Domaine journal/RPG, micro-fix d'affichage.
  (`docs/recaps/421-life-step-last-done-troncature.md`). ✅ _boucle #421._

- 🔁 **Couverture : `habitConsistency` — le plafond de fenêtre `days` verrouillé** (tests seuls, pas de bump) :
  le taux de régularité d'une habitude (`logic.js:594`) borne sa fenêtre par DEUX contraintes — le plafond
  `days` et la 1re date loggée. Le test existant ne couvrait que la seconde : dans chaque assertion, la 1re
  date tombait DANS la fenêtre, donc `days` n'était **jamais** ce qui arrêtait la boucle → une régression
  supprimant le plafond serait passée inaperçue. Trois cas figés après exécution sur le code réel : plafond
  `days` bornant (historique 21 j, `win=7` → 7 prévus, pas jusqu'à la 1re date), trou dans la fenêtre plafonnée
  (6/7 = 86 %), et jour prévu **manqué** sous `weekdays` (2/3 = 67 %, premier taux < 100 planifié). Aucun
  `logic.js` touché ; assertions ajoutées au `test()` existant → compte inchangé (434). Domaine Habitudes,
  couverture. (`docs/recaps/420-habit-consistency-window-cap.md`). ✅ _boucle #420._

- 💧 **Hydratation : repli sûr sur température non chiffrable + bornes verrouillées** (tests seuls, pas de bump) :
  `hydrationPlan` (`logic.js:2068`) retombait sur « Frais » — le plan **le moins hydratant** — dès que la
  température n'était pas un nombre (`undefined`/`NaN`/chaîne), mauvais sens pour un repli. Coercition d'une
  entrée non finie vers un temps tempéré (18 °C), sans toucher l'appelant ni dupliquer d'objet ; chemin
  aujourd'hui non atteignable depuis l'UI → **aucun effet utilisateur, pas de bump**. En prime, bornes exactes
  des seuils (15/25/30) jamais testées, désormais figées (off-by-one attrapé). Assertions ajoutées au test
  existant → compte inchangé (434). Domaine hydratation, robustesse + couverture. (`docs/recaps/419-hydration-plan-repli-sur.md`). ✅ _boucle #419._

- 🏃 **Plus longue sortie course : record jugé sur le km brut, pas sur l'arrondi** (2.0.55) :
  `trailReadiness` (`logic.js:5758`) stockait le record de plus longue sortie **déjà arrondi au
  dixième** puis comparait le km **brut** de la sortie suivante contre cette valeur arrondie. Deux
  sorties dans le même seau d'arrondi (12,34 vs 12,32 → 12,3) → la plus récente, pourtant plus courte,
  **volait le record** (mauvaise date). Corrigé en comparant le **brut** et en n'arrondissant qu'à
  l'affichage — même correctif que les records de séance (#406) et de semaine muscu (#408), appliqué
  cette fois à la course. +1 cas de test (collision d'arrondi), compte inchangé (434).
  (`docs/recaps/418-trail-readiness-record-brut.md`). ✅ _boucle #418._

- 🧪 **Couverture : `dayColumns`, coloration d'intervalles de la grille agenda** (tests seuls, pas de bump) :
  la répartition en colonnes des événements d'une journée (`logic.js:6561`) n'était testée que sur trois cas
  de base. Verrouillés en plus : **réutilisation de colonne** (3 événements peuvent tenir sur 2 colonnes quand
  un bloc démarre après la fin d'un autre), **préservation de l'ordre d'entrée** malgré un tri interne par
  `start`, **concurrence maximale** (3 chevauchements mutuels → 3 colonnes) et la **borne `end`** (`end ≤ start`
  → `start+1`, non numériques → `0`). Comportements figés après exécution sur le code réel (aucun `logic.js`
  touché : filet de non-régression). Assertions ajoutées au test existant → compte de tests inchangé (434).
  Domaine Agenda/grille, variété. (`docs/recaps/417-daycolumns-coverage.md`). ✅ _boucle #417._

- ⚖️ **Ajustement calorique — le plateau est détecté même en pesée quotidienne** (2.0.54) :
  `calorieAdjustment` (`logic.js:5435`) jugeait la stagnation de poids sur une fenêtre ancrée par
  **nombre** de pesées (`list.slice(-4)`), pas par **date**. Pour qui se pèse **tous les jours**, ces
  4 mesures ne couvraient que ~3 j → la garde `days >= 14` était toujours fausse → **le conseil de
  plateau ne se déclenchait jamais**, même après des semaines de poids plat. Corrigé en ancrant la
  borne basse sur la pesée la plus récente distante d'au moins 14 j — fenêtre calée sur les ~14
  derniers jours quelle que soit la fréquence, tout en restant récente. Cas clairsemés inchangés
  (l'ancre par date retombe sur la même pesée que `slice(-4)`). +1 cas de test (30 pesées quotidiennes
  en plateau, échec avant / succès après). Logique pure, module Nutrition/Poids, variété (fenêtre
  glissante mal bornée). (`docs/recaps/416-calorie-adjustment-fenetre-datee.md`). ✅ _boucle #416._

- 🧪 **Couverture : `haversineKm` & `travelModes`, cas limites du module Déplacements** (tests seuls, pas de bump) :
  bornes et replis muets jamais exercés — points identiques → `0` exact, coords en chaînes numériques,
  symétrie et `null` pour `haversineKm` ; plancher à 1 min, arrondi au dixième, distance négative → 0 et
  entrées non numériques pour `travelModes`. Comportements figés après exécution sur le code réel (aucun
  `logic.js` touché : filet de non-régression, pas un bug). Assertions ajoutées aux 2 tests existants →
  compte de tests inchangé. Atterri dans le commit #414 par course d'index d'une session concurrente
  (`[[autopilot-concurrent-sessions]]`). (`docs/recaps/415-geo-travel-coverage.md`). ✅ _boucle #415._

- 🗓️ **Import .ics — une date/heure calendairement impossible n'est plus importée** (2.0.53) :
  `parseIcsDateTime` (`logic.js:838`) lit une date iCalendar compacte (`YYYYMMDD[Thhmmss[Z]]`) à
  l'import de calendrier. Son motif capte chaque champ en `\d{2}` → il tolérait mois/jour hors bornes
  (`13`, `99`) et jours débordant leur mois (30 févr., 31 nov.). Seule la branche `Z` passait par
  `Date` (et **roulait** silencieusement une date invalide vers un autre jour) ; les branches journée
  entière/heure flottante renvoyaient `${Y}-${Mo}-${D}` **tel quel**. Un événement d'un `.ics` abîmé
  était donc stocké avec une date introuvable (« 2026-13-99 », orpheline de toute vue) ou glissé vers
  un jour faux — le **bug amont** que #393 ne neutralisait qu'en aval. Corrigé par aller-retour sur
  `Date` (idiome de `jobDateFromText` #411) + bornes d'heure → date/heure impossible = `null`, et
  `parseIcs` ignore alors l'événement. +2 blocs de tests (6 cas fautifs prouvés avant, 434 tests).
  Logique pure, zéro régression, variété (robustesse de parseur, domaine import calendrier).
  (`docs/recaps/414-parse-ics-datetime-calendrier-valide.md`). ✅ _boucle #414._

- 🌙 **Sommeil — le plan de recalage ne se contredit plus à l'arrivée** (2.0.52) :
  `sleepPlanDay` (`logic.js:6387`) fêtait « 🎉 Objectif atteint » (marge de tolérance ±15 min) tout en
  affichant, dans la même carte, une barre à 97 % et « arrivée estimée dans 1 jour » — car `progress`,
  `stepsLeft`, `daysLeft` et `arrivalKey` étaient calculés sur l'écart exact, sans la tolérance de
  `reached`. Un coucher 1-15 min après la cible (le cas de succès typique) déclenchait ces trois
  verdicts opposés. Corrigé en faisant de `reached` l'autorité : atteint ⇒ progression pleine, 0 pas
  restant, arrivée aujourd'hui ; hors « atteint », calcul strictement inchangé. +1 cas de test prouvant
  le bug (432 tests). Logique pure, module Sommeil fiabilisé, variété (cohérence interne d'un verdict).
  (`docs/recaps/413-sleep-plan-reached-coherence.md`). ✅ _boucle #413._

- ♿ **Accessibilité : deux menus déroulants de filtre annoncent enfin leur rôle** (2.0.51) :
  `#exerciseFamily` (filtre « famille » de la bibliothèque d'exercices, page Athlète) et `#suppKind`
  (sélecteur « Autour de ta séance » des compléments) n'avaient **aucun nom accessible** — ni `<label>`
  enveloppant, ni `aria-label`, ni `title` — alors que tous les autres `<select>` de la page sont bien
  labellisés (et que les deux **voisins immédiats** d'`exerciseFamily`, `exerciseEquipment` et
  `exerciseGoal`, portaient déjà un `title`). Un lecteur d'écran (VoiceOver iOS, NVDA) les annonçait
  « liste déroulante » sans dire à quoi ils servent. Ajout d'un `aria-label` explicite sur chacun +
  check smoke **bloquant** `filterSelectsA11y`. Aucun changement visuel. Rendu + a11y (§4.3), variété
  de type et de domaine. (`docs/recaps/412-a11y-filtres-select-nom-accessible.md`). ✅ _boucle #412._

- 💼 **Import Alternance : une date de calendrier inexistante n'est plus stockée** (2.0.50) :
  `jobDateFromText` (`logic.js:304`), partagée par tous les imports (saisie, `parseApplicationsCsv`,
  sync Google Sheets), ne validait que les bornes par champ (mois 1-12, jour 1-31) et pas la validité
  **calendaire**. Un « 30/02/2026 » ou « 31/11/2026 » (novembre a 30 jours) passait et était **stocké
  tel quel** puis affiché « postulé le 30/02/2026 » (`app.js:201`) — date inexistante que d'autres
  calculs reparsaient comme le 2 mars. Corrigé par un aller-retour sur `Date` (le rollover trahit un
  jour qui déborde le mois) ; le 29 février d'une année bissextile reste bien lu. +6 cas (4 fautifs
  prouvés avant, 432 tests). Logique pure, module sacré fiabilisé, variété (robustesse de parseur de
  date). (`docs/recaps/411-job-date-calendrier-valide.md`). ✅ _boucle #411._

- 🧪 **Couverture : `compareApplications`, dernière fonction pure non testée, verrouillée** (tests seuls, pas de bump) :
  un audit de couverture (357 exports croisés avec les tests) a révélé qu'une **seule** fonction pure exportée
  n'était jamais testée — `compareApplications` (`logic.js:169`), le comparateur qui **ordonne tout le suivi
  Alternance** — alors que son commentaire affirmait « Pur + testé ». Nouveau test de son contrat subtil : tri par
  étape du pipeline, puis **score décroissant pour « à postuler »** vs **date décroissante pour les autres étapes**
  (bascule jamais garantie jusqu'ici), départages, cohérence antisymétrique, et le chemin de production réel
  (`normalizeApplication`+`sort`). Le cas « statut inconnu » (indexOf −1) confirmé **non atteignable** au call-site
  (entrées toujours normalisées) → aucun correctif fabriqué. **432 tests + smoke** verts, zéro logique changée.
  (`docs/recaps/410-compare-applications-tests.md`). ✅ _boucle #410._

- 💼 **Alternance : « non retenu » (refus standard) n'est plus lu comme « accepté »** (2.0.49) :
  `jobStatusFromText` (`logic.js:284`), partagée par tous les imports Alternance (saisie,
  `parseApplicationsCsv`, sync Google Sheets), testait la règle `accepte` (sous-motif nu `retenu`)
  **avant** `refus` et ignorait la négation. La formulation la plus courante d'un refus —
  « Non retenu », « Candidature non retenue », « Pas retenu » — contient `retenu` et était donc
  classée `accepte` : un **refus importé en offre décrochée**, faussant le funnel, `applicationStats`
  (accepted, responseRate) et « Le focus du moment ». Corrigé par une règle de rejet nié
  (`\b(non|pas)\b[\s\S]{0,12}retenu` → `refus`) placée avant `accepte` ; « Retenu / embauché » reste
  bien `accepte`. +5 cas de statut (4 fautifs prouvés avant). Logique pure, module sacré fiabilisé
  sans rien casser, variété de domaine (parseur de statut). (`docs/recaps/409-job-status-non-retenu-refus.md`). ✅ _boucle #409._

- 🗓️ **Record hebdo de tonnage : l'égalité se juge sur le brut, pas l'arrondi** (2.0.48) :
  `bestTonnageWeek` (`logic.js:3759`) élit le record hebdomadaire de tonnage muscu (« à égalité, garde la
  plus récente »). Elle accumulait le tonnage brut par semaine mais **arrondissait avant de comparer** :
  deux semaines aux bruts distincts tombant dans le même seau d'arrondi (113,0 vs 112,5 → 113) étaient
  jugées à égalité, si bien que la plus récente (112,5, pourtant inférieure) volait le record à
  l'antérieure (113,0) → **mauvaise date affichée** et **« Record hebdo battu cette semaine ! » possible à
  tort** dans `renderTonnageTrend` (`app.js:498`). Jumeau exact de `bestSessionTonnage` (#406) — dont le
  recap affirmait à tort que cette sœur était déjà correcte. Corrigé en comparant sur le brut et
  n'arrondissant qu'à l'affichage. +1 cas prouvé fautif avant (431 tests). Logique pure, zéro régression,
  clôt la famille « égalité de tonnage jugée sur l'arrondi ». (`docs/recaps/408-best-tonnage-week-demi-kilo.md`). ✅ _boucle #408._

- 🎯 **Objectif suggéré à l'inscription : la catégorie OMS jugée sur l'IMC réel, pas l'arrondi** (2.0.47) :
  `suggestObjective` (`logic.js:2923`) propose un objectif physique à l'onboarding — sans poids cible,
  elle bascule sur l'IMC (≥25 → perte de gras, <18,5 → prise de muscle, sinon athlétique). Elle
  arrondissait l'IMC à 0,1 **puis** comparait cet affichage aux seuils OMS. Un IMC réel 24,98 (arrondi
  25,0) tombait à tort en « perte de gras » au lieu de « corps athlétique » (dans la norme) ;
  symétriquement 18,48 (arrondi 18,5) ratait « prise de muscle ». Même faute que `bmiInfo` (#400) et
  `weightTargetAdvice` (#403) documentent contre. Corrigé : catégorie jugée sur l'IMC réel (`rawBmi`),
  affichage arrondi inchangé. +2 cas de seuil prouvés fautifs avant (431 tests). Logique pure, zéro
  régression, dernier point de la famille « catégorie IMC jugée sur l'arrondi ».
  (`docs/recaps/407-suggest-objective-imc-reel.md`). ✅ _boucle #407._

- 🏆 **Record de séance : l'égalité de tonnage se juge sur le brut, pas l'arrondi** (2.0.46) :
  `bestSessionTonnage` (`logic.js:3739`) stockait le tonnage record **déjà arrondi** puis comparait la
  valeur **brute** de la séance suivante à cet arrondi. Les tonnages en demi-kilo étant la norme
  (charge 12,5 / 7,5 kg × reps impaires), une séance à `187,5` — arrondie à `188` — n'était plus jamais
  `=== 188` : à égalité de record, la séance récente était rejetée → **mauvaise date affichée** et
  **« Nouveau record séance !` manqué** dans `renderTonnageTrend` (`app.js:498`). La sœur
  `bestTonnageWeek` arrondit, elle, les deux côtés. Corrigé en gardant le tonnage brut pour la
  comparaison et en n'arrondissant qu'à l'affichage (séparation jugé/affiché, comme #400/#403).
  +1 cas prouvé fautif avant (431 tests). Logique pure, zéro régression. (`docs/recaps/406-best-session-tonnage-demi-kilo.md`). ✅ _boucle #406._

- 🔔 **Badge PWA : une séance de sport terminée n'est plus comptée « en attente »** (2.0.45) :
  `pendingBadgeCount` (`logic.js:2833`) alimente la pastille de l'icône PWA (`setAppBadge` via
  `app.js:580`). La moitié « quêtes » excluait bien les items faits (`!q.done`), mais la moitié
  « sport » comptait **toute** séance du jour, terminée ou non — alors que `completed` est un champ
  normalisé réel (`normalizeAgendaItem`) et que la sœur `sportToday` (`logic.js:96`) filtre bien
  `!a.completed`. Après avoir **fait** sa séance planifiée, l'utilisateur voyait la pastille rester
  allumée comme s'il restait une action, jusqu'au lendemain. Filtre `!a.completed` ajouté (aligné sur
  `sportToday`). +1 cas prouvé fautif avant (431 tests). Logique pure, zéro régression, variation de
  domaine (badge/notifications). (`docs/recaps/405-pending-badge-completed-session.md`). ✅ _boucle #405._

- 🏃 **Paliers de course : le premier palier n'est plus écrasé** (2.0.44) : `intermediateGoals`
  (`logic.js:1526`) centrait chaque palier sur l'échelle des distances avec `Math.round`, un cran trop
  haut. Dès que peu de paliers étaient possibles (marathon ~38 sem → `rungs=[10 km, semi]`, `count=2`),
  les deux paliers tombaient sur le même index et le dédoublonnage final en supprimait un → le palier
  **10 km était perdu**, l'utilisateur ne voyait que le semi dans `#raceGoalMilestones` (`app.js:456`).
  Corrigé en `Math.floor` (centre de segment correct), qui redonne la progression complète et croissante.
  +1 cas prouvé fautif avant (431 tests) ; le cas ultra existant, tombant pile sur des entiers, reste
  identique. Logique pure, zéro régression. (`docs/recaps/404-intermediate-goals-palier-perdu.md`). ✅ _boucle #404._

- ⚖️ **Conseil poids cible : la catégorie OMS jugée sur l'IMC réel, pas l'arrondi** (2.0.43) :
  frère resté à la traîne du #400. `weightTargetAdvice` (`logic.js:4960`) arrondissait l'IMC de la
  cible **puis** comparait cette valeur affichée aux seuils OMS. Une cible à IMC réel 18,46 (affichée
  18,5) tombait en `warn` « cible très basse » au lieu du `stop` « insuffisance pondérale —
  professionnel de santé » (`18,5 < 18,5` faux) ; symétriquement 27,03 (affichée 27,0) ratait
  l'avertissement « cible reste haute ». `weightTargetAdvice` alimente le coach poids/nutrition
  (`app.js`, `#coachTargetAdvice`) → alerte santé manquée pile au seuil. Catégorie désormais jugée
  sur l'IMC réel (`rawBmi`), affichage arrondi (`targetBmi`) inchangé. +2 assertions de seuil
  prouvées fautives avant (431 tests). Logique pure, zéro régression, dernier point de la famille
  « catégorie IMC jugée sur l'arrondi ». (`docs/recaps/403-weight-target-advice-imc-reel.md`). ✅ _boucle #403._

- 🏋️ **Progression : à date égale, la référence est la meilleure série, pas la dernière loguée** (2.0.42) :
  `progressionSuggestion` (`logic.js:5894`) retenait, à date égale, la **dernière** entrée itérée
  (`w.date >= best.date`) au lieu de la **meilleure série** — alors que l'idiome des `setLogs` juste
  au-dessus et le test s3 disent « meilleure série retenue ». Deux séances le même jour pour un même
  exercice (vraie séance lourde `100×5` puis finisher léger `40×15` logué après) → référence `40×15`
  au lieu de `100×5`, donc « Cible du jour » (`app.js:305`/`:337`) calculée sur une charge trop basse.
  Départage désormais l'égalité de date par la meilleure série (même comparaison que les `setLogs`),
  alignant l'outlier sur `estimatedOneRmSeries` qui agrège déjà par `Math.max`. +1 cas prouvé fautif
  avant (431 tests). Logique pure, zéro régression. (`docs/recaps/402-progression-tie-break-meilleure-serie.md`). ✅ _boucle #402._

- 🧘 **Coach récupération : la routine contextuelle lit enfin la séance la plus récente** (2.0.41) :
  `contextualWellnessRoutine` (`logic.js:3224`) suggère une routine ciblée selon la dernière séance
  (course → chevilles, jambes → hanches, haut du corps → épaules, gainage → bas du dos). Elle lisait
  `workouts[workouts.length - 1]` — mais le stockage est **newest-first** (`app.js:641` fait
  `unshift`), donc c'était la **toute première séance jamais loggée**. Dès qu'Adrien a plus d'une
  séance, elle était presque toujours à `> 1 j` → conseil ciblé **jamais** déclenché, repli
  systématique sur la mobilité générique (feature morte). Corrigé : on prend la séance de **date la
  plus récente** (`reduce`), robuste à l'ordre du tableau. +2 assertions (cas multi-séances prouvé
  fautif avant : `'hips'` au lieu de `'ankles'`). Logique pure, zéro régression, 431 tests.
  (`docs/recaps/401-contextual-wellness-last-workout.md`). ✅ _boucle #401._

- ⚖️ **IMC : la catégorie OMS jugée sur l'IMC réel, pas la valeur arrondie** (2.0.40) : `bmiInfo`
  (`logic.js:4354`) arrondissait l'IMC à une décimale **puis** en déduisait la catégorie OMS à partir
  de cette valeur affichée. Un IMC réel 18,478 arrondissait à 18,5 → classé « corpulence normale »
  au lieu de « maigreur » ; symétriquement 24,954 → 25,0 basculait en « surpoids ». `bmiInfo` alimente
  le rendu du coach nutrition/poids (`app.js:265`) → catégorie fausse au seuil, incohérente avec le
  chiffre affiché lui-même, pour une app santé. Catégorie désormais jugée sur l'IMC réel (`raw`),
  affichage arrondi inchangé. +2 assertions prouvées fautives avant (bloc `bmiInfo`, 431 tests).
  Logique pure, zéro régression. (`docs/recaps/400-bmi-categorie-imc-reel.md`). ✅ _boucle #400._

- 🌙 **Bilan hebdo : le sommeil moyen ne compte plus les nuits « 0 h »** (2.0.39) : `weeklySummary`
  divisait la somme des durées de sommeil par le nombre de check-ins récup, pas par le nombre de
  nuits **réellement chiffrées**. Un check-in où l'on note seulement fatigue/courbatures (ou juste
  son coucher) enregistre `sleep:0` (`Number(input.value) || 0`) → moyennée comme une nuit de 0 h.
  Deux nuits à 8 h + une sans durée saisie donnaient 5,3 h au lieu de 8 h — faussant le PDF hebdo,
  le bilan partagé, et déclenchant un **faux** nudge « sommeil moyen bas ». Toutes les sœurs
  (`monthlyRecap`, `weeklySleepStats`, `sleepDebtHours`…) filtraient déjà `sleep > 0` ;
  `weeklySummary` était le seul outlier. Filtre aligné, +1 test prouvé fautif avant (430 → 431).
  Logique pure, zéro régression. (`docs/recaps/399-weekly-summary-sleep-avg.md`). ✅ _boucle #399._

- 🛡️ **Robustesse : to-do et récurrence bornent enfin leur date** (2.0.38) : la boucle #393 avait
  borné la date de `normalizeAgendaItem` (mois 1-12, jour 1-31) « comme normalizeTodo/normalizeRecurring »
  — sauf que ces deux sœurs ne validaient que le **format**, pas les bornes. Une date impossible
  (`2026-13-99`, d'un backup abîmé/édité) y passait : côté **to-do** elle orphelinait la tâche
  (invisible dans `todosForDay`, `t.date > tout jour réel`), côté **récurrence** pire encore
  (`new Date(2026,12,99)` déborde vers un jour réel FAUX → mauvaises occurrences). Idiome de #393
  extrait en helper partagé `isBoundedDateKey` et appliqué aux **3** normalizers — ce qui **retire**
  la duplication au lieu d'en ajouter. +1 bloc de tests (429 → 430) + assertions. Logique pure, zéro
  régression, promesse du test #393 enfin tenue. (`docs/recaps/398-normalize-todo-recurring-date-bornee.md`). ✅ _boucle #398._

- ♿ **A11y : la case du bip de fin de repos enfin nommée** (2.0.37) : dans la séance guidée, la
  checkbox 🔔 (bip sonore à la fin du repos) n'avait pour nom accessible que l'emoji — un lecteur
  d'écran annonçait « cloche, case à cocher ». Le `title` était posé sur le `<label>`, pas sur le
  control, donc jamais utilisé comme nom. `aria-label="Bip sonore à la fin du repos"` ajouté **sur
  l'input** ; annoncé correctement désormais. Seul trou a11y icône-seule restant (balayage exhaustif
  index.html + app.js). Nouveau check smoke **bloquant** `restSoundA11y`. Zéro changement visuel,
  variation de type après une série robustesse/polish. (`docs/recaps/397-rest-sound-toggle-aria-label.md`). ✅ _boucle #397._

- ✍️ **Polish : « révision validée » au singulier dans les bilans partagés** (2.0.36) : les textes
  partageables (Web Share) des bilans hebdo (`weeklySummaryText`) et mensuel (`monthlyRecapText`)
  codaient « révisions validées » en dur au pluriel, alors qu'ils accordent tout le reste de leurs
  lignes (séance, candidature, jour actif…). Une semaine/mois avec **une seule révision planifiée**
  exportait donc « 0/1 révisions validées » au lieu du singulier correct. Accord désormais sur le
  total planifié (`studyPlanned`) ; pluriel ≥ 2 inchangé. +2 assertions (cas `studyPlanned === 1`,
  prouvés fautifs avant). Logique pure, zéro nouveau rendu. (`docs/recaps/396-accord-revision-validee-bilan.md`). ✅ _boucle #396._

- 🔎 **Recherche d'agenda insensible aux accents** (2.0.35) : `agendaMatch` (barre de recherche
  libre de l'agenda, câblée à la vue semaine et à la vue jour) repliait la casse mais pas les
  accents. Dans une app FR, taper « kine » / « reunion » / « chateau » (sans accent, réflexe
  courant) ne retrouvait pas « Kiné » / « Réunion » / « Château ». Correctif : réutilisation de
  l'idiome de repli d'accents déjà présent 6× ailleurs dans `logic.js`
  (`normalize('NFD').replace(/[̀-ͯ]/g,'')`) sur requête **et** foin — on élargit ce qui matche
  sans jamais rétrécir (« kiné » avec accent fonctionne toujours). +4 assertions (bloc
  `agendaMatch` existant, 3 échouaient avant) + check smoke `agendaSearch` renforcé (exécute
  désormais des cas accentués). Logique pure, zéro régression.
  (`docs/recaps/395-agenda-search-accents.md`). ✅ _boucle #395._

- ✍️ **Polish : deux accords pluriels fautifs corrigés au singulier** (2.0.34) : un tout premier
  anniversaire s'affiche désormais « (1 an) » et non « (1 ans) » dans « Ma journée » (`todayItems`),
  et le partage de progression sur les blocs de muscu écrit « 1 séance » plutôt que « 1 séances »
  quand un bloc n'en compte qu'une (`blockProgressText`). Deux « s » codés en dur qui échappaient à
  la règle française (`n > 1 ? 's'`) appliquée partout ailleurs. +2 assertions dans des tests
  existants (cas `age === 1` / `sessions === 1`, tous deux prouvés fautifs avant correctif). Logique
  pure, zéro nouveau rendu, zéro régression. (`docs/recaps/394-accords-pluriels-1an-1seance.md`). ✅ _boucle #394._

- 🗓️ **Robustesse : `normalizeAgendaItem` valide enfin la date et l'heure d'un événement** (2.0.33) :
  seul normalizer à ne jamais vérifier le format de `date`/`time` (ses sœurs `normalizeTodo` /
  `normalizeRecurring` le font depuis longtemps), il laissait passer une date **format-valide mais
  impossible** (`2026-13-99`, issue d'un `.ics` abîmé via `parseIcsDateTime` → `applyImportedIcs`) ou
  une heure incohérente (`99:99`) — stockées dans l'agenda mais orphelines de toute vue. La date est
  désormais **bornée** (mois 1-12, jour 1-31, comme `jobDateFromText`) et l'heure validée `HH:MM` ;
  toute valeur invalide est neutralisée (`''`), défense en profondeur incluse contre le bug amont de
  `parseIcsDateTime`. Aucune saisie normale n'est affectée. +1 test (428 → 429).
  (`docs/recaps/393-normalize-agenda-date-time.md`). ✅ _boucle #393._

- 🌙 **Demande d'Adrien : l'onglet Sommeil, étape 2/2** (2.0.32) : le « Bilan sommeil » juge
  désormais la régularité par l'heure de **coucher** (dès 3 nuits renseignées) plutôt que par la
  durée de nuit — le signal qui compte vraiment pour un rythme circadien. Un coucher fixe chaque
  soir avec une durée qui varie n'est **pas** un problème de rythme (juste un manque de sommeil,
  ancien bilan le classait pourtant « urgent ») ; à l'inverse une durée stable avec un coucher qui
  saute d'une heure à l'autre **est** le vrai problème (ancien bilan disait « régulier », signal
  manqué). Nouvelle fonction pure `bedtimeRegularity`, repli sur l'ancien calcul par durée si pas
  assez de couchers saisis. +2 tests, +1 check smoke bloquant (`sleepBedtimeRegularity`). Zéro
  nouvelle saisie, zéro suppression, zéro régression. (`docs/recaps/392-sleep-bedtime-regularity.md`). ✅ _boucle #392._

- 💼 **Demande d'Adrien : le statut « postulé »/« refusé » (abandonné) de l'onglet Alternance est
  pris en compte de façon fiable** (2.0.31, étape 1/2 de la demande — `docs/DEMANDES.md`) : deux bugs
  corrigés. `mergeApplications` ne protégeait qu'une régression vers « à postuler » — une
  synchronisation Google Sheets en retard pouvait écraser un statut plus avancé (ex. « postulé »
  remis à « à contacter ») ; la protection est généralisée à tout le pipeline (rang dans
  `JOB_STATUSES`, seule une vraie progression s'applique). Et le menu déroulant de statut ne
  rafraîchissait pas la carte « Le focus du moment » tout de suite (seul le bouton dédié « J'ai
  postulé » le faisait) — corrigé. +2 tests, +1 check smoke bloquant (`altStatusRefresh`). Zéro
  suppression, zéro régression. (`docs/recaps/391-alternance-refresh-statut.md`). ✅ _boucle #391._

- 💼 **Robustesse : `parseCsv` ne laisse plus de `\r` parasite dans une cellule multi-ligne** (2.0.30) :
  le retour chariot était ignoré hors guillemets mais **conservé à l'intérieur** d'un champ entre
  guillemets — si bien qu'une cellule sur plusieurs lignes encodée en **CRLF** (RFC 4180, Excel,
  copier-coller de tableur, que l'import manuel accepte) ressortait avec un `\r` invisible dans la
  valeur, stocké tel quel dans la note d'une candidature (chemin alternance). Le `\r` isolé est
  désormais ignoré **dans les deux contextes** (le vrai `\n` interne reste) : la donnée importée est
  plus propre, aucune entrée bien formée n'est affectée. +1 test (424 → 425). Même famille que le
  durcissement d'import #386. **Variation de type** (robustesse). (`docs/recaps/390-parsecsv-cr-multiligne.md`). ✅ _boucle #390._

- 🧪 **Couverture : `priorityRank`** (sans bump — tests seuls) : un balayage exhaustif des 355
  fonctions `function` de `logic.js` n'en laissait plus **qu'une** sans aucun test direct — le
  helper `priorityRank`, pourtant clé de tri de l'agenda ET des to-do. **+2 blocs** (422 → 424)
  verrouillent son contrat : rang aligné sur `AGENDA_PRIORITIES` (prouvé contre la constante), et
  surtout l'invariant subtil « **priorité inconnue → rang de `normal`** » (repli au milieu, jamais
  reléguée en bas comme une `low`), testé sur des entrées hostiles (casse, non-string, `NaN`,
  objets). Désormais **toutes les fonctions pures ont au moins un test**. Zéro changement de
  comportement. (`docs/recaps/389-priority-rank-couverture.md`). ✅ _boucle #389._


- ♿ **Accessibilité : aria-label sur les flèches de navigation du calendrier** (2.0.29) : les 4
  boutons `←`/`→` (précédent/suivant en vue mois et vue semaine) n'avaient **que le glyphe** comme
  contenu — un lecteur d'écran annonçait « flèche gauche » sans contexte, seul trou restant dans la
  convention déjà appliquée à `backToTop`, au stepper de poids et aux 8 `×` des dialogues. Ajout de
  `aria-label` **+** `title` (« Mois précédent »… « Semaine suivante ») + nouveau check smoke
  **bloquant** `navArrowsA11y` qui verrouille la convention. Zéro changement visuel. **Variation de
  type** (accessibilité) après trois boucles de couverture. (`docs/recaps/388-fleches-nav-aria-label.md`). ✅ _boucle #388._

- 🧪 **Couverture : `mealMacro`** (sans bump — tests + export) : la brique atomique qui met les
  macros d'un aliment à l'échelle de la portion (valeurs pour 100 g → portion réelle), appelée à
  chaque assiette par `generateMeals`, était la **seule fonction pure de `logic.js` sans aucune
  référence dans les tests** — et pas même exportée. **+3 blocs** (419 → 422) verrouillent son
  contrat : mise à l'échelle par 100 g + arrondi, **proportionnalité** (doubler la portion double
  kcal/protéines), et **garde anti-NaN** (champ manquant ou `null` → 0, jamais un `NaN` qui
  polluerait le total du repas). Domaine varié (nutrition) après plusieurs itérations calendrier/ICS.
  Zéro changement de comportement. (`docs/recaps/387-meal-macro-couverture.md`). ✅ _boucle #387._
- 🧪 **Couverture : `icsEscape` + aller-retour ICS** (sans bump — tests seuls) : l'échappement des
  valeurs TEXT iCalendar à l'**export** `.ics` (via `buildIcs`) était la dernière fonction pure
  substantielle de ce chemin sans test direct — complément de l'import couvert en #381/#385. Fonction
  **ordre-dépendante** (backslash échappé en premier, sinon double échappement) : rien ne gardait cet
  ordre contre un futur refactor. **+3 blocs** (416 → 419) : chaque spécial isolé + deux-points intact
  + bornes ; preuve directe de l'ordre (entrée `\,` → 4 caractères, pas 5) ; **invariant
  `unescapeIcs(icsEscape(x)) === x`** sur des chaînes piégeuses (dont le backslash+« n » du bug #381) —
  le contrat du workflow réel « exporter l'agenda puis le ré-importer ». Zéro changement de
  comportement. (`docs/recaps/386-ics-escape-couverture.md`). ✅ _boucle #386._
- 🧪 **Couverture : `parseIcsDateTime`** (sans bump — tests + export) : le cœur du parsing des dates
  iCalendar à l'import `.ics` (journée entière / heure flottante / instant UTC avec conversion en
  heure locale, `ms` sortable) était la seule fonction pure substantielle ni exportée ni testée.
  Exportée + **+4 blocs de tests** (412 → 416), cas limites réels (fuseaux, secondes optionnelles,
  format compact, invalides), assertions **portables** (le cas `Z` dérive l'attendu du même instant).
  Aucun changement de comportement. (`docs/recaps/385-parse-ics-datetime-couverture.md`). ✅ _boucle #385._
- 🎂 **Anniversaires du 29 février fêtés les bonnes années** (2.0.28) : une personne née un 29 février
  **disparaissait du calendrier** les années non bissextiles (`birthdaysForDay` ne matchait que le
  29/02), et la liste « À venir » affichait une **date impossible** (`2027-02-29`) alors que
  `daysUntil` était, lui, calculé pour le 1er mars via le rollover JS. Convention désormais cohérente
  dans les deux fonctions : **29 févr. → 1er mars** les années non bissextiles (29 févr. les
  bissextiles) ; `upcomingBirthdays` dérive `date` de l'occurrence réelle → plus de date fantôme.
  Cas nominaux inchangés, règles séculaires couvertes (2000 vs 2100). +2 blocs de tests.
  (`docs/recaps/384-anniversaire-29-fevrier.md`). ✅ _boucle #384._
- 📲 **Aide d'installation reconnue sur iPad** (2.0.27) : `isIosInstallable` n'affichait jamais le
  rappel « Ajoute l'app à l'écran d'accueil » sur iPad — depuis iPadOS 13, Safari annonce un UA
  « Macintosh » (sans « iPad »), qui échouait au test. On reconnaît désormais l'iPad à son écran
  tactile (`maxTouchPoints > 1`) ; un vrai Mac de bureau (0) n'est pas affecté, appels hérités
  rétrocompatibles. Fonction (prétendue « testée », en fait sans test) couverte + check smoke
  bloquant `iosInstallHint` (`docs/recaps/383-ipad-install-hint.md`). ✅ _boucle #383._
- 💼 **Import alternance : date de candidature bornée** (2.0.26) : `jobDateFromText` (extraction de
  date à l'import CSV + sync Google Sheets, jusque-là non testée) recrachait toute date plausible —
  une cellule aberrante (`13/45/2026`, `2026-25-99`) stockait une **date fantôme** qui faussait le
  tri du suivi. Bornée mois 1-12 / jour 1-31 (aberrant → `''`), avec fallback ISO→FR ; cas nominaux
  strictement inchangés. Fonction couverte + `parseCsv` (fondation de la sync) testé. Chemin
  Alternance sacré durci sans rien casser (`docs/recaps/382-job-date-bornee.md`). ✅ _boucle #382._
- 📅 **Robustesse import ICS : déséchappement corrigé** (2.0.25) : `unescapeIcs` (import `.ics`,
  jusque-là non testé) faisait des `.replace()` séquentiels — un titre d'événement avec un vrai
  `\n` (backslash + lettre n, ex. un chemin de fichier) ajoutait un retour à la ligne parasite.
  Réécrit en une passe unique atomique (bug prouvé par test) ; fonction exportée + testée. Aucun
  autre cas (`\,`, `\;`, `\\`) affecté. ✅ _boucle #381._
- 😴 **Coach sommeil COMPLET (4/4) : bilan → capture → plan de recalage → coach RPG** (2.0.21-2.0.24, demande d'Adrien — `docs/recaps/380-systeme-sommeil.md`) : système sommeil bout en bout pour ramener Adrien d'un endormissement ~6 h vers un coucher nocturne. (1) « Bilan sommeil » (moyenne/dette/régularité en un verdict, `sleepCoachInsight`) ; (2) capture facultative de l'heure de coucher au check-in (`recovery[].bedtime`, `bedtimeAnchor` gérant le passage de minuit, `recentBedtimeAnchor` médian) ; (3) **plan de recalage progressif** — heure de coucher CIBLE du jour, décalage 20-30 min tous les 1-2 j vers l'objectif, **adaptation aux écarts** (le plan glisse sans culpabilité), progression + arrivée estimée honnête (`startSleepPlan`/`sleepPlanDay`) ; (4) coach RPG — conseils du soir calés sur la cible (`sleepEveningTips`), adhérence + série (`sleepPlanAdherence`), XP au coucher tenu (`sleepBedtimeReward`, +15/+25). Carte « 🌙 Plan de recalage » dans Récupération. ✅ _boucles #377→#380._
- ♿ **A11y : boutons de fermeture libellés** (2.0.20) : les 8 boutons `×` qui ferment les fenêtres (agenda, quête, séance, séance guidée, revue de focus, fiche exercice, programme, historique) portent `aria-label="Fermer"` — annoncés correctement par les lecteurs d'écran. ✅ _boucle #376._
- 🏆 **Bilan hebdo : ligne alternance** (2.0.19) : le bilan de semaine partageable inclut « 💼 x candidatures · y entretiens » (`weeklySummary`/`weeklySummaryText` étendus, purs + testés). ✅ _boucle #375._
- 🔁 **Alternance : relances en un clic + tri par score** (2.0.18) : chips de relance cliquables (statut « relance » + annulation), meilleures cibles en tête de liste (`compareApplications` pur + testé), score « ⭐ x/10 » affiché sur chaque ligne. ✅ _boucle #374._
- 🎯 **Alternance : Cible du jour** (2.0.17) : le héros propose LA meilleure cible à postuler (score des Cibles conservé à la sync, `nextAlternanceTarget` pur + testé) avec bouton « J'ai postulé » intégré ; s'efface une fois la candidature du jour envoyée. Chaîne de motivation complète : coach → cible → clic → célébration. ✅ _boucle #373._
- 🔍 **Alternance : recherche + filtre par statut** (2.0.16) : barre de recherche accent-insensible (entreprise/poste/ville/notes) + filtre statut dès 8 candidatures, compteur « 1 / 500 », filtre « Refusé » réaffiche les masquées. 2 ms sur 500 lignes. `filterApplications` pur + testé. ✅ _boucle #372._
- 🔎 **Fondations : préflight d'import** (2.0.15, 3.0 · Vague 2 t.4) : importer une sauvegarde affiche son CONTENU (séances, candidatures, XP, dernière activité) + « ⚠️ ATTENTION » si elle est vide / bien moins fournie / plus ancienne — fini l'écrasement aveugle. `describeBackup`/`backupImportWarnings` purs + testés, partagé PWA + desktop. ✅ _boucle #371._
- 🩺 **Fondations : santé du stockage** (2.0.14, 3.0 · Vague 2 t.3) : Réglages → « 🩺 Santé du stockage » — poids des données, quota navigateur, fraîcheur du miroir + instantanés, persistance, avec niveaux ok/warn/crit (`formatBytes`/`storageHealthSummary` purs + testés, smoke async bloquant). ✅ _boucle #370._
- 🗓️ **Fondations : instantanés quotidiens du miroir** (2.0.13, 3.0 · Vague 2 t.2) : le miroir garde 7 jours d'instantanés (`snap:AAAA-MM-JJ`, élagage auto) ; la restauration essaie copie principale puis instantanés du plus récent au plus ancien — une copie corrompue ne bloque plus rien. Scénario corruption vérifié de bout en bout. ✅ _boucle #369._
- 🛟 **Fondations : miroir IndexedDB + récupération auto** (2.0.12, 3.0 · Vague 2 t.1) : chaque sauvegarde alimente un miroir IndexedDB (débounce, verrou anti-écrasement au boot) ; si localStorage est vidé (éviction/nettoyage), la PWA **restaure automatiquement** les données au lancement (toast 🛟). `navigator.storage.persist()` demandé. Aucune migration — localStorage reste la source de vérité. Scénario d'éviction vérifié de bout en bout. ✅ _boucle #368._

- 🎯 **Coach adaptatif : objectifs perso** (2.0.11, 3.0 · Vague 1) : l'insight du pilier choisi compte par rapport à l'objectif hebdo d'Adrien (« Objectif hebdo : 1/4 séances », « 25/120 min de focus »), semaine calendaire. ✅ _boucle #367._
- 📈 **Coach adaptatif : taux de suivi des conseils** (2.0.10, 3.0 · Vague 1) : sous la carte du coach, « Conseils suivis : 3/4 sur 7 jours » — un conseil est suivi si le pilier a bougé le jour même. `coachFollowThrough` pur + testé. La boucle du coach est fermée : il observe, priorise, se souvient, s'évalue. ✅ _boucle #366._
- 🧠 **Coach adaptatif : mémoire anti-radotage** (2.0.9, 3.0 · Vague 1) : le coach journalise son focus quotidien (`state.coachLog`) et, après **3 jours du même pilier sans amélioration**, change d'angle (2ᵉ priorité ou renfort de ce qui marche) au lieu de répéter — « On varie les angles aujourd'hui. » L'alternance, priorité absolue, ne tourne jamais. Pur + testé, vérifié en navigateur. ✅ _boucle #365._

- 🗂️ **Masquage des candidatures refusées** (2.0.8, demande d'Adrien) : le suivi n'affiche que les candidatures actives par défaut ; les refus (souvent nombreux après une sync) sont masqués derrière un bouton « Afficher » — pas supprimés (sinon la sync les réimporterait), donc conservés pour les stats. `state.hideRejected`, filtre au rendu. Vérifié sur les vraies données (214 refus masqués sur 717). ✅ _boucle #364._

- 📄 **Sync auto du Google Sheets d'alternance** (2.0.6-2.0.7, demande d'Adrien) : coller les URLs CSV publiées des onglets « Cibles » + « Suivi Existant » → l'app récupère les candidatures seule (démarrage + toutes les 3 h). Fetch réseau **sécurisé** (main process, allowlist `docs.google.com`, `normalizeSheetCsvUrl`) + **fusion idempotente par entreprise** (`mergeApplications`). **Filtre intelligent des cibles** (`parseAlternanceTargets`/`parseSheetApplications`) : le gros onglet « Cibles » (~15 000 lignes La Bonne Alternance) est réduit aux bonnes cibles — Score /10 ≥ 6 + géo (56, 35, 22-Loudéac) → ~556 entreprises pertinentes au lieu de tout noyer. Seuls les onglets publiés sont lus. Purs + testés, vérifié sur les vraies données. ✅ _boucles #362-363._
- 🔄 **Mises à jour façon appli mobile** (2.0.5) : téléchargement **silencieux en fond**, puis petite **pop-up « Version prête 🎉 »** en bas de l'écran (bouton « Redémarrer & installer », sinon pose automatique à la fermeture). `applyUpdateStatus` extrait + testé (smoke bloquant). Vérifié en navigateur. ✅ _boucle #361._

- 🧭 **Coaching adaptatif — « Le focus du moment »** (3.0 · Vague 1) : carte proactive sur l'accueil qui propose UNE priorité du jour. **L'alternance y est le focus n°1** (ton `urgent`, compte à rebours août + avancement hebdo + série) tant qu'Adrien n'a pas postulé du jour / pas décroché sa place — puis le coach lit la dynamique des deux dernières semaines (entraînement, focus, sommeil, nutrition) : relancer un pilier qui s'essouffle (`rebuild`), reprendre ce qui dort (`revive`), renforcer ce qui monte (`reinforce`). La relance alternance a quitté le digest (plus de doublon). `adaptiveCoachFocus` pur + testé. Vérifié en navigateur. ✅ _boucles #359-360 (builds 2.0.3-2.0.4)._
- 💼 **Module « Recherche d'alternance »** (demande d'Adrien, **terminé**) : onglet dédié pour pousser à postuler chaque jour — compte à rebours avant août, objectif hebdo, série de jours, suivi/pipeline, relances, « J'ai postulé » (+XP), **nudge accueil** « Postule aujourd'hui » et **import CSV** du Google Sheets. `applicationStats`/`alternanceDeadline`/`parseApplicationsCsv` purs + testés. Vérifié en navigateur. ✅ _boucles #357-358 (builds 2.0.1-2.0.2)._

- ☀️ **Série check-in matinal** : `morningStreak` — badge « 🔥 N jours de check-in d'affilée » dans le rituel du matin (tolérance d'un jour manqué). Encourage la keystone habit. Vérifié en navigateur. ✅ _boucle #355 (build 1.9.289)._
- 🧯 **Assainissement scalaires** (robustesse) : `normalizeState` borne désormais compteurs (XP/série/…) et réglages (`goals.*`, `wellnessWeeklyGoal`) — un import corrompu ne peut plus produire de NaN/valeur absurde. Vérifié via smoke bloquant. ✅ _boucle #354 (build 1.9.288)._
- 🎉 **Célébration journée parfaite** : valider la dernière quête du jour déclenche un toast « Journée parfaite ! » (+ série), via `showFlashToast`/`celebrateQuestsIfPerfect`. Le moment est fêté, plus juste compté. Vérifié en navigateur. ✅ _boucle #353 (build 1.9.287)._
- 📚 **Prochaine révision** (besoin BTS d'Adrien) : `nextStudySession` affiche dans « Ma journée » la prochaine révision planifiée (matière + quand), cliquable → agenda au bon jour. Miroir de « Prochaine séance ». Vérifié en navigateur. ✅ _boucle #352 (build 1.9.286)._
- ↩️ **Annuler le report agenda** : « → demain » affiche un toast « Annuler » (`showUndoToast`) qui restaure la date — plus de mis-tap à corriger à la main. Vérifié en navigateur. ✅ _boucle #351 (build 1.9.285)._
- 😴 **Courbe sommeil** : `sleepSeries` + `sparkLineSvg` → mini-courbe des dernières nuits (+ moyenne) dans le bilan récupération. Voir si le sommeil progresse au-delà du chiffre du jour. Vérifié en navigateur. ✅ _boucle #350 (build 1.9.284)._
- 📉 **Courbe tour de taille** : `measurementSeries` + `sparkLineSvg` (normalisée min→max, contrairement aux barres depuis 0) → mini-courbe de tendance sous les mesures. Sert le suivi de recomposition. Vérifié en navigateur. ✅ _boucle #349 (build 1.9.283)._
- 📏 **Mensurations 1/jour** : `upsertMeasurement` (pendant d'`upsertWeight`) — re-saisir le même jour met à jour la ligne (fusion des champs, id conservé) au lieu de dupliquer la date. Vérifié en navigateur. ✅ _boucle #348 (build 1.9.282)._
- ♿ **A11y navigation** : `showPage`/`showAthleteTab` posent `aria-current` sur l'onglet actif (barre principale + sous-menu Athlète) → l'emplacement courant est annoncé aux lecteurs d'écran. Vérifié en navigateur. ✅ _boucle #347 (build 1.9.281)._
- 🛡️ **Import robuste (data-safety)** : `unwrapBackup` déballe le format enveloppé `{version,savedAt,state}` des sauvegardes automatiques → restaurer un fichier d'historique n'efface plus les données (bug de perte totale corrigé). Appliqué aux 3 points d'import. Vérifié en navigateur (avant : 0 / après : intact). ✅ _boucle #346 (build 1.9.280)._
- 📅 **Pouls hebdo habitudes** : `habitsWeekPulse` agrège toutes les habitudes sur 7 j (prévu vs tenu, %) + frise de pastilles sous la liste — vue d'ensemble d'un coup d'œil. Vérifié en navigateur. ✅ _boucle #345 (build 1.9.279)._
- 🧹 **Reset filtres bibliothèque** : `activeExerciseFilters` affiche les filtres actifs (recherche/matériel/objectif/favoris/nouveaux) et un bouton « ✕ Réinitialiser » réaffiche tout en un clic — plus de cul-de-sac « aucun résultat ». Vérifié en navigateur. ✅ _boucle #344 (build 1.9.278)._
- 💧 **Rythme d'hydratation** : `hydrationPace` répartit l'objectif d'eau sur la journée (8 h→22 h) et signale sous la barre si tu es dans les temps ou en retard — jamais de rappel avant le coucher. Vérifié en navigateur. ✅ _boucle #343 (build 1.9.277)._
- ⬆️ **Mises à jour à la demande** (demandé par Adrien) : panneau « Mises à jour » dans les Réglages (desktop) — vérifier maintenant + installer sans attendre le redémarrage. Bandeau popup conservé au démarrage pour les MAJ dispo ; états recherche/à jour seulement dans Réglages. Vérifié en navigateur. ✅ _boucle #342 (build 1.9.276)._
- 🚶 **Progression poids** (polish coach, retour Adrien) : barre en tête du plan montrant `weightGoalProgress` — % parcouru entre point de départ (1re pesée) et cible, kilos faits/restants. Bornée [0..100]. Vérifié en navigateur. ✅ _boucle #341 (build 1.9.275)._
- 🔧 **Fix stepper poids** (signalé par Adrien) : décimale de la cible enfin visible en entier sur tous les écrans (`3.2ch → 6ch` + media query ≤360px) ; flèches natives des `input[type=number]` retirées globalement. Vérifié en navigateur (320/375/1000px). ✅ _boucle #340 (build 1.9.274)._
- 🌅 **Aperçu de demain** : « Ma journée » affiche sous le résumé ce que réserve le lendemain (nb de blocs, première chose horodatée, anniversaires) via `tomorrowPreview` — masqué si demain est vide. Pour préparer sa journée dès le soir. Vérifié en navigateur. ✅ _boucle #339 (build 1.9.273)._
- ☕ **Pause de focus (Pomodoro complet)** : à la fin de chaque bloc, `breakSuggestion` propose une pause proportionnelle (≈ 1/5 du bloc, 5–20 min) et une vraie pause longue tous les 4 blocs — affichée en tête du dialogue de bilan. Vérifié en navigateur. ✅ _boucle #338 (build 1.9.272)._
- 🛟 **Rappel de sauvegarde** (suite du #336) : `state.lastBackup` enregistré à l'export ; `attentionDigest` nudge « Sauvegarde tes données (il y a N j / jamais) » si données présentes + ≥ 14 j sans backup, route vers Réglages, disparaît après export. Vérifié en navigateur. ✅ _boucle #337 (build 1.9.271)._

- 💾 **Sauvegarde/restauration des données sur PWA** (data-safety, essentiel iOS) : export = téléchargement d'un fichier JSON daté (`backupFilename`), import = sélecteur de fichier + `FileReader` (mêmes garde-fous que le desktop). Round-trip vérifié en navigateur. ✅ _boucle #336 (build 1.9.270) — ouvre la rotation 32._

- 🎂 **Anniversaire imminent dans « À rattraper »** : `attentionDigest` remonte un anniversaire à ≤ 2 jours sur l'accueil (sinon enfoui dans l'Agenda), clic → Agenda. Vérifié en navigateur. ✅ _boucle #335 (build 1.9.269) — clôt la rotation 31._

- 👋 **Accueil personnalisé selon l'heure** (polish) : `dailyGreeting` salue par le prénom (Bonjour / Bonsoir…) avec un mot de contexte adapté au moment. Vérifié en navigateur. ✅ _boucle #334 (build 1.9.268)._

- ⚖️ **Une pesée par jour, partout** (robustesse) : fonction partagée `upsertWeight` (remplace la pesée du jour, borne, arrondit, trie) utilisée par les 2 points de saisie (Athlète + Poids) — plus de doublons qui faussaient tendances et plan. ✅ _boucle #333 (build 1.9.267)._

- ⎋ **Échap ferme les overlays plein écran** (a11y) : Agenda semaine / calendrier / ultra se ferment au clavier ; annule aussi une édition d'habitude ; laisse les `<dialog>` natifs gérer Échap eux-mêmes. Vérifié en navigateur. ✅ _boucle #332 (build 1.9.266) — ouvre la rotation 31._

- 📅 **Onglet Poids autonome — saisie du poids du jour sur place** : champ rapide en tête (une pesée/jour, remplace), « dernière pesée + rappel ⏰ », plan qui se recalcule aussitôt. L'onglet Poids couvre désormais tout le cycle (logger → cible/paliers → plan). Vérifié en navigateur. ✅ _boucle #331 (build 1.9.265) — clôt la rotation 30._

- 🎚️ **Sélecteur de poids cible façon stepper** (demande d'Adrien, cap 2.0) : gros affichage + boutons − / + (0,5 kg), part du poids actuel si vide, enregistrement direct conservé. Vérifié en navigateur. ✅ _boucle #330 (build 1.9.264)._ **Les 3 demandes coach poids d'Adrien sont faites** (paliers #328, onglet dédié #329, sélecteur #330).

- ⚖️ **Coach Poids en onglet dédié** (demande d'Adrien, cap 2.0) : nouvel onglet nav « Poids » (`pageGroups.poids`), retiré des sous-onglets Athlète, avec cible + paliers + plan. Vérifié en navigateur. ✅ _boucle #329 (build 1.9.263)._ Reste : sélecteur de poids plus joli.

- 🪜 **Coach poids — paliers intermédiaires + fréquence de suivi** (demande d'Adrien, cap 2.0) : `weightMilestones` (échelle de caps vers la cible, intervalle adaptatif sans trou) + `trackingCadenceAdvice` (fréquence pesée/mensurations). Plus **correctif** : la carte « Nouveautés » se ferme bien (`.whatsnew-card[hidden]` écrasait `display:flex`). Vérifié en navigateur. ✅ _boucle #328 (build 1.9.262) — ouvre la rotation 30._ Restent pour 2.0 : sélecteur de poids plus joli, coach poids en onglet à part.

- ↩️ **« Annuler » après suppression d'une habitude** : toast réutilisable (`showUndoToast`) qui restaure l'habitude à sa place avec son historique — filet contre les suppressions accidentelles. Vérifié en navigateur. ✅ _boucle #327 (build 1.9.261) — clôt la rotation 29._

- ✏️ **Habitudes modifiables** (nom + jours) sans supprimer/recréer : édition inline, `applyHabitEdit` préserve id/log/xp → série et historique intacts. Vérifié en navigateur. ✅ _boucle #326 (build 1.9.260)._

- 📊 **Habitudes — régularité sur 30 j** : `habitConsistency` affiche un taux (vert/orange/rouge) par habitude, complétant la série court terme. Fenêtre bornée à la 1re date loggée (pas de « 3 % » sur une habitude naissante). Vérifié en navigateur. ✅ _boucle #325 (build 1.9.259)._

- 🔥 **Série « objectif protéines »** : `proteinStreak` — jours consécutifs à la cible + record. La nutrition rejoint le système de séries de l'app (jusque-là seule sans). Vérifié en navigateur. ✅ _boucle #324 (build 1.9.258) — ouvre la rotation 29._

- 🧠 **Focus par tâche** : `focusByTask` répartit ton temps de concentration des 7 derniers jours par tâche (barres proportionnelles) — voir sur quoi tu te concentres vraiment. Affiché si ≥ 2 tâches. Vérifié en navigateur. ✅ _boucle #323 (build 1.9.257) — clôt la rotation 28._

- 🧭 **Digest « À rattraper » — navigation corrigée** (relecture de #321) : révisions/examen renvoyaient vers le dashboard alors qu'ils vivent dans la page calendrier ; corrigé (ouvre l'overlay calendrier), + bascule sous-onglet Séance pour forme/séances, + défilement jusqu'au panneau. Vérifié en navigateur. ✅ _boucle #322 (build 1.9.256)._

- 🎯 **Digest « À rattraper » sur l'accueil** : `attentionDigest` agrège à travers les domaines ce qui a besoin d'attention (forme basse, examen imminent, révisions en retard, séances manquées, habitudes à risque), trié par gravité, cliquable vers l'onglet concerné. Vérifié en navigateur. ✅ _boucle #321 (build 1.9.255)._
- 📚 **Révisions par matière** : `studyBySubject` regroupe les séances de révision par titre (matière) et pointe la plus en retard à prioriser — utile pour un BTS multi-matières. Affiché si ≥ 2 matières. Vérifié en navigateur. ✅ _boucle #320 (build 1.9.254) — ouvre la rotation 28._

- 🧭 **Onglet Athlète rangé en 3 zones + « Base d'endurance » conditionnelle** (audit onglets A+C) : sous-onglet Séance en zones intitulées (Faire maintenant · Mon entraînement · Récupération & mobilité) via `organizeAthleteZones` (réordonne les conteneurs, pas les panneaux — grilles responsive intactes) ; panneau trail masqué (`showsEnduranceBase`) hors profil endurance/trail/course. Vérifié en navigateur. ✅ _boucle #319 (build 1.9.253) — clôt la rotation 27._
- 🎯 **Poids cible unifié dans « Mon plan »** (audit onglets B) : doublon `#targetWeight` retiré de « Objectifs hebdomadaires », foyer unique (`#coachTarget`) + renvoi ; `#saveGoals` préserve la cible ; 4 gardes smoke rendus bloquants. ✅ _boucle #318 (build 1.9.252)._

- 🎯 **Poids cible unifié dans « Mon plan »** (suite audit onglets) : doublon `#targetWeight` retiré de « Objectifs hebdomadaires », foyer unique dans le panneau du plan (`#coachTarget`, enregistrement direct) + renvoi de découvrabilité. `#saveGoals` préserve désormais la cible. Vérifié en navigateur. ✅ _boucle #318 (build 1.9.252)._ Restent ouvertes : regroupement 3 zones de l'onglet Athlète (A) et « Base d'endurance » conditionnelle (C).

- 📋 **« Prochaine séance » et « Planifier la suite » voient enfin le programme** : ces widgets ne lisaient que `state.plans` → les séances des générateurs de programme (dans `state.agenda`) étaient invisibles après l'onboarding. Vue unifiée `upcomingSessions` (fusion plans + agenda, dédup `planId`), démarrage guidé + report des séances de programme. Vérifié en navigateur. ✅ _boucle #317 (build 1.9.251)._
- ♻️ **Demande d'Adrien — un nouveau programme enlève l'ancien** : `scheduleObjectiveProgram` ne purgeait rien → deux programmes coexistaient, d'où des jours à 2 séances. Purge des séances de programme à partir du lundi de départ (`pruneProgramSessionsFrom`), historique et RDV perso conservés. Piège trouvé en navigateur : les séances de programme sont identifiées par `refId` (source recodée `manual` par normalizeAgendaItem), pas par source. ✅ _boucle #316 (build 1.9.250) — ouvre la rotation 27._
- 🗓️ **Conflit d'horaire → prochain créneau libre proposé** : l'avertissement de chevauchement ne dit plus seulement « c'est pris », il indique où la séance rentre (`nextFreeSlot`). Vérifié en navigateur. ✅ _boucle #315 (build 1.9.249) — clôt la rotation 26._
- 🎯 **Demande d'Adrien — la cible de poids se modifie DANS le plan** : le champ vivait dans « Objectifs hebdomadaires » (onglet Séance) alors que le plan qui le consomme est sur l'onglet Progrès — et le message d'aide de l'app pointait vers un « panneau Poids » inexistant. Champ ajouté dans le panneau du plan (enregistrement direct), synchronisé dans les deux sens, message corrigé. Plus détection de chevauchement de séances (`scheduleConflicts`). ✅ _boucle #314 (build 1.9.248)._

> ✅ **Les 4 caps d'Adrien (#1→#4) traités + 18 rotations complètes ; désormais amélioration continue « liberté totale » sur tous domaines — boucle autonome continue**. **Publication option B ACTIVE + AUTO-PUBLISH** (`releaseType:release`) : release GitHub Actions par tag `v*` (`GITHUB_TOKEN` intégré) ; **1ʳᵉ release `v1.9.185` ✅ verte**, `v1.9.187`→`v1.9.217` publiées.

- 🌟 **#R19 — série de journées complètes** : streak de jours à ≥ 4/6 domaines de vie dans Mission Control (`completeDaysStreak`). ✅ _boucle #285 (build 1.9.219)._
- 🎯 **#R19 — rythme de révision BTS** : cadence conseillée de révisions/semaine vers l'examen + statut (tranquille/bon/serré) (`studyPacing`). ✅ _boucle #284 (build 1.9.218)._
- 📚 **#4 approfondi (18) — blocs par objectif** : historique des blocs terminés regroupés par objectif (blocs/séances/tonnage) (`blocksByObjective`). ✅ _boucle #283 (build 1.9.217) — clôt la 18ᵉ rotation._
- 🤸 **#3 approfondi (18) — répartition des routines par famille** : ventilation hebdo échauffement/mobilité/étirement/détente (`wellnessFamilyBreakdown`). ✅ _boucle #282 (build 1.9.216)._
- 🩹 **#2 approfondi (18) — note blessures/limitations** : champ à l'onboarding rappelé en bannière avant l'entraînement (`profile.limitations`). ✅ _boucle #281 (build 1.9.215)._
- 📳 **#1 approfondi (18) — retour haptique enrichi** : vibrations sur paliers bien-être + quêtes bouclées (`VIBRATION_PATTERNS`). ✅ _boucle #280 (build 1.9.214)._
- 🏃 **#4 approfondi (17) — course hebdo vs objectif** : carte de progression course de la semaine + tendance (ramp) (`runWeekGoal`). ✅ _boucle #279 (build 1.9.213) — clôt la 17ᵉ rotation._
- 📤 **#3 approfondi (17) — partage du bilan bien-être** : Web Share du récap (série, routines/minutes de la semaine, total, paliers) (`shareableWellness`). ✅ _boucle #278 (build 1.9.212)._
- ✅ **#2 approfondi (17) — habitude de départ à l'onboarding** : case (adaptée à l'objectif) qui crée une habitude quotidienne au démarrage (`starterHabitFor`). ✅ _boucle #277 (build 1.9.211)._
- 📋 **#1 approfondi (17) — raccourci « Ma journée »** : 6ᵉ shortcut manifest (`?go=today`) vers le plan du jour (`LAUNCH_TARGETS`). ✅ _boucle #276 (build 1.9.210)._
- ⚖️ **#4 approfondi (16) — équilibre course/muscu** : barre course vs muscu de la semaine + label (bon équilibre / plutôt course / plutôt muscu) (`weekTrainingBalance`). ✅ _boucle #275 (build 1.9.209) — clôt la 16ᵉ rotation._
- 🗓️ **#3 approfondi (16) — record de routines par semaine** : chip « record sem. N » (meilleure semaine bien-être all-time) + célébration si battu cette semaine (`bestWellnessWeek`). ✅ _boucle #274 (build 1.9.208)._
- 🙂 **#2 approfondi (16) — prénom/pseudo du joueur** : champ à l'onboarding affiché « 👋 {pseudo} » sur la carte joueur (`profile.name`). ✅ _boucle #273 (build 1.9.207)._
- 📤 **#1 approfondi (16) — bouton « Partager l'app »** : Web Share d'une invitation (repli presse-papier), lien PWA/GitHub Pages (`shareAppPayload`). ✅ _boucle #272 (build 1.9.206)._
- 📅 **#4 approfondi (15) — mes jours d'entraînement** : mini-graphe des séances par jour de la semaine (8 sem.) + jour fort (`trainingByWeekday`). ✅ _boucle #271 (build 1.9.205) — clôt la 15ᵉ rotation._
- ⚡ **#3 approfondi (15) — routine express aléatoire** : pioche au hasard une routine tenant dans le temps choisi (4/6/8 min), lancée en 1 clic (`expressRoutine`). ✅ _boucle #270 (build 1.9.204)._
- 🚶 **#2 approfondi (15) — niveau d'activité à l'onboarding** : sélecteur sédentaire→très actif qui affine maintenance/objectif caloriques (`activityLevel` → `objectiveNutrition`). ✅ _boucle #269 (build 1.9.203)._
- 🕐 **#1 approfondi (15) — thème selon l'heure** : 4ᵉ mode de thème (clair le jour, sombre la nuit), bascule au fil de la journée (`resolveTheme` heure). ✅ _boucle #268 (build 1.9.202)._
- 🗓️ **#4 approfondi (14) — record hebdo de tonnage** : meilleure semaine all-time (Σ tonnage lundi→dimanche) + célébration si battu cette semaine (`bestTonnageWeek`). ✅ _boucle #267 (build 1.9.201) — clôt la 14ᵉ rotation._
- 🎯 **#3 approfondi (14) — zone la moins mobilisée** : rappel ciblé de la zone du corps la plus négligée + lancement direct de sa routine (`neglectedMobilityZone`). ✅ _boucle #266 (build 1.9.200)._
- 🔥 **#2 approfondi (14) — calories en direct à l'onboarding** : estimation maintenance/objectif/protéines live dès que le profil est saisi (`onboardingNutritionEstimate`). ✅ _boucle #265 (build 1.9.199)._
- 🎖️ **#1 approfondi (14) — ancienneté « Membre depuis »** : compteur de jours + paliers de fidélité (👋→🌱→⭐→🏆→💎) dans la carte joueur (`membershipInfo`). ✅ _boucle #264 (build 1.9.198)._
- 📏 **#4 approfondi (13) — régularité d'entraînement** : score 0-100 sur 28 j (constance des intervalles entre séances) + jauge (`trainingConsistency`). ✅ _boucle #263 (build 1.9.197) — clôt la 13ᵉ rotation._
- 🏅 **#3 approfondi (13) — record de série bien-être** : chip « record N j » (meilleure suite de jours all-time) à côté du streak courant (`wellnessBestStreak`). ✅ _boucle #262 (build 1.9.196)._
- 🏃 **#2 approfondi (13) — objectif de course à l'onboarding** : champ « Course (km/sem.) » relié à `goals.distance` (barre de progression distance). ✅ _boucle #261 (build 1.9.195)._
- 🧘 **#1 approfondi (13) — raccourci « Bien-être »** : 5ᵉ shortcut manifest (`?go=wellness`) vers les routines de mobilité + cible de lancement en logique pure (`launchTarget`). ✅ _boucle #260 (build 1.9.194)._
- 🏆 **#4 approfondi (12) — record de tonnage sur une séance** : meilleure séance (Σ charge×reps) + célébration si la dernière bat le record (`bestSessionTonnage`). ✅ _boucle #259 (build 1.9.193) — clôt la 12ᵉ rotation._
- ⏱️ **#3 approfondi (12) — minutes de mobilité hebdo** : chip du temps total de mobilité de la semaine dans le bandeau bien-être (`wellnessMinutesInWindow`). ✅ _boucle #258 (build 1.9.192)._
- 🎯 **#2 approfondi (12) — suggestion d'objectif à l'onboarding** : hint « Suggéré pour toi » selon IMC + poids cible, applicable en 1 clic (`suggestObjective`). ✅ _boucle #257 (build 1.9.191)._
- ✨ **#1 approfondi (12) — écran « Nouveautés »** : après une mise à jour auto, liste les features ajoutées depuis la dernière version vue (`whatsNewSince`/`CHANGELOG`). ✅ _boucle #256 (build 1.9.190)._
- 📈 **#4 approfondi (11) — tendance de tonnage hebdo** : sparkline du tonnage muscu sur 8 semaines + tendance de la semaine (`weeklyTonnageTrend`). ✅ _boucle #255 (build 1.9.189) — clôt la 11ᵉ rotation._
- 🧘 **#3 approfondi (11) — filtre routines par temps dispo** : puces « J'ai ≤4/5/6 min » qui filtrent la barre bien-être (`routinesByTimeBudget`, tri durée décroissante). ✅ _boucle #254 (build 1.9.188)._
- ⚖️ **#2 approfondi (11) — poids cible à l'onboarding** : champ optionnel qui alimente `goals.targetWeight` → coach poids. ✅ _boucle #253 (build 1.9.187)._
- 📤 **#1 approfondi (11) — partage d'une routine bien-être** : bouton Web Share sur la suggestion du jour (mouvements détaillés). ✅ _boucle #252 (build 1.9.186)._
- 📤 **#4 approfondi (10) — partage de la progression de bloc** : bouton Web Share sur la comparaison de blocs (tendance + force par exercice). ✅ _boucle #251 (build 1.9.185)._
- 🔔 **#3 approfondi (10) — rappel doux d'inactivité bien-être** : nudge après ≥3 j sans routine (ne relance pas ceux qui n'ont jamais commencé). ✅ _boucle #250 (build 1.9.184)._
- 📝 **#2 approfondi (10) — brouillon d'onboarding** : sauvegarde des saisies si on ferme sans finir + reprise (« Brouillon repris » / « Repartir de zéro »). ✅ _boucle #249 (build 1.9.183)._
- 📤 **#1 approfondi (10) — partage du bilan hebdo** : bouton Web Share sur la revue hebdo (feuille OS sur mobile, repli presse-papier). ✅ _boucle #248 (build 1.9.182)._
- ⚖️ **#4 approfondi (9) — ratio push/pull** : carte de bloc affichant l'équilibre poussée/tirage sur 28 j + conseil de rééquilibrage. ✅ _boucle #247 (build 1.9.181)._
- 🎯 **#3 approfondi (9) — objectif hebdo de routines** : cible réglable (−/+) avec barre de progression dans le panneau bien-être. ✅ _boucle #246 (build 1.9.180)._
- 🍽️ **#2 approfondi (9) — macros expliquées** : détail P/G/L (grammes, % des calories, rôle) dans l'aperçu d'onboarding. ✅ _boucle #245 (build 1.9.179)._
- 📳 **#1 approfondi (9) — retour haptique centralisé** : vibration sur fin de repos, série validée, record et level-up via un helper testable. ✅ _boucle #244 (build 1.9.178)._
- 🩹 **#4 approfondi (8) — zone à rattraper** : carte de bloc signalant le groupe musculaire le moins travaillé sur 28 j (déséquilibre). ✅ _boucle #243 (build 1.9.177)._
- 🧭 **#3 approfondi (8) — parcours guidés bien-être** : enchaînements de 2 routines en une session (Réveil complet, Prépa séance, Détente du soir). ✅ _boucle #242 (build 1.9.176)._
- 🎚️ **#2 approfondi (8) — choix de niveau** : débutant/intermédiaire/avancé ajuste le volume (4/5/6 exos par séance muscu) dans tout le générateur. ✅ _boucle #241 (build 1.9.175)._
- 📱 **#1 approfondi (8) — safe-area insets iPhone** : `viewport-fit=cover` + `env(safe-area-inset-*)` sur bandeaux fixes et contenu (encoche/barre d'accueil), no-op ailleurs. ✅ _boucle #240 (build 1.9.174)._
- 🎯 **#4 approfondi (7) — prévision de force sur la carte de bloc** : « ~N sem. pour atteindre X kg » sur l'exercice-clé qui progresse. ✅ _boucle #239 (build 1.9.173)._
- 🗓️ **#3 approfondi (7) — mini-heatmap des routines** : vue 7 jours des routines bien-être faites (3 niveaux d'intensité). ✅ _boucle #238 (build 1.9.172)._
- 📊 **#2 approfondi (7) — jauge de complétude du profil** : barre « profil complété à X% » en direct dans l'onboarding + indice « macros calculables » selon poids/taille. ✅ _boucle #237 (build 1.9.171)._
- 🔴 **#1 approfondi (7) — badge d'app PWA** : pastille sur l'icône installée avec les actions du jour (quêtes non faites + séances), effacée quand tout est fait. ✅ _boucle #236 (build 1.9.170)._
- ⏳ **#4 approfondi (6) — heads-up anticipé de fin de bloc** : dès la semaine de décharge (S4), carte « dernière semaine, allège » + reco du prochain bloc affichée d'avance. ✅ _boucle #235 (build 1.9.169)._
- 🏅 **#3 approfondi (6) — badges/paliers bien-être** : médailles de série (3/7/14/30 j) et de total (10/25/50/100 routines) + toast au franchissement + prochain objectif. ✅ _boucle #234 (build 1.9.168)._
- 🎉 **#2 approfondi (6) — récap de fin d'onboarding** : écran « voici ce qui a été mis en place » (séances placées, 1re séance datée, quêtes) + bouton « Lancer ma 1re séance ». ✅ _boucle #233 (build 1.9.167)._
- 🔆 **#1 approfondi (6) — Wake Lock fiabilisé** : l'écran reste allumé pendant une séance guidée même après un passage en arrière-plan (ré-acquisition `visibilitychange`) + libération sur tous les chemins de fermeture. ✅ _boucle #232 (build 1.9.166)._
- 📈 **#4 approfondi (5) — plateau réel dans la reco de bloc** : `strengthPlateauAny` détecte un plateau de force sur un exercice-clé et alimente la reco de fin de bloc (« change une variable » nomme l'exercice). ✅ _boucle #231 (build 1.9.165)._
- 🔥 **#3 approfondi (5) — streak de routines bien-être** : suivi gamifié (série de jours + compteurs semaine/total) journalisé au lancement d'une routine. ✅ _boucle #230 (build 1.9.164)._
- 🕑 **#2 approfondi (5) — onboarding « moment préféré »** : créneau matin/midi/soir qui fixe l'heure des séances programmées (aperçu + agenda). ✅ _boucle #229 (build 1.9.163)._
- 📤 **#1 approfondi (5) — partage natif du programme** : bouton « Partager » (Web Share sur mobile → feuille OS, repli presse-papier ailleurs). ✅ _boucle #228 (build 1.9.162)._
- 💪 **#4 approfondi (4) — progression de force par exercice** : la comparaison de blocs affiche le 1RM estimé de chaque exercice-clé du 1ᵉʳ au dernier bloc (ex. Squat 70→88 kg +25%). ✅ _boucle #227 (build 1.9.161)._
- 🧘 **#3 approfondi (4) — suggestion bien-être contextuelle** : la routine du jour cible la récup selon la dernière séance loggée (course→chevilles, jambes→hanches, haut→épaules, gainage→dos). ✅ _boucle #226 (build 1.9.160)._
- 🗓️ **#2 approfondi (4) — onboarding « mes jours dispo »** : sélecteur de jours d'entraînement qui replace le programme généré sur ces jours (aperçu + agenda), réparti/espacé intelligemment. ✅ _boucle #225 (build 1.9.159)._
- 📲 **#1 approfondi (4) — nudge d'installation contextuel** : carte tableau de bord proposée seulement après engagement (≥3 séances) si l'app est installable et non installée, avec vrai prompt navigateur ; iOS garde son bandeau. ✅ _boucle #224 (build 1.9.158)._
- 📊 **#4 approfondi (3) — comparaison de blocs** : carte « Ma progression sur N blocs » (dès 2 blocs terminés) comparant tonnage/sem. et séances/sem. du 1ᵉʳ au dernier bloc, avec tendance 📈/➡️/📉. ✅ _boucle #223 (build 1.9.157)._
- 🧘 **#3 approfondi (3) — routines ciblées + « Surprends-moi »** : 3 nouvelles routines (chevilles/course, nuque/bureau, poignets ; catalogue 8→11) + bouton tirage aléatoire d'une routine. ✅ _boucle #222 (build 1.9.156)._
- 🧭 **#2 approfondi (3) — bienvenue personnalisée** : message par objectif (ce que l'app met en place) + préremplissage du poids depuis la dernière pesée. ✅ _boucle #221 (build 1.9.155)._
- 📲 **#1 approfondi (3) — aide d'installation iOS** : bannière « Partager → Sur l'écran d'accueil » sur iPhone/iPad non installé. ✅ _boucle #220 (build 1.9.154)._
- 📚 **#4 approfondi (2) — historique de blocs** : archivage auto du bloc précédent (objectif/dates) + ligne « N blocs terminés · dernier : … » sous la carte bloc. ✅ _boucle #219 (build 1.9.153) — 2e rotation complète._
- 🧘 **#3 approfondi (2) — routine récup programmable** : bouton « 📅 Programmer » (récurrent mar & ven 19h dans l'agenda) en plus de « ▶️ Lancer ». ✅ _boucle #218 (build 1.9.152)._
- 🚀 **#2 approfondi (2) — checklist « Bien démarrer »** : carte dashboard X/6 (objectif, semaine, poids, 1re séance, eau, quête) qui se coche seule et disparaît une fois établie. ✅ _boucle #217 (build 1.9.151)._
- 📴 **#1 approfondi (2) — hors-ligne + maj PWA** : bandeau hors-ligne + bannière « nouvelle version → Recharger ». ✅ _boucle #216 (build 1.9.150)._
- 📆 **#4 approfondi — la décharge allège vraiment la séance** : la séance guidée d'un jour programmé applique les séries de la phase (S2 +1, S4 ~60 %), phase affichée au titre. ✅ _boucle #215 (build 1.9.149)._
- 🧘 **#3 approfondi — routine suggérée selon la forme** : bandeau qui propose récup/échauffement/mobilité selon readiness+charge, + 2 routines (bas du dos, détente du soir → 8 au total). ✅ _boucle #214 (build 1.9.148)._
- 🧭 **#2 approfondi — aperçu du programme à l'onboarding** : bouton « Voir un aperçu » (semaine + heures + macros) avant de valider. ✅ _boucle #213 (build 1.9.147)._
- 📲 **#1 approfondi — installation + raccourcis PWA** : bouton « Installer l'app » (beforeinstallprompt), 4 raccourcis d'app (Séance/Coach/Agenda/Nutrition) avec deep-links `?go=`. ✅ _boucle #212 (build 1.9.146)._

- 📆 **#4 COACHING périodisé — bloc auto-ajusté** : en fin de bloc, reco du prochain bloc (adhérence + charge → régularité/alléger/varier/+volume/garder) + bouton « nouveau bloc » (régénère variante + replanifie). ✅ _boucle #211 (build 1.9.145)._
- 📆 **#4 COACHING périodisé — « Mon bloc en cours »** : carte semaine X/4 + phase (Base→Volume→Intensité→Décharge) + frise + « décharge dans N sem. » + fin de bloc. ✅ _boucle #210 (build 1.9.144) — début #4._
- 🧘 **#3 ROUTINES mobilité/récup guidées** : 6 routines sans matériel (échauffement, mobilité hanches/épaules, étirements, retour au calme, réveil articulaire) lancées en séance guidée (minuteur). + onboarding **rejouable** (bouton Réglages). ✅ _boucle #209 (build 1.9.143)._
- 🧭 **#2 ONBOARDING guidé qui met en route** : le 1er lancement collecte objectif + profil (poids/taille/âge/sexe/matériel) puis **génère le programme, le place dans l'agenda (4 sem.) et crée les 1ères quêtes** — vérifié en navigateur (28 séances + 8 quêtes). ✅ _boucle #208 (build 1.9.142)._

> 🧭 **Cap actuel (Adrien, 2026-07-12) : boucles #1→#4** — (1) version mobile/PWA ✅ **solide**, (2) onboarding guidé, (3) contenu mobilité/récup, (4) coaching périodisé. Le « 100 % local » n'est plus une contrainte stricte (réseau OK si sécurisé).
> 🔔 **Action Adrien pour le mobile** : `git push` + activer GitHub Pages (Source : GitHub Actions) → app sur `adrienlvl.github.io/irl-lvp-up/`. Voir [`DEPLOIEMENT-WEB.md`](DEPLOIEMENT-WEB.md).

- 📱 **#1 MOBILE — SOLIDE** : PWA installable + hors-ligne (SW network-first), nav mobile accessible, responsive + tap targets, replis navigateur propres, **workflow GitHub Pages + doc de déploiement prêts**. ✅ _boucles #203→207 (builds 1.9.137→1.9.141)._
- 📱 **Mobile — passe responsive + tap targets** : aucun débordement sur les 6 pages (375 px) ; cases à cocher 13→20 px, boutons-icônes 34–44 px (confort tactile). ✅ _boucle #206 (build 1.9.140)._
- 📱 **PWA — SW network-first (anti-stale)** : code en network-first (frais en ligne, offline en repli), images en cache-first, cache versionné. Vérifié en navigateur : SW v2 actif, sert la version disque à jour. ✅ _boucle #205 (build 1.9.139)._
- 📱 **Mobile — nav accessible + replis vérifiés** : la barre de nav passe en grille (7 onglets tous visibles/tappables ≤650 px, avant : moitié hors écran) ; audit confirmé que tous les appels `window.desktop` dégradent proprement en navigateur. ✅ _boucle #204 (build 1.9.138)._ _À suivre : SW network-first (anti-cache-stale), passe responsive panneaux/dialogues, déploiement web._
- 📱 **PWA — fondations (app installable + hors-ligne)** : manifest + service worker (précache app-shell) + métas iOS ; enregistrement gardé au http(s) (inactif dans Electron). Vérifié en navigateur mobile : SW actif, app-shell rendu, installable. ✅ _boucle #203 (build 1.9.137) — début du chantier #1 mobile._
- 🗓️ **Séances manquées (agenda ↔ entraînement)** : rappel bienveillant des séances prévues non faites sur 14 j (ni cochées ni loguées). ✅ _boucle #202 (build 1.9.136)._
- 🔮 **Prévision d'atteinte du prochain palier de force** : « à ce rythme, 100 kg dans ~N sem. », d'après la tendance du 1RM estimé. ✅ _boucle #201 (build 1.9.135)._
- 📸 **Comparaison photos avant/après** : la plus ancienne vs la plus récente, côte à côte, avec poids et delta sur la période. ✅ _boucle #200 (build 1.9.134)._
- ⚔️ **Quêtes suggérées automatiquement** : jusqu'à 4 quêtes du jour tirées des vraies données (séance prévue, protéines/eau, focus, habitude), ajoutables en un clic. ✅ _boucle #199 (build 1.9.133)._
- 📊 **Bilan hebdomadaire intelligent** : insights personnalisés (séances/km vs objectifs, tendance vs semaine dernière, ACWR, sommeil) dans « Ma semaine ». ✅ _boucle #198 (build 1.9.132)._
- 🧠 **Conseil de charge intelligent (auto-déload)** : combine ACWR + forme du jour → reco pousser/maintenir/alléger colorée, priorité au risque. ✅ _boucle #197 (build 1.9.131)._
- 🏆 **Accomplissements étendus (14 → 22 badges)** : caps long terme (série 7/30 j, 50 séances, 10 t soulevées, 100 km, cible de poids, variété d'exos) + liste en grille responsive. ✅ _boucle #196 (build 1.9.130)._
- 🎯 **Prochain palier de série** : sous le compteur 🔥, objectif du prochain cap (3/7/14/30…) quand on s'en approche. ✅ _boucle #195 (build 1.9.129)._
- 🎨 **Cases à cocher vertes + focus clavier visibles** : accent thème sur checkboxes/radios, anneaux de focus `:focus-visible` sur champs et boutons. ✅ _boucle #194 (build 1.9.128)._
- 🎨 **Barres de défilement thématisées** : fines et sombres (page, dialogues, listes) au lieu des scrollbars natives claires. ✅ _boucle #193 (build 1.9.127)._
- 🎨 **Design des menus déroulants** : `<select>` thématisés (flèche custom, focus vert, liste `<option>` sombre) au lieu du rendu natif Windows. ✅ _boucle #192 (build 1.9.126)._
- 📈 **Détection de plateau de force** : le panneau progression alerte si le 1RM estimé stagne sur 3 séances, avec conseil concret. ✅ _boucle #191 (build 1.9.125)._
- 💪 **Tonnage total soulevé à vie** : nouvelle tuile « X t soulevés » dans les stats à vie (cumul muscu). ✅ _boucle #190 (build 1.9.124)._
- ⚖️ **IMC dans le Coach Poids** : situe le poids actuel (catégorie OMS) avec mention « repère indicatif ». ✅ _boucle #189 (build 1.9.123)._
- ♿ **Accessibilité panneau objectif** : sélecteur d'objectif nommé (`aria-label`) + régions de résultat annoncées aux lecteurs d'écran (`aria-live`). ✅ _boucle #188 (build 1.9.122)._
- 📋 **Copier le programme auto** : bouton qui exporte le programme par objectif en texte lisible (jours + exercices séries×reps + nutrition) pour le partager. ✅ _boucle #187 (build 1.9.121)._
- ⏱️ **Temps hebdo du programme auto** : le panneau « Programme selon l'objectif » indique « ≈ X h/semaine · N séances » pour juger la faisabilité. ✅ _boucle #186 (build 1.9.120)._

- 🎯 **PROGRAMME AUTO PAR OBJECTIF — COMPLET** (panneau Athlète → Séance, boucles #180→185, builds 1.9.114→1.9.119) : tu choisis **un objectif** (🏃 Corps athlétique · 💪 Prise de muscle · 🔥 Perte de gras · 🏔️ Endurance/trail · ⚖️ Remise en forme) et l'app génère **toute la semaine** — **séances muscu avec un split précis** (haut/bas/full body, poussée/tirage/jambes…) concrètes (exercices + séries × reps) et **lançables en mode guidé**, **+ courses au mix adapté à l'objectif** (sèche→tempo/fractionné, endurance→sorties longues, muscle→footing facile). **Progression sur 4 semaines** (Base→Volume→Intensité→Décharge). **Objectif mémorisé**, bouton **« 🔄 Varier les exercices »**, **adaptation au matériel dispo**, et **nutrition alignée sur l'objectif** (calories/macros : déficit sèche / surplus muscle / maintien, reliées au Coach Poids). **« Programmer la semaine (4 sem.) »** place tout dans l'agenda.
- 🎯 **MODULE COACH POIDS — COMPLET** (panneau Athlète → Progrès, boucles #157→162, builds 1.9.91→1.9.96) : à partir du poids actuel, taille, âge, sexe et **niveau d'activité**, il calcule métabolisme + dépense (TDEE), **calories & macros cibles**, la **date d'atteinte estimée**, une **projection graphique** (prévu vs réel + jalon + recalage sur la tendance réelle), un **plan d'entraînement semaine** (muscu+renfo+course adapté perte/prise), une **nutrition détaillée** (répartition sur 4 repas + « quoi manger »), et un **coaching pas à pas** + **checklist d'adhérence hebdo** (score sur données réelles).
- **Agenda complet** : vues Jour / Semaine / Mois, priorités, **détails d'événement** (📍 lieu · 📝 notes · 🚗 trajet → **heure de départ conseillée** + « pars dans X min »), import **et** export `.ics` (avec **RRULE**), **événements récurrents natifs** (validables par date), **anniversaires** + récap « à venir », **sync par URL** (`.ics`/webcal, sécurisée — Vague S.8).
- **Quotidien** : To-Do du jour (report visible), **habitudes/Dailies** (jours choisis, série 🔥, XP), notifications matin/avant/soir conscientes des récurrents **et** des habitudes.
- **Coaching** : **47 exercices** — vraie photo d'humain **animée début↔fin pour les 47** (16 planches) ; **filtrables par objectif physique**, **programme progressif 8 semaines** + **planificateur intelligent « Ma semaine »** (multi-objectifs + runs, muscu+run le même jour possible) planifiables dans l'agenda ; générateur de repas frigo+envie + liste de courses (CIQUAL, cuit avant cru).
- **Confort/infra** : densité, retour-en-haut, version affichée, auto-update.
- ✅ **1.9.53 publiée** sur GitHub Releases (`adrienlvl/irl-lvp-up`, marquée « Latest », auto-update actif). Versions intermédiaires 1.5.2 → 1.9.52 non publiées (inutile : la dernière suffit).
- ⚠️ **1.9.54 → 1.9.154** non publiées (attendent un `npm run release` / upload d'Adrien).
- 📱 **Cartes de stats mobile** : sur petit écran, les tuiles de stats (accueil) passent en colonne centrée (icône au-dessus du texte) et les tuiles « à vie » se resserrent — plus de contenu à l'étroit ni de débordement. ✅ _boucle #179 (build 1.9.113)._
- 🎯 **Palmarès de force — prochain palier** : chaque exercice affiche le **prochain palier rond de 1RM** et l'écart à combler (ex. « 🎯 140 kg dans 6,5 »), pour un objectif de force concret et motivant. ✅ _boucle #178 (build 1.9.112)._
- 📱 **Bibliothèque d'exercices fluide** : la grille des cartes passe en `auto-fill minmax(158px)` — elle s'adapte toute seule de 1 à N colonnes selon la largeur (téléphone → grand écran), sans média-query rigide. ✅ _boucle #177 (build 1.9.111)._
- 🛡️ **Garde-fou CSS automatique** : nouveau test (`test/css-lint.test.js`, dans `npm run verify`) qui scanne tous les fichiers `.css` et **échoue si une déclaration a des parenthèses déséquilibrées ou un fichier des accolades non fermées** — aurait attrapé le bug de largeur des dialogues. Prévention de régression. ✅ _boucle #176 (build 1.9.110)._
- 📱 **Fix largeur des dialogues + passe mobile** : correction d'un bug CSS (parenthèse manquante dans `width:min(440px,calc(100% - 32px))`) qui cassait la largeur de **tous les dialogues** ; sur mobile ils passent en quasi plein écran, scrollent en interne (max-height), inputs plus grands, et la page ne défile plus horizontalement. ✅ _boucle #175 (build 1.9.109)._
- 📈 **Coach Poids — historique d'adhérence** : le score d'adhérence de chaque semaine est mémorisé (`adherenceHistory`), et une **mini-courbe** montre l'évolution du % sur les dernières semaines — pour voir si la régularité tient dans le temps. ✅ _boucle #174 (build 1.9.108)._
- 🎯 **Séances ciblées enrichies** : 7 objectifs corporels au lieu de 4 — ajout **🎯 Pecs**, **🏔️ Épaules** et **⚡ Full body** (une séance qui pioche un exercice par grande zone : jambes, dos, pecs, abdos, épaules). ✅ _boucle #173 (build 1.9.107)._
- 📏 **Coach Poids — mensurations & recomposition** : affiche le **tour de taille** + son delta depuis le début, et détecte la **recomposition** (poids stable mais taille qui baisse = tu perds du gras et gardes le muscle) — un signal plus fiable que la seule balance. ✅ _boucle #172 (build 1.9.106)._
- 📋 **Coach Poids — copier mon plan** : bouton qui met tout le plan (objectif + date cible, calories/macros, semaine type d'entraînement, journée d'assiette) dans le presse-papiers en texte propre, pour le garder ou le partager. ✅ _boucle #171 (build 1.9.105)._
- 🍽️ **Coach Poids — idées de repas concrètes** : chaque repas de la journée d'assiette (petit-déj/déj/dîner/collation) affiche un **exemple d'assiette réel** adapté au moment, avec bouton **« 🔁 Autres idées »** pour faire tourner les propositions. Concret : quoi mettre dans l'assiette pour approcher les kcal. ✅ _boucle #170 (build 1.9.104)._
- 📅 **Coach Poids — programmer la semaine type** : bouton « Programmer (4 sem.) » sur la semaine d'entraînement du Coach Poids → pose les séances (muscu / renfo / course) dans l'agenda sur 4 semaines (18:00, sans doublon). Le plan devient concret dans le calendrier. ✅ _boucle #169 (build 1.9.103)._
- ⚖️ **Coach Poids — ajustement calorique auto** : détecte la **stagnation du poids** (≥ 14 j / ≥ 3 pesées sans variation) et propose de baisser (perte) ou monter (prise) d'environ **125 kcal/jour**, avec la nouvelle cible affichée. ✅ _boucle #168 (build 1.9.102)._
- 🏁 **Récap de fin de séance guidée** : en cliquant « Terminer la séance », un bilan s'affiche (nb exercices · séries · **kg soulevés**) + les **records en vue** (comparaison aux records antérieurs), avant de confirmer l'enregistrement. ✅ _boucle #167 (build 1.9.101)._
- 🎯 **Cible de progression pré-remplie en séance guidée** : pendant un exercice chargé, une ligne « Cible du jour : X reps × Y kg » (double progression via progressionSuggestion) + les **champs charge/reps pré-remplis** avec la cible. Tu sais exactement quoi soulever. ✅ _boucle #166 (build 1.9.100)._
- 🏃 **Plan de course ≥ 4×/semaine** (panneau Ultra-trail) : génère une semaine de course (4/5/6 sorties : facile / tempo / fractionné / sortie longue), répartie sur la semaine (sortie longue le dimanche), avec durées et raison de chaque séance, et **bouton « Programmer (4 sem.) »** qui pose les sorties dans l'agenda. ✅ _boucle #165 (build 1.9.99)._
- 🎯 **Séances ciblées préconçues** (bibliothèque) : 4 boutons **🔥 Abdos · 💪 Bras · 🦅 Dos · 🦵 Bas du corps** qui composent une séance prête (meilleurs exercices de la zone, séries/reps) et la **lancent directement en guidée** (minuteur + suivi). ✅ _boucle #164 (build 1.9.98)._
- ⏱️ **Minuteur de repos façon appli de muscu + prêt mobile** (séance guidée) : gros affichage **m:ss**, **préréglages** 0:30 / 1:00 / 1:30 / 2:00 / 3:00, **vibration** en fin de repos (mobile), **écran maintenu allumé** pendant la séance (Wake Lock), et **dialogue plein écran + gros boutons tactiles** sur petit écran. ✅ _boucle #163 (build 1.9.97)._
- ⚙️ **Coach Poids — affiner l'estimation** (étape 6/6) : choix du **niveau d'activité** manuel (sédentaire→très actif, mémorisé) utilisé par le calcul de dépense à la place du proxy séances ; **recalage sur la tendance réelle** — date « réaliste » recalculée depuis le rythme mesuré + verdict (dans les temps / plus lent / plus rapide). ✅ _boucle #162 (build 1.9.96) — module Coach Poids complet._
- 🧭 **Coach Poids — coaching + checklist hebdo** (étape 5/6) : marche à suivre « comment y arriver » (5 étapes adaptées perte/prise/maintien) + **checklist d'adhérence de la semaine** avec **score %** calculé sur les données réelles (séances faites, protéines à la cible, hydratation, sommeil, pesée hebdo). ✅ _boucle #161 (build 1.9.95)._
- 🍽️ **Coach Poids — nutrition détaillée** (étape 4/6) : répartition des calories cibles sur 4 repas (petit-déj 25 % / déj 35 % / dîner 30 % / collation 10 %) avec **kcal + macros par repas**, et repères « quoi manger » adaptés à l'objectif (perte/prise/maintien) — renvoie vers « Cuisine du jour » pour des idées concrètes. ✅ _boucle #160 (build 1.9.94)._
- 🗓️ **Coach Poids — plan d'entraînement semaine** (étape 3/6) : semaine type adaptée à l'objectif (perte = course/renfo pour le déficit + muscu pour garder le muscle ; prise = priorité muscu ; maintien = équilibre), séances placées et espacées sur les jours dispo, avec durée et raison de chaque séance + note pédagogique. ✅ _boucle #159 (build 1.9.93)._
- 📈 **Coach Poids — projection graphique** (étape 2/6) : courbe de la **trajectoire prévue** (pointillés) vs les **pesées réelles** (ligne pleine + points), **jalon de mi-parcours** (poids visé + date), et ligne **« à ton rythme réel »** (recalage sur la tendance mesurée via weightTrend : cible dans ~N sem., ou alerte si la tendance ne va pas vers la cible). ✅ _boucle #158 (build 1.9.92)._
- 🎯 **Coach Poids — fondations** (nouveau panneau, onglet Progrès) : à partir du poids actuel, taille, âge, sexe et rythme d'entraînement, calcule métabolisme de base + dépense (TDEE), **calories & macros cibles** (protéines/glucides/lipides) et surtout la **date d'atteinte estimée** de la cible (rythme sûr ~0,6 %/sem). Début du module coach complet (muscu+course+nutrition) demandé par Adrien. ✅ _boucle #157 (build 1.9.91)._
- ⚡ **Générateur de séance express** (bibliothèque) : choisis une durée (15/20/30/45 min), l'app compose un circuit qui tient dans le budget en respectant les filtres zone & matériel actifs, puis **démarre la séance guidée** en un clic (minuteur + séries inclus). ✅ _boucle #156 (build 1.9.90)._
- ⚖️ **Équilibre poussée / tirage** (revue hebdo) : sur 4 semaines, compare les séries de poussée (pectoraux + épaules) et de tirage (dos) et alerte en cas de déséquilibre (ratio > 1,5 = trop de poussée, ajoute du dos) — évite le classique pecs ≫ dos, bon pour la posture. ✅ _boucle #155 (build 1.9.89)._
- 📈 **Garde-fou kilométrage** (panneau Ultra-trail) : compare le volume de course de la semaine à la précédente (règle des +10 %/sem.) et alerte si hausse > 30 % (risque de blessure), avec code couleur — build (10-30 %), stable, plus légère, ou hausse rapide. ✅ _boucle #154 (build 1.9.88)._
- 🗂️ **Filtre historique par exercice** : nouveau menu « Tous les exercices » (peuplé depuis les séances enregistrées) dans l'historique, cumulable avec le filtre discipline — pour retrouver toutes les séances où un exercice donné a été fait. ✅ _boucle #153 (build 1.9.87)._
- 💪 **Compteur de tonnage en direct** (séance guidée) : dans l'en-tête, « 💪 N séries · X kg » qui s'incrémente à chaque série validée (séries cochées uniquement). Retour immédiat sur l'effort accompli pendant la séance. ✅ _boucle #152 (build 1.9.86)._
- 🎯 **Suggestion « à privilégier aujourd'hui »** (panneau « Cette semaine ») : croise fraîcheur musculaire (#142) et volume hebdo (#138) pour recommander le groupe le plus reposé ET sous la cible de 10 séries — ex. « Dos — reposé (4 j) et sous ta cible (4/10 séries) ». ✅ _boucle #151 (build 1.9.85)._
- ⭐ **Exercices favoris** : étoile ★ sur la fiche d'un exercice pour le marquer favori (persistant, `exerciseFavorites`), badge ★ sur les cartes concernées et filtre **« ⭐ Favoris »** dans la bibliothèque (cumulable avec les autres filtres). ✅ _boucle #150 (build 1.9.84)._
- 📶 **Courbe du 1RM estimé** (panneau Progression) : sparkline du 1RM estimé (Epley, meilleur set du jour) sur les 8 dernières séances + delta coloré (▲/▼ kg), à côté de la courbe de volume. L'indicateur de force le plus parlant. ✅ _boucle #149 (build 1.9.83)._
- ⏱️ **Minuteur de repos amélioré** (séance guidée) : boutons **−15s / +15s** pour ajuster le repos en direct (borné 0–10 min) + **barre de progression** qui se vide pendant le décompte. Le bip de fin et le réglage son restent. ✅ _boucle #148 (build 1.9.82)._
- 🌙 **Tendance de forme (readiness)** (panneau Récupération) : mini-courbe du score de forme des 8 derniers check-ins + delta (▲/▼) pour repérer la fatigue qui s'accumule ou la récupération qui remonte. ✅ _boucle #147 (build 1.9.81)._
- 📈 **Courbe « Tonnage soulevé »** (graphiques 8 sem.) : total de kg soulevés par semaine (charge × reps × séries, séries validées prioritaires) — la métrique directe de progression en muscu, à côté de la charge d'effort, du focus, du sommeil et des révisions. ✅ _boucle #146 (build 1.9.80)._
- 🎚️ **Charges cibles selon % du 1RM** (panneau Progression, dépliable) : à partir du 1RM estimé de l'exercice, table 60/70/80/90 % avec charge (arrondie 0,5 kg), plage de reps et objectif (endurance / hypertrophie / force / force max). ✅ _boucle #145 (build 1.9.79)._
- ⛰️ **Synthèse course « données réelles »** (panneau Ultra-trail) : à partir des sorties `run` enregistrées — **km sur 7 j**, **km sur 4 sem.**, **nb de sorties**, **plus longue sortie** (km + date) — avec rappel « rallonge la sortie longue ~+10%/sem. max ». Complète les repères D+/sortie longue saisis à la main. ✅ _boucle #144 (build 1.9.78)._
- 🧰 **Filtre par matériel** dans la bibliothèque : nouveau menu « Tout matériel » qui liste les équipements présents (Poids du corps, Kettlebell, Gilet lesté, Trail…) avec le nombre d'exercices, pour ne voir que ce qu'on peut faire avec le matos dispo. Cumulable avec famille / zone / recherche / nouveaux. ✅ _boucle #143 (build 1.9.77)._
- 💪 **Fraîcheur musculaire** (panneau « Cette semaine ») : puces par groupe (abdos/bras/pecs/dos/épaules/jambes/fessiers) avec **jours depuis le dernier travail** et statut — prêt (≥ 2 j, vert), récent (< 2 j, orange), jamais. Résumé « Prêt aujourd'hui : … » pour choisir son split. ✅ _boucle #142 (build 1.9.76)._
- 🔎 **Fiche exercice personnalisée** (clic sur une carte de la bibliothèque) : bloc d'historique en tête — nb de séances + dernière date + total séries, **meilleure série** (charge × reps · 1RM estimé) ou meilleures reps (poids du corps), **cible de progression** du jour et **sparkline de volume** sur 8 séances. ✅ _boucle #141 (build 1.9.75)._
- 🏆 **Palmarès de force** (Athlète → Progrès) : tableau de tes **meilleures séries** par exercice (charge × reps) + **1RM estimé** (Epley), trié du plus fort au plus léger, 1ᵉ en or 👑. Vue d'ensemble de ta force à partir de tout ton historique. ✅ _boucle #140 (build 1.9.74)._
- 🏋️ **Volume de séries hebdo par groupe musculaire** (revue hebdo) : barres par zone (abdos/bras/pecs/dos/épaules/jambes/fessiers) avec **repère d'hypertrophie** — <10 séries « à augmenter » (orange), 10–20 « optimal » (vert), >20 « volume élevé » (rouge). Pilotage direct de l'objectif muscu. ✅ _boucle #138 (build 1.9.72)._
- 🎯 **Suggestion de progression (double progression)** dans le panneau Progression : lit la dernière séance chargée d'un exercice et propose la cible suivante — +1 rep jusqu'au haut de fourchette (8–12), puis **+2,5 kg** en repartant en bas. Retient la meilleure série (setLogs). ✅ _boucle #139 (build 1.9.73)._
- [x] **Export / import des données** (boucle autonome, fiabilité) : dans **Réglages → 💾 Sauvegarde & données**, boutons **⬇️ Exporter (.json)** et **⬆️ Importer** — via les dialogues Electron (fichier choisi par Adrien), écriture/lecture dans le **main** (taille bornée 20 Mo). Import passé par `normalizeState` (défensif) + confirmation. Portabilité vers un autre PC + sauvegarde manuelle. ✅ _boucle #85 (build 1.9.19)._
- [x] **Menu Réglages** (choix d'Adrien : « juste le menu ») — nouvelle page **⚙️ Réglages** (nav) : Apparence (thème/densité), **Rappels** (panneau rapatrié depuis Focus, sa vraie place), **Connexions sportives** (Strava/Polar « Bientôt », Garmin « Plus tard », avec l'explication honnête), accès aux réglages Calendrier. ✅ _boucle #73 (build 1.9.7)._
- ⏳ **Connecter Strava / Garmin / Polar** (OAuth réel) → **Vague S.8** : nécessite qu'Adrien enregistre une app développeur chez chaque service (Strava = faisable en solo → Client ID à me fournir ; Garmin/Polar = API partenaires gated).

## 🔧 Backlog actionnable — boucles autonomes (sans dépendance externe)

- [x] **B-1** Finisher / **retour au calme guidé** après chaque séance : `cooldownFor()` pur+testé (haut du corps / bas du corps / trail-course / général) → section repliable « 🧊 Retour au calme » dans la séance guidée, **ouverte automatiquement au dernier exercice**. Complète **5.2**. ✅ _boucle #58 (build 1.8.2)._
- [x] **B-2** **Purge des règles CSS mortes** (**3.2**) — analyse outillée (extraction des 366 classes définies × recherche de référence littérale + préfixes dynamiques `sheet-${}`/`art-${}`/`prio-${}`). **7 classes réellement mortes** retirées (ancien calendrier hebdo `agenda-item`/`agenda-panel`/`day-column`/`week-calendar` + ancien `trail-plan`/`trail-weeks`/`guided-log-fields`) dans calendar/theme/extras/trail.css. Les 14 classes « sans référence littérale » restantes sont **construites dynamiquement** (sprites photo + priorité) → conservées. **−1,9 Ko** CSS, **0 régression** (aucune de ces classes n'était portée par le DOM ; 112 tests + SMOKE OK). ✅ _boucle #61 (build 1.8.4)._
- [x] **B-3** États vides & libellés — **vérifiés : déjà cohérents** (« Aucun… / Rien… Ajoute… »), 10 nouveaux exercices tous complets (famille, cue, explain, goal, avoid, prescription). Rien à corriger. ✅ _boucle #59._
- [x] **B-4** **Couverture de tests élargie** : richesse coaching des 47 exercices verrouillée ; cas limites récurrence (fin de mois, 29 fév, passage d'année), série d'habitude (jour programmé manqué), **SSRF** (métadonnées cloud 169.254.169.254, IPv6 loopback, hôte `.local`). **106 → 110 tests.** ✅ _boucle #59 (tests-only, pas de build)._
- [ ] **B-5** _(option, prudent — **tenu en réserve, boucle #61**)_ Séparer les gros blocs de rendu d'`app.js` par domaine (**3.1**). **Décision : ne pas forcer.** `app.js` est un script **classique à portée globale** (103 définitions, handlers exécutés au chargement, chargé en dernier après `lib/`). Un découpage mécanique introduit des **dépendances d'ordre d'exécution** (const/handlers top-level non hoistés entre fichiers) → risque de régression réel, pour **zéro gain fonctionnel** et une couverture smoke (~35 checks) insuffisante à tout rattraper. À reprendre seulement avec un passage à des modules ES (`type="module"` + import/export explicites), qui rendrait la découpe sûre.

_Hors boucle auto (décision/action d'Adrien) : Vague S.8 restante (scan frigo, OAuth), signature de code, publication du lot 1.5.2→1.8.6._

---

## Vague 6 — UX : clarté & désencombrement _(en cours, choix d'Adrien)_
_Détail : [`AUDIT-UX.md`](AUDIT-UX.md). Adrien a retenu : A1+A2, B1+B3, C1+B2, D1+D2._
- [x] **A1** Sections fantômes rattachées à leur page (agenda→dashboard ; trail/plan/revue→athlète). Fuites = 0. ✅ _boucle #27._
- [x] **A2** Sections repliables (16 panneaux), état mémorisé (`localStorage['irl-collapsed']`). ✅ _boucle #27._
- [x] **C1** Dashboard désencombré (approche prudente) : « Ma journée » remontée en tête (juste sous le profil) ; Mission Control + Boussole **repliés par défaut** au 1er lancement (dépliables). ✅ _boucle #28._
- [x] **C2** Formulaire d'agenda retiré du dashboard (doublon de l'onglet Calendrier) ; export `.ics` refactoré en `exportAgendaIcs()` (plus de dépendance au bouton supprimé) ; vue semaine conservée. ✅ _boucle #29._
- [x] **B2** Bibliothèque d'exercices sortie dans son **propre onglet « Exercices »** (nav `data-page="library"`) — retirée de la page Athlète (qui perd ~5000 px). Recherche/filtre fonctionnels. ✅ _boucle #29._
- [x] **B1** Page Athlète en **sous-onglets** (Séance · Mes progrès · Nutrition & Planning) : de 13 sections en un scroll → 3 onglets (7 / 6 / 2), état mémorisé (`irl-athlete-tab`). Répartition par assignation automatique (aucun découpage HTML risqué). ✅ _boucle #30._
- [x] **B3** Le sous-onglet **« Mes progrès »** regroupe tous les suivis (poids, mensurations, photos, historique, progression, tendances, graphiques, revue hebdo). ✅ _boucle #30._
- [x] **D1** Agenda unifié : un seul onglet **« Agenda »** (ex Ma semaine) avec bascule **Vue semaine ↔ Vue mois** (fini les 2 entrées de nav distinctes). ✅ _boucle #31._
- [x] **D2** Navigation regroupée : **7 → 6 onglets** (Aujourd'hui · Agenda · Athlète · Exercices · **Nutrition** · Focus & vie). Ultra-trail rangé dans Athlète (bouton contextuel dans le panneau trail). ✅ _boucle #31._
- [x] **Bonus — Nutrition promue en onglet top-level** (choix d'Adrien) : sortie du sous-onglet Athlète vers son propre onglet, pour accueillir de futures fonctions (scan du frigo → liste de courses → repas à partir du contenu du frigo, etc.). Le planificateur de semaine revient dans Athlète/Séance (sa vraie place). ✅ _boucle #31._

> ✅ **Vague 6 (UX) terminée** (boucles #27–#31, 2026-07-06). Installeur **1.1.7**.

### Nutrition — améliorations autonomes
- [x] **Hydratation du jour** (boucle autonome) : jauge 💧 + boutons **« + 1 verre » / −** dans le panneau Nutrition, sans avoir à remplir tout le journal. Affiche verres / objectif (8) + litres + « ✓ objectif atteint ». Met à jour l'entrée nutrition du jour (upsert). `waterStatus` pur + testé. ✅ _boucle #80 (build 1.9.14)._
- [x] **Jauge protéines du jour** (boucle autonome) : sous l'hydratation, une jauge **💪 Protéines** montre les g du jour vs la **cible personnalisée** (`proteinTarget` selon poids/objectif) — repère instantané pour la recomposition. Réutilise `pct` (déjà testé). ✅ _boucle #82 (build 1.9.16)._

### Nutrition — fait (boucle #32)
- [x] **Scan GitHub de jeux de données** + audit sécurité/licence : repos communautaires écartés (soit du code + API en ligne, soit CSV sans licence/source = risqué à embarquer). Choix sûr : **petit jeu d'aliments curé (valeurs domaine public type USDA)** embarqué hors-ligne. Voir `docs/AUDIT-DONNEES-GITHUB.md`.
- [x] **Timing des compléments AVANT / PENDANT / APRÈS** contextuel (`supplementTiming`) : Musculation / Course courte / Sortie longue / Forte chaleur → whey (après, pas avant la course), électrolytes (pendant, + avant/après selon chaleur), glucides.
- [x] **Recherche d'aliments** (`lib/foods-data.js`, `searchFoods`) : macros/100 g dans l'onglet Nutrition, base pour les repas.
- [x] **Vrai extrait CIQUAL 2020 (ANSES)** intégré : **2265 aliments** officiels (Licence Ouverte), catégorisés (P/F/L/R/D/G/S/B/M/A), recherche classée (aliments simples avant plats composés). XLS officiel parsé via SheetJS **hors ligne dans le scratchpad** (aucun code tiers embarqué). ✅ _boucle #33._

- [x] **Générateur de repas « frigo + envie »** (vraie demande d'Adrien : pas des repas équilibrés génériques mais selon ce qu'il a et son envie du jour) : inventaire **« Mon frigo »** (ajout depuis la recherche CIQUAL), **envie du jour** (Équilibré/Léger/Protéiné/Réconfort + ancre texte « envie de… »), génération de repas depuis le frigo avec portions + kcal + protéines + ce qui manque. `generateMeals` pur + testé. ✅ _boucle #34._
- [x] **Liste de courses** depuis les manques : d'après le frigo + l'envie du jour, `buildShoppingList` liste les catégories manquantes (féculent/légume/laitier…) avec des aliments concrets à acheter + quantité estimée, bouton **Copier**. ✅ _boucle #35._

### Idées Nutrition à explorer (futur, demandé par Adrien)
- 📸 **Scanner le frigo** (photo → détection des aliments) → remplit « Mon frigo » automatiquement (nécessite reconnaissance d'image = IA/réseau → Vague Sécurité).
- [x] Préférer automatiquement les versions **cuites** : `searchFoods` classe désormais les aliments **cuits avant les crus** (kcal/100 g du cru trompeuses pour l'assiette), sauf si la requête contient « cru ». « riz » → riz cuit ~145 kcal en tête (au lieu du cru à 528). ✅ _boucle #51 (build 1.6.1)._
- 🍽️ **Suggestions de repas** à partir de ce qui est dans le frigo (anti-gaspi + budget).
- 🛒 Liste de courses intelligente, suivi macros/protéines relié à l'objectif.


---

## Vague 0 — Fondations & sécurité _(P0, indispensable avant tout)_

**Objectif : pouvoir rebuild le `.exe` et ne plus perdre de données.**

- [x] **0.1** Reconstituer une chaîne de build : `package.json` complet (deps `electron`, `electron-builder`), scripts `npm start` / `npm run dist`, config electron-builder, icône. → régénérer un `.exe` identique fonctionnellement. ✅ _boucle #02 — electron 33.4.11, `npm start` vérifié._
- [x] **0.2** `save()` robuste : `try/catch` sur `localStorage.setItem`, message clair si quota atteint, repli sur backup disque. ✅ _boucle #02._
- [x] **0.3** Sortir les **photos** du blob d'état → fichiers dans `userData/photos/` via IPC (`photos:save/read/delete`, entrées validées côté main = S.3 appliqué), state réduit à `{id,date,file}`, migration douce des anciennes photos base64, repli navigateur conservé. ✅ _boucle #04._
- [x] **0.4** Durcissement Electron : **icône de tray visible**, **verrou d'instance unique** (`requestSingleInstanceLock`), **CSP** dans `index.html`. ✅ _boucle #02._
- [x] **0.5** Filet de tests (Node, sans dépendance lourde) sur la logique pure. ✅ _boucle #03 — `src/lib/logic.js` (double export navigateur/Node), 6 tests `node:test` verts + harnais smoke-test renderer Electron qui capture les erreurs JS. `exercisePrescription`/`normalizeState` : extraction reportée (gros littéraux), déjà couvertes indirectement par le smoke-test._
- [x] **0.6** Gestionnaire d'erreurs global (`window.onerror` + `unhandledrejection`) : bannière non bloquante + `console.error`, l'UI ne casse plus. ✅ _boucle #03._

_Livrable : un `.exe` reproductible + données à l'épreuve du quota._

> ✅ **Vague 0 terminée** (boucles #02–#04, 2026-07-05/06).

---

## Vague 1 — Unification du calendrier _(P1, prérequis de l'intégration)_

**Objectif : un modèle d'événement unique, prêt à accueillir les révisions BTS.**

- [x] **1.1** Modèle d'événement unifié : `{id, title, date, time, durationMin, kind, source, refId?, completed}` — `normalizeAgendaItem` dans `lib/logic.js`, testée. ✅ _boucle #05._
- [x] **1.2** Migration douce : chaque entrée d'`agenda[]` passe par `normalizeAgendaItem` dans `normalizeState` (idempotent, `planId`/`refId` préservés, `source` déduite). ✅ _boucle #05._
- [x] **1.3** Cycle de vie cohérent : supprimer un événement du calendrier mensuel supprime aussi le plan lié (`planId`) et rafraîchit toutes les vues — bug orphelin de l'audit corrigé. ✅ _boucle #05._
- [x] **1.4** Catégorie **« Révision »** (`study`, ambre `#5a4a2b`) : selects des 2 formulaires, légende, styles hebdo + mensuel. ✅ _boucle #05._
- [x] **1.5** `.ics` amélioré : `buildIcs()` dans `lib/logic.js` (testée) — durée réelle (`durationMin`), UID stable `<id>@irllvpup`, échappement RFC 5545 complet, catégorie `study`, CRLF. ✅ _boucle #06._
- [x] **1.6** **Priorités** : champ `priority` (haute/normale/basse) dans le modèle + `normalizeAgendaItem` ; sélecteur au formulaire ; badge 🔴/🔵 et bordure dans « Ma journée », le mois et la semaine ; tri chronologique **puis** priorité à heure égale (`priorityRank`). ✅ _boucle #36._
- [x] **1.7** **Import Google Agenda / Apple Calendrier (.ics)** : `parseIcs()` dans `lib/logic.js` (testée) — dépliage RFC 5545, `SUMMARY`/`DTSTART`/`DTEND`/`UID`, journée entière (`VALUE=DATE`), UTC `Z`→local, durée déduite ; import de fichier **100 % local, sans réseau** ; `source:'imported'`, `refId:'ics-<uid>'` → réimport sans doublon via `mergePlannedEvents`. ✅ _boucle #36._
  - ⏳ **À venir (Vague S)** : synchronisation **automatique** live (OAuth Google / abonnement CalDAV Apple) — nécessite réseau + jetons → traitée dans la Vague Sécurité, comme le scan du frigo.
- [x] **1.8** **UX Agenda (passe « Agenda d'abord », choix d'Adrien)** : l'entrée Agenda (vue semaine) devient limpide — **ajout rapide** en tête (titre/date/heure/type/priorité + **journée entière**), **filtres** par type (sport/focus/vie/révision) et **haute priorité seulement**, bouton **⬇️ Importer (Google/Apple)** dans la barre d'outils, et affichage **« Journée »** pour le tout-la-journée (`allDay` porté par `todayItems`/`normalizeAgendaItem`). ✅ _boucle #37._
- [x] **1.9** **To-Do du jour** (demande d'Adrien : « ce qu'il y a à faire dans la journée autre que les rendez-vous ») — panneau **« À faire aujourd'hui »** sur le dashboard, sous « Ma journée ». Capture rapide, tâche **prioritaire (🔴)**, terminer (+5 XP), **report visible des tâches en retard** (`overdue`) avec bouton « → auj. » plutôt qu'un report silencieux (bonne pratique relevée en recherche web : Sunsama/TeuxDeux/Todoist). `normalizeTodo`/`todosForDay` purs + testés ; `state.todos`. Compte de tâches restantes ajouté au résumé de « Ma journée ». ✅ _boucle #38._

- [x] **1.10** **Vue Jour** (demande d'Adrien : « la vue semaine est petite, mets une vue par jour ») — sélecteur **📆 Jour / 🗓️ Semaine** dans l'agenda, **Jour par défaut** (mémorisé `irl-agenda-view`). Vue Jour = timeline lisible d'un seul jour (`renderDayView` sur `todayItems`), navigation ← → jour par jour, ajout rapide pré-réglé sur le jour affiché, valider/démarrer depuis la vue, filtres type/priorité appliqués. ✅ _boucle #41 (build 1.5.1)._
- [x] **1.11** **Anniversaires** (demande d'Adrien) — panneau « 🎂 Anniversaires » (page Calendrier) : ajout de proches (nom + date de naissance) ; `normalizeBirthday`/`birthdaysForDay` purs + testés ; `state.birthdays`. Récurrents chaque année, injectés dans `todayItems` → visibles en vue **Jour / Semaine / Mois** + **« Ma journée »**, avec l'**âge** calculé. Non validables. ✅ _boucle #42 (build 1.5.2)._
- [x] **1.13b** **Record de série d'habitude** (boucle autonome) : à côté de la série en cours 🔥, un badge **🏆 record** montre la **plus longue série jamais atteinte** (occurrences prévues consécutives réalisées, `habitBestStreak` pur + testé) — affiché quand le record dépasse la série actuelle (un objectif à battre). ✅ _boucle #79 (build 1.9.13)._
- [x] **1.13** **Habitudes quotidiennes (« Dailies » façon Habitica)** — panneau « 🔥 Habitudes du jour » sur le dashboard. `normalizeHabit`/`habitStreak`/`habitsForDay` purs + testés ; `state.habits`. Chaque habitude : jours prévus (défaut tous), **série (streak) 🔥** tolérante au jour non encore fait, **XP** à la validation (repris si décoché). Résumé « X/Y — parfait ✨ ». ✅ _boucle #47 (build 1.5.7)._
- [x] **1.14** **Détails d'événement + heure de départ** (demande d'Adrien) — chaque événement peut porter un **📍 lieu**, des **📝 notes** et un **🚗 temps de trajet (min)** ; `departureInfo()` pur+testé calcule l'**heure de départ conseillée** (heure − trajet) et, pour aujourd'hui, **« pars dans X min »** / « déjà l'heure de partir ». Affiché dans la vue Jour. Champs au formulaire d'ajout. ✅ _boucle #60 (build 1.8.3)._
  - [x] **1.14b — détails partout + édition** (Adrien : « c'est toujours impossible de mettre le trajet / une description ») : les champs **📍 lieu / 🚗 trajet (+🧭 Estimer) / 📝 notes** ajoutés à l'**ajout rapide** de la vue Jour/Semaine (avant, ils n'étaient que dans le formulaire de la vue mois → introuvables). Nouveau **bouton ✏️ sur chaque événement de la vue Jour** → boîte d'édition (titre, heure, type, priorité, journée entière, lieu, trajet, notes) + suppression. Estimation de trajet factorisée (partagée par les 3 formulaires). Flux réel vérifié (ajout détaillé + édition + conservation des champs). ✅ _boucle #71 (build 1.9.5)._
  - [x] **1.14c — édition partout + durée + report** (« améliore encore l'agenda ») : on peut désormais **éditer un événement depuis les 3 vues** — clic sur un chip **Semaine** ou un événement **Mois** ouvre la boîte d'édition (fini la **suppression accidentelle au clic** en vue mois). **Durée d'événement** (champ minutes) → l'**heure de fin** s'affiche en vue Jour (« 15:00 → 16:30 », défaut 1 h façon Google Agenda). Bouton **« → demain »** pour reporter un événement en un clic. Chips non-éditables (récurrents/plans/anniv) ne sont plus faux-cliquables. Flux réel vérifié (les 3 vues). ✅ _boucle #74 (build 1.9.8)._
  - [x] **1.14d — vue Jour en grille horaire** (« continue d'améliorer l'agenda ») : au-dessus de la liste, une **grille par heure** place les événements visuellement (position = heure, **hauteur = durée**, couleur = type). **Chevauchements côte à côte** (`dayColumns` pur + testé), **ligne « maintenant »** rouge pour aujourd'hui, clic sur un bloc → édition. La liste détaillée (actions valider/▶️/✏️/→demain) reste en dessous. Rendu vérifié par capture (dont un chevauchement en 2 colonnes). ✅ _boucle #75 (build 1.9.9)._
  - [x] **1.14e — clic sur un créneau libre = créer à cette heure** : cliquer une zone vide de la grille horaire calcule l'heure (au quart d'heure) et **pré-remplit l'ajout rapide** (date + heure) puis focus le titre. Flux réel vérifié (clic à 11:00 → ajout rapide réglé). ✅ _boucle #76 (build 1.9.10, boucle autonome)._
  - [x] **1.14f — vue Jour vivante** : la ligne « maintenant » et les compteurs « pars dans X min » se figaient au rendu → rafraîchissement **chaque minute** quand la vue Jour est affichée et qu'aucune boîte de dialogue n'est ouverte (ne touche pas au formulaire en cours). ✅ _boucle #77 (build 1.9.11, boucle autonome)._
  - [x] **1.14i — recherche dans l'agenda** (boucle autonome) : champ 🔍 qui filtre les événements des vues Jour/Semaine par **titre, lieu ou notes** (insensible à la casse). `agendaMatch` pur + testé. ✅ _boucle #87 (build 1.9.21)._
  - [x] **1.14h — cliquer un jour (vue Semaine) → vue Jour** : dans la vue Semaine, cliquer une colonne de jour (hors événement) ouvre ce jour en **vue Jour** (curseur + libellé mis à jour). Flux réel vérifié. ✅ _boucle #83 (build 1.9.17)._
  - [x] **1.14g — alerte chevauchement (double-booking)** : dans la grille horaire, les événements qui se **chevauchent** sont **entourés d'ambre** et un badge **⚠️ chevauchement** apparaît dans l'en-tête du jour (réutilise `dayColumns`, déjà testé). ✅ _boucle #78 (build 1.9.12, boucle autonome)._
  - [x] **Trajet auto livré (S.8, build 1.8.5)** : point de départ + lieu → géocodage/itinéraire OpenStreetMap sans clé, bouton « 🧭 Estimer » qui remplit le trajet. Reste optionnel : détection **GPS live** de « où je suis » (nécessite une clé de géolocalisation Chromium) — le point de départ manuel couvre déjà le besoin.
- [x] **1.12** **Événements récurrents (moteur natif, sans dépendance)** — `recurrenceMatches(rule, dateKey)` + `normalizeRecurring` purs + testés ; `state.recurring`. Fréquences **quotidien / hebdo (jours au choix) / toutes les N semaines / mensuel / annuel**, avec date de début et **jusqu'au** optionnel. Formulaire repliable « 🔁 Événements récurrents » (Vue mois) + liste. Occurrences injectées dans `todayItems` → visibles Jour/Semaine/Mois/« Ma journée » avec marqueur **↻** (non validables). ✅ _boucle #46 (build 1.5.6)._
  - [x] **1c — Mettre en pause un récurrent** (boucle autonome) : bouton **⏸️ / ▶️** dans la liste des événements récurrents pour **suspendre** un rendez-vous répété sans le supprimer (ex. réunion en vacances). Champ `paused` (pur+testé) ; les occurrences en pause disparaissent de Jour/Semaine/Mois/« Ma journée » et des notifications. ✅ _boucle #84 (build 1.9.18)._
  - [x] **1b — Import RRULE** : `parseRRule` (FREQ/INTERVAL/BYDAY/UNTIL → règle interne) ; `parseIcs` remonte un champ `recurrence` ; à l'import, les VEVENT récurrents deviennent des **événements récurrents** (dédup par `refId` ics-uid), les ponctuels vont dans l'agenda. Testé + flux réel vérifié. ✅ _boucle #48 (build 1.5.8)._

> ✅ **Vague 1 terminée** (boucles #05–#06, 2026-07-06) · enrichie #36 (priorités + import .ics) · #37 (UX Agenda) · #38 (To-Do) · #41 (Vue Jour).

_Livrable : calendrier unifié, filtrable par type, prêt à recevoir une source externe idempotente._

---

## Vague 2 — Connexion Le Grand Livre Compta _(P1, la demande centrale)_

**Objectif : IRL LVP UP devient le hub qui te dit quoi faire — planning de révision BTS CG sur la durée, rappels du jour, notifications. On ne révise PAS dans IRL (les flashcards restent dans Le Grand Livre).**

> **Décision révisée (2026-07-05, soir) : pas de fusion des flashcards.** Adrien ne veut pas réviser depuis IRL LVP UP. Ce qu'il veut : (1) un **planning de révision sur la durée** visible dans le calendrier, (2) des **rappels de ce qu'il y a à faire dans la journée**, (3) des **notifications Windows**, (4) une app **complète** et **sécurisée** (voir Vague S). L'ancienne option « Fusion » est abandonnée ; on est sur un hybride A/B léger + planificateur interne.

Tâches :
- [x] **2.1** **Planificateur de révision interne** : formulaire dans la page Calendrier (matière, jours de la semaine, heure, durée, date d'examen) → `planStudySessions()` + `mergePlannedEvents()` (lib/logic.js, testées) génèrent les créneaux `study` jusqu'à l'examen. **Idempotent** : régénérer ne crée pas de doublon et préserve les créneaux déjà validés. ✅ _boucle #06._
- [x] **2.2** **Import du planning Grand Livre** : bouton « ⬇ Exporter planning » injecté dans `le-grand-livre-compta.html` (backup `.bak` créé) → JSON des cartes dues par date ; import côté IRL (`glcPlanningToEvents`, validation défensive S.5, refId `glc-<date>` idempotent). ✅ _boucle #09._
- [x] **2.3** **« Ma journée » au premier plan** : section sur le dashboard listant chronologiquement séances (démarrables), créneaux de révision (validables), blocs agenda + compteur de quêtes — `todayItems()` testée, plans orphelins inclus. ✅ _boucle #07._
- [x] **2.4** **Notifications enrichies** : résumé du matin au 1er rappel + **rappel X min avant chaque bloc** (réglable 5–60, une notif par événement/jour) + **rappel du soir** (heure réglable, désactivable) s'il reste des blocs/quêtes. Réglages validés côté main (S.3), compat rétro, fix du bug de date UTC (00h–02h). ✅ _boucles #07–#08._
- [x] **2.5** XP « étude » : valider un créneau de révision = **+15 XP** (+1 Focus). ✅ _boucle #07._

_Livrable : tu ouvres l'app (ou pas : les notifs tombent toutes seules) et tu sais exactement quoi faire aujourd'hui, sport ET révision._

> ✅ **Vague 2 terminée** (boucles #06–#09, 2026-07-06).

---

## Vague S — Cybersécurité _(P1, transverse et continue)_

**Objectif : app sûre par défaut aujourd'hui (100 % locale), et prête à être connectée à internet sans s'exposer.**

Déjà en place (Vague 0) : `contextIsolation: true`, `nodeIntegration: false`, CSP (`script-src 'self'`), instance unique, préload minimal.

- [x] **S.1** **Sandbox renderer** : `sandbox: true` actif, préload validé sandboxé (smoke-test tourne lui aussi en sandbox). ✅ _boucle #10._
- [x] **S.2** **Verrouillage de navigation** : `will-navigate` → preventDefault + `setWindowOpenHandler` → deny. Aucune fenêtre/URL externe possible. ✅ _boucle #10._
- [x] **S.3** **Validation des entrées IPC côté main** : appliqué à `photos:*` (regex Data URL, taille bornée, nom regénéré anti path-traversal) et `notifications:save` (clamps + regex HH:MM). ✅ _boucles #04, #08._
- [x] **S.4** **Échappement HTML** : revue des `innerHTML` — toutes les saisies utilisateur (titres, notes, noms, pensées) passent par `escapeHtml` ; les sinks restants n'affichent que des données internes. ✅ _revue boucle #10 (à re-vérifier à chaque nouvelle feature)._
- [x] **S.5** **Imports défensifs** : restauration JSON (normalizeState), planning Grand Livre (`glcPlanningToEvents` : schéma strict, regex, bornes, cap 120 jours, 1 Mo max). ✅ _boucles #04, #09._
- [x] **S.6** **Hygiène dépendances** : `npm audit` intégré aux boucles ; **Electron monté 33 → 43.0.0** (purge ~18 CVE dont contournement d'intégrité ASAR). Résiduel : `tar` dans la chaîne electron-builder = **outillage de build uniquement** (jamais livré) — suivi, à purger avec electron-builder next (Vague 3). Lockfile commité. ✅ _boucle #10._
- [ ] **S.7** **Si connexion internet un jour** (préparé, pas activé) : allowlist stricte de domaines HTTPS, aucun code distant exécuté (pas de script tiers), secrets via `safeStorage` (chiffrement OS, jamais en clair dans le state), mises à jour signées uniquement, et CSP resserrée par domaine.
- [~] **S.8** **Fonctions réseau demandées, à ouvrir dans cette vague** (chacune = accès Internet explicite et minimal) :
  - [~] 🔁 **Mise à jour automatique** (electron-updater + GitHub Releases) — **code branché** (build 1.5.0) : vérif au démarrage, téléchargement en fond, bannière « Redémarrer & installer » ; erreurs avalées, seul le main parle à GitHub (HTTPS). **Reste à activer par Adrien** : créer le dépôt GitHub + renseigner `owner`/`repo` + `npm run release` avec `GH_TOKEN`. Voir `docs/AUTO-UPDATE.md`. Non signé pour l'instant (avertissement SmartScreen ; signature = étape future). _(Demandé par Adrien — 2026-07-07, boucle #40.)_
  - 📸 **Scan du frigo par photo** → reconnaissance d'image (IA/API) qui remplit « Mon frigo ». _(Demandé par Adrien — 2026-07-07.)_
  - [x] 🔄 **Sync agenda par URL (.ics/webcal)** — 1re brique S.8 (choix d'Adrien). Abonnement au lien privé Google/Apple : fetch **HTTPS uniquement** dans le **main** (`fetchIcs`, timeout 10 s, 5 Mo max, redirections https limitées, garde-fou anti-SSRF `normalizeCalendarUrl`/`isPrivateHost`), parsé par `parseIcs` (récurrents RRULE dépliés) ; **liens chiffrés `safeStorage`** ; renderer **inchangé** (CSP self, navigation bloquée) ; sync auto à l'ouverture + bouton manuel. Cadre : `docs/SECURITE-RESEAU-S8.md`. ✅ _boucle #52 (build 1.7.0)._
  - [x] 🧭 **Trajet auto : adresse → temps de trajet & heure de départ** (choix d'Adrien : OpenStreetMap sans clé). Point de départ (chiffré `safeStorage`) + lieu de l'événement → **géocodage Nominatim** puis **itinéraire OSRM** dans le **main** (`httpsGetJson`, **allowlist stricte** `isAllowedTravelUrl` = 2 hôtes OSM/OSRM, HTTPS, timeout 10 s, ≤ 2 Mo, ≤ 3 redirections, JSON parsé jamais exécuté). Bouton « 🧭 Estimer » qui remplit le champ 🚗 (voiture/vélo/marche), **opt-in strict** (rien ne part avant le clic). `isAllowedTravelUrl`/`buildGeocodeUrl`/`buildRouteUrl`/`haversineKm`/`travelModes` purs + testés ; flux réseau réel vérifié (Lorient→Rennes 156 km). Cadre mis à jour : `docs/SECURITE-RESEAU-S8.md`. ✅ _boucle #62 (build 1.8.5)._
  - 🔄 **Sync agenda OAuth complet** Google/Apple CalDAV (option « tout auto ») — plus tard si besoin (nécessite projet Google Cloud + flux OAuth). _(Demandé par Adrien.)_

_Principe : par défaut l'app n'a AUCUN accès réseau ; chaque ouverture future sera explicite, minimale et vérifiée._

---

## Vague 5 — Coaching haut niveau & contenu sport _(P1, demande d'Adrien)_

**Objectif : se comporter comme le coach d'un athlète de haut niveau. Plus de séances, mieux guidées, adaptées au matériel réel d'Adrien (poignées de pompes, gilet lesté, kettlebell, barre de traction — PAS de banc/box).**

- [x] **5.0a** Matériel corrigé : `{handles, vest, kettlebell, pullup}` (fini le « banc »). Onboarding + profil + defaults + migration. ✅ _boucle #19._
- [x] **5.0b** Illustrations refaites : pictogrammes **SVG** par schéma de mouvement (`lib/exercise-icons.js`) — fini les photos coupées/mal alignées. 10 patterns, couleur du thème, jamais tronqués. ✅ _boucle #19._
- [x] **5.0c** Étape figures SVG animées (2 positions + flèche) — remplacée par les vraies photos ci-dessous (gardées en repli). _boucle #53 (1.7.1)._
- [x] **5.0d** **Vraies illustrations photo restaurées** (Adrien : « les anciennes images de ChatGPT étaient très bien, on voyait un humain »). Les 5 planches `assets/exercise-illustrations-v1..5.png` (humain, fond assorti au thème, **30 cases** dont certaines à 2 positions = swing, mollets) sont remises via sprite CSS ; `EXERCISE_ART` mappe **31 exercices** à leur photo, `exercisePicture()` centralise (carte, fiche, séance guidée, vignettes). **Correction du vrai bug** d'avant : les 6 exercices barre/traction (sans photo) affichaient une mauvaise case → repli SVG en attendant. Rendu vérifié par capture : aucune coupe, y compris poses larges (hollow hold, dead bug, superman). ✅ _boucle #54 (build 1.7.2)._
- [x] **5.0e** **6e planche = les tractions** : Adrien a généré (ChatGPT) la planche manquante (`exercise-illustrations-v6.png`, 1536×1024, même style/fond, p0 pronation · p1 supination · p2 négative · p3 dead hang · p4 relevés genoux · p5 rowing australien). Intégrée (`.sheet-6`, `EXERCISE_ART`) → **les 37 exercices ont désormais une vraie photo d'humain**. Test verrouillé (`icons.test.js` : tous couverts) ; cadrage vérifié par capture. ✅ _boucle #55 (build 1.7.3)._
- [x] **5.0f** **Planches 7 & 8 = les 10 exercices trail-hybride** : Adrien a généré (ChatGPT) les 2 dernières planches (`exercise-illustrations-v7/v8.png`, 1536×1024, même personnage/fond). Planche 7 (squat sauté · fentes sautées · montées de genoux · sauts de cheville · pont fessier une jambe · good morning KB) + planche 8 (Nordic curl · Turkish get-up · équilibre unipodal · planche touches d'épaule). Intégrées (`.sheet-7`/`.sheet-8`, `EXERCISE_ART`) → **les 47 exercices ont désormais une vraie photo d'humain** (plus aucun repli SVG). `icons.test.js` verrouille que les 47 rendent une photo ; alignement des cases vérifié par capture (aucune coupe). ✅ _boucle #63 (build 1.8.6)._
- [x] **5.1** **Exercices barre de traction + poignées** : Tractions, Tractions supination, Tractions négatives, Rowing australien, Suspension barre (dead hang), Relevés de genoux suspendu, Pompes déficit — 7 fiches complètes (cue, exécution, objectif, à éviter). Mappées aux icônes. **Bibliothèque : 30 → 37 exercices.** ✅ _boucle #20._
- [x] **5.1b** **+10 exercices ciblés ultra-trail hybride** (demande d'Adrien, choix « tout ») — **Puissance/plyo** : squat sauté, fentes sautées, montées de genoux (A-skips), sauts de cheville (pogos) ; **Chaîne postérieure/anti-blessure** : pont fessier une jambe, good morning kettlebell, Nordic curl (ischios excentrique) ; **Stabilité/proprio** : Turkish get-up kettlebell, équilibre unipodal, planche touches d'épaule. Fiches complètes (cue/exécution/objectif/à éviter), matériel réel. **Bibliothèque : 37 → 47.** ✅ _boucle #56 (build 1.8.0)._
  - [x] **Intégrés aux programmes** : nouvelle séance **« Puissance & prévention »** dans _Spécial trail & course_ (squat sauté, fentes sautées, sauts de cheville, Nordic curl, pont fessier une jambe, équilibre unipodal) + Turkish get-up (jour Puissance), Good morning KB (jour Jambes), Planche touches d'épaule (jour Tronc). Test d'intégrité programmes↔bibliothèque. ✅ _boucle #57 (build 1.8.1)._
- [x] **5.9** **Objectifs physiques par zone** (demande d'Adrien : « objectif 6-pack, gros biceps, grosses jambes… ») — sélecteur **🎯 Objectif** dans la bibliothèque : Abdos 🔥 · Bras 💪 · Pectoraux 🎯 · Dos 🦅 · Épaules 🏔️ · Jambes 🦵 · Fessiers 🍑. Les 47 exercices sont tagués par **zone musculaire** (`EXERCISE_ZONES`, zone principale d'abord) ; choisir un objectif filtre la bibliothèque et **classe les exercices les plus ciblés en tête** (`goalMatch`/`goalRank` purs + testés). Test de couverture : chaque objectif ≥ 5 exercices, chaque exercice tagué. ✅ _boucle #64 (build 1.8.7)._
- [x] **5.10** **Programme « objectif en X semaines »** (Adrien : « y'a un moyen d'avoir les abdos au max d'ici 2 mois ? ») — depuis un objectif de zone, bouton **📅 Programme 8 semaines** : `buildZonePlan` (pur+testé) génère une **progression** (volume qui monte, **décharge toutes les 4 semaines**) sur les 5 exercices les plus ciblés + une **note honnête** (les abdos se révèlent surtout via l'alimentation). Bouton **« Programmer dans mon agenda »** → 24 séances (lun/mer/ven 18h) sur 8 semaines, **idempotent** (refId `zone-<zone>-<date>`, pas de doublon). Flux réel vérifié. ✅ _boucle #67 (build 1.9.0)._
- [x] **5.11** **Planificateur intelligent — « Ma semaine d'entraînement »** (Adrien : « l'app doit programmer ma semaine, muscu + renfo + runs, avec différents objectifs… elle doit être intelligente »). Page Exercices, panneau **🧠 Ma semaine** : coche **plusieurs objectifs** (bras, abdos, jambes, fessiers, pecs, dos, épaules) + nb de **séances muscu** + nb de **runs** → `buildTrainingWeek` (pur+testé) compose la semaine : répartit les zones sur les jours de force (exercices les plus ciblés par séance), intercale les runs pour **espacer les jours durs**, place la **sortie longue le week-end**, garde ≥ 1 jour de repos. Bouton **« Programmer dans mon agenda (4 semaines) »** → séances datées, idempotent (refId `week-…`). **Option « Muscu + run le même jour »** (Adrien : « je vais pas m'empêcher de courir parce que je fais de la muscu le matin ») → une journée porte muscu (18h) **et** run (07h30). Flux réel + idempotence vérifiés (les 2 modes). Rappel intégré vers la prépa révisions (Calendrier). ✅ _boucles #69-70 (builds 1.9.2-1.9.3)._
  - [x] **Séance guidée liée au programme** (Adrien : « il faut une vraie séance guidée liée au programme, surtout pour la muscu ») : les séances **muscu** créées par le planificateur / le programme par zone portent leur **liste d'exercices** (`workout` sur l'événement, propagé par `normalizeAgendaItem`/`todayItems`). Dans la vue **Jour**, un bouton **▶️ Séance** lance la **vraie séance guidée** (`openGuidedWorkout`) : échauffement, **photo animée**, séries × reps, **log kg/reps par série + minuteur de repos**, progression 1/N. Les runs n'ont pas ce bouton (comme demandé). Flux réel vérifié. ✅ _boucle #72 (build 1.9.6)._
  - [~] **Animer l'exécution** (Adrien : « je veux TOUTES les animer »). **Moteur prêt & validé** ; format retenu (choix d'Adrien à la génération) : **planche d'animation = 3 exercices × 2 poses** (ligne du haut = départ, ligne du bas = fin), autonome et cohérente. `buildAnimatedArt` empile 2 calques de la **même** planche (case A + case B) ; la case B clignote en alternance via CSS (`@keyframes exFrameFlip`, respecte `prefers-reduced-motion`). Activé par exercice via `EXERCISE_ANIM`. S'anime en **vue détail + séance** ; les vignettes restent fixes. **Les 47 exercices animés (boucles #66-70, builds 1.8.9→1.9.3)** : Adrien a généré 16 planches (9-24, 3 exercices × 2 poses, mêmes personnage/fond). Chaque colonne = un exercice (haut = départ, bas = fin) → `EXERCISE_ANIM` mappe **les 47** exercices à leurs 2 cases. Mapping vérifié planche par planche + rendu vérifié par capture 2 frames (planches 9, 11, 12, 19, 23). Test : les 47 exercices ont une animation. ✅ **Terminé.**
- [~] **5.2** **Programmes hybrides trail + force** : 3 programmes redessinés — « Hybride trail + force » (tirage/poussée · jambes/chaîne postérieure · puissance/tronc), « Force & tractions » (haut du corps), « Spécial trail & course » — avec `why` coaching (placement vs course, RPE). ✅ _structure de base boucle #20._ Échauffement (`warmupFor`) **et** retour au calme (`cooldownFor`, boucle #58) désormais explicites dans la séance guidée. ✅
- [x] **5.3** **Objectif de course + périodisation** : Adrien vise **150–200 km sur 2 ans** (ajustable semi/marathon/ultra). Section « Mon objectif » (page Ultra) : presets + distance + date → calcul automatique de la **phase** (Fondation → Base → Développement → Spécifique → Affûtage) avec focus du moment et sortie longue cible. `raceGoalStatus`/`racePhase`/`weeksBetween` purs + testés. ✅ _boucle #21._
  - **Compte à rebours J-XX** (boucle autonome) : `daysUntil` pur+testé → `raceGoalStatus.daysLeft` ; le bloc objectif affiche **« J-XX »** (jours) quand la course approche (≤ 60 j) et dans la ligne d'état. ✅ _boucle #88 (build 1.9.22)._
  - **Prochaine séance planifiée** (boucle autonome) : `nextTrainingSession` pur+testé (prochaine séance à venir, ignore l'heure passée le jour même, tri date+heure) → bouton **« ⏭️ Prochaine séance : … aujourd'hui/demain/dans X j »** sur la page Athlète (panneau Volume), clic → défile vers la liste des créneaux. ✅ _boucle #89 (build 1.9.23)._
  - **Dupliquer un événement** (boucle autonome) : `duplicateAgendaItem` pur+testé (nouvel id, repart « à faire », détaché de planId/recId, source non mutée) → bouton **« ⧉ Dupliquer »** dans le dialogue d'édition ; crée une copie et rouvre l'édition dessus. ✅ _boucle #90 (build 1.9.24)._
  - **Série hebdo de séances** (boucle autonome) : `weeklyWorkoutStreak` pur+testé (semaines lundi→dim consécutives avec ≥1 séance, grâce si la semaine en cours est encore vide) → badge **« 🔥 X sem. »** dans l'en-tête du panneau Volume (page Athlète) dès 2 semaines d'affilée. ✅ _boucle #91 (build 1.9.25)._
  - **Liste de courses cochable** (boucle autonome) : `remainingShopping` pur+testé + état persistant `shoppingChecked` ; chaque article de la liste se coche d'un clic (barré + estompé), compteur **« X articles à acheter / Tout est coché ✓ »**. ✅ _boucle #92 (build 1.9.26)._
  - **Frise 7 jours des habitudes** (boucle autonome) : `habitWeekMap` pur+testé (7 derniers jours : prévu/fait/aujourd'hui) → mini-frise de pastilles sous chaque habitude (vert = fait, contour rouge = prévu manqué, estompé = non prévu). ✅ _boucle #93 (build 1.9.27)._
  - **Courbe de volume par exercice** (boucle autonome) : `exerciseVolumeSeries` pur+testé (volume charge×reps×séries agrégé par jour, N dernières séances) → mini-graphe barres dans le suivi de progression, sous la dernière séance. ✅ _boucle #94 (build 1.9.28)._
  - **Tendance de poids + ETA cible** (boucle autonome) : `weightTrend` pur+testé (rythme kg/sem sur 6 dernières mesures, direction ↑/↓/→, semaines estimées vers la cible si le sens est bon) → ligne « ↓ Tendance récente : −0,5 kg/sem · reste −2 kg → cap vers ~4 sem. » sous la courbe de poids. ✅ _boucle #95 (build 1.9.29)._
  - **Protéines : ajout rapide** (boucle autonome) : boutons **+20 g / +30 g / −10 g** sous la jauge protéines (miroir du +/- eau), `bumpProtein` borné [0..500 g] et persistant. ✅ _boucle #96 (build 1.9.30)._
  - **Rappels qui tiennent compte du trajet** (boucle autonome) : `reminderAnchorMinutes` pur+testé (ancre = heure de départ = heure − trajet, sinon heure de l'événement) ; le rappel « avant chaque bloc » alerte désormais avant l'heure de **départ** (« 🚗 Pars bientôt · … trajet X min ») pour les événements avec trajet. ✅ _boucle #97 (build 1.9.31)._
  - **Série de jours de focus** (boucle autonome) : `dailyStreak` pur+testé (jours calendaires consécutifs avec ≥1 bloc de focus, grâce en cours de journée) → « 🔥 X jours de focus d'affilée » dans les stats de la page Focus, dès 2 jours. ✅ _boucle #98 (build 1.9.32)._
  - **Calendrier : clic sur un jour → vue jour** (boucle autonome) : chaque case du calendrier mensuel est cliquable (`data-cal-day`, curseur + survol) et ouvre la vue « jour » de cette date. ✅ _boucle #99 (build 1.9.33)._
  - **Évolution des mensurations** (boucle autonome) : `measurementDelta` pur+testé (1ʳᵉ vs dernière valeur > 0 par champ) → ligne « Depuis le début : Taille −3 cm · Bras +1 cm » sous l'historique, vert si l'évolution va dans le bon sens (taille ↓, bras/poitrine ↑). ✅ _boucle #100 (build 1.9.34)._
  - **Succès pilotés par les données** (boucle autonome) : `computeAchievements` pur+testé → **14 badges** calculés depuis l'état réel (séances, muscu, run, hydratation, focus×10, cap course, mensurations, poids, révisions, habitude…) remplacent les 3 badges codés en dur ; compteur « X / 14 ». ✅ _boucle #101 (build 1.9.35)._
  - **Objectif d'eau adaptatif** (boucle autonome) : `waterGoalFor` pur+testé → **+2 verres les jours de séance** (sudation), borné [1..20] ; la jauge d'hydratation affiche « +2 (jour de séance) ». ✅ _boucle #102 (build 1.9.36)._
  - **1RM estimé (Epley)** (boucle autonome) : `estimate1RM` pur+testé (charge × (1 + reps/30), arrondi 0,5, garde-fous reps 1–30) → ligne « 🏆 1RM estimé : X kg » dans le suivi de progression, calculée depuis la dernière série chargée. ✅ _boucle #103 (build 1.9.37)._
  - **Ratio charge aiguë:chronique (ACWR)** (boucle autonome) : `acuteChronicRatio` pur+testé (charge 7 j vs moyenne hebdo sur 28 j, charge = durée×RPE) → conseil de charge enrichi « Aiguë/chronique 1.2 (✅ zone optimale / ⚠️ pic — allège / charge en baisse) », alerte orange en cas de pic (> 1,5). ✅ _boucle #104 (build 1.9.38)._
  - **Bip de fin de repos** (boucle autonome) : signal sonore Web Audio (double bip) à la fin du minuteur de repos de la séance guidée, avec toggle 🔔 (persisté), pour ne pas fixer l'écran entre les séries. ✅ _boucle #105 (build 1.9.39)._
  - **Temps planifié du jour** (boucle autonome) : `dayPlannedMinutes` pur+testé (somme des durées des créneaux horodatés) → pastille « ⏱️ 2 h 30 planifiées » dans l'en-tête de la vue jour. ✅ _boucle #106 (build 1.9.40)._
  - **Allure de course (min/km)** (boucle autonome) : `runPace` pur+testé (distance + durée → m:ss/km) → allure affichée sur les séances de course dans le journal et le détail d'historique. ✅ _boucle #107 (build 1.9.41)._
  - **Logger les protéines d'un aliment** (boucle autonome) : bouton « 💪 +X » sur chaque résultat de recherche d'aliments → ajoute les protéines (pour 100 g) au total du jour (réutilise `bumpProtein`), en plus du bouton ＋ frigo. ✅ _boucle #108 (build 1.9.42)._
  - **Thème auto (système)** (boucle autonome) : `nextThemeMode`/`resolveTheme` purs+testés → le bouton thème cycle **auto → clair → sombre** ; en auto (🌗) l'app suit `prefers-color-scheme` et bascule en direct quand l'OS change. ✅ _boucle #109 (build 1.9.43)._
  - **Jours à la cible protéines** (boucle autonome) : `proteinDaysOnTarget` pur+testé (jours ≥ cible sur 7 jours, agrégé par date) → bilan hebdo nutrition enrichi « 💪 X/7 jours ≥ Yg ». ✅ _boucle #110 (build 1.9.44)._
  - **Sauter une occurrence récurrente** (boucle autonome) : `skipLog` + `recurringOccurs` purs+testés → bouton « ⤫ sauter » dans la vue jour pour ignorer **une seule** occurrence d'un récurrent (sans mettre toute la série en pause) ; respecté partout (vue jour, calendrier, rappels desktop). ✅ _boucle #111 (build 1.9.45)._
  - **Équilibre des zones musculaires** (boucle autonome) : `weeklyZoneCoverage` pur+testé (exercices par zone sur 7 j) → puces « Zones travaillées (7 j) : Jambes 2 · Dos 1 · Abdos 0… » dans la revue hebdo, zones négligées estompées. ✅ _boucle #112 (build 1.9.46)._
  - **Dette de sommeil 7 j** (boucle autonome) : `sleepDebtHours` pur+testé (heures manquantes sous 7,5 h, nuits renseignées, moyenne) → note « 💤 X h de retard sur 7 j » dans le conseil de récupération dès qu'elle est significative (≥ 3 nuits, ≥ 2 h). ✅ _boucle #113 (build 1.9.47)._
  - **Durée estimée de la séance guidée** (boucle autonome) : `sessionMinutes` pur+testé (somme des durées d'exercices) → « ≈ X min » dans l'en-tête de la séance guidée, pour planifier avant de démarrer. ✅ _boucle #114 (build 1.9.48)._
  - **Célébration de nouveau record** (boucle autonome) : `newRecords` pur+testé (compare records avant/après une séance) + helper toast in-app → « 🎉 Nouveau record : Tractions 12 reps ! » à l'enregistrement d'une séance qui bat une charge/reps. ✅ _boucle #115 (build 1.9.49)._
  - **Volume de course semaine vs semaine-1** (boucle autonome) : `runKmInWindow` pur+testé (km de course sur une fenêtre) → délta « ▲ +6 km vs sem-1 » dans les stats hebdo de la page Ultra (charge de course progressive). ✅ _boucle #116 (build 1.9.50)._
  - **Statistiques « à vie »** (boucle autonome) : `lifetimeStats` pur+testé (total séances, minutes de sport, km courus, blocs+minutes de focus, XP total) → rangée de cartes en tête de la Collection de trophées (page Focus). ✅ _boucle #117 (build 1.9.51)._
  - **Célébration de montée de niveau** (boucle autonome) : `leveledUp` pur+testé (nouveau niveau si l'XP franchit un palier) → toast « 🆙 Niveau X ! <titre> » détecté centralement dans `renderDashboardCore`, quelle que soit la source d'XP. ✅ _boucle #118 (build 1.9.52)._
  - **Fiabilité : smoke propre + toasts dismissables** (boucle autonome) : stubs IPC manquants (`travel:*`, `update:*`, `data:*`) ajoutés au harness → plus d'erreur console parasite masquant une vraie régression ; toasts fermables au clic. ✅ _boucle #119 (build 1.9.53)._
  - **Dialogues fermables au clic sur le fond** (boucle autonome) : `bindDialogBackdropClose` → tout `<dialog>` se ferme en cliquant à côté (backdrop), en plus d'Échap/✕ — évite la sensation d'être « bloqué » dans un modal. ✅ _boucle #120 (build 1.9.54)._
  - **Coach hebdo : zone négligée** (boucle autonome) : `neglectedZone` pur+testé → la revue hebdo suggère la zone musculaire prioritaire non travaillée (« tu n'as pas travaillé les abdos cette semaine — ajoute un exercice ciblé ») quand tu as fait de la muscu mais sauté un groupe. ✅ _boucle #121 (build 1.9.55)._
  - **Bibliothèque : filtre « 🆕 Nouveaux »** (boucle autonome) : bouton bascule pour n'afficher que les exercices **jamais réalisés** (via `loggedExerciseNames`), combinable avec recherche/famille/objectif — pour découvrir de la variété. ✅ _boucle #122 (build 1.9.56)._
  - **Régularité d'hydratation hebdo** (boucle autonome) : `daysHittingTarget` pur+testé (généralise `proteinDaysOnTarget`) → le bilan hebdo nutrition ajoute « 💧 X/7 j ≥ 8 verres » à côté des protéines. ✅ _boucle #123 (build 1.9.57)._
  - **Compte à rebours d'examen BTS** (boucle autonome) : `examCountdown` pur+testé + état persistant `examGoal` → en générant le planning de révision, la date d'examen est mémorisée et affichée « 📚 BTS CG — J-XX (le JJ/MM) », en orange « dernière ligne droite » à ≤ 30 j. ✅ _boucle #124 (build 1.9.58)._
  - **Cohérence cible protéines** (boucle autonome, fiabilité) : le texte « cap indicatif » et le bilan hebdo utilisaient un `poids × 1,6` codé en dur alors que la jauge utilisait `proteinTarget(poids, objectif)` (1,8 en recomposition) → **cible unifiée** goal-aware partout (145 g pour le profil d'Adrien au lieu de 130). ✅ _boucle #125 (build 1.9.59)._
  - **Progression des révisions BTS** (boucle autonome) : `studyStats` pur+testé → sous le compte à rebours d'examen, « 📖 X/Y révisions faites · Z à venir » (agenda kind='study'). ✅ _boucle #126 (build 1.9.60)._
  - **Échéances clés au calendrier** (boucle autonome) : `keyDateMarkers` pur+testé → l'examen (📚) et la course objectif (🏁) apparaissent comme marqueurs colorés sur leur jour dans le calendrier mensuel. ✅ _boucle #127 (build 1.9.61)._
  - **Copier ma journée** (boucle autonome) : `dayPlanText` pur+testé → bouton « 📋 Copier » dans la vue jour qui met le planning du jour (heure + titre + ✓) dans le presse-papiers. ✅ _boucle #128 (build 1.9.62)._
  - **Refaire ma dernière séance** (boucle autonome) : `lastLoggedSession` pur+testé → bouton « 🔁 Refaire ma dernière séance » qui repropose les exercices de la dernière séance muscu/renfo (reprise d'une routine en un clic). ✅ _boucle #129 (build 1.9.63)._
  - **Temps planifié par jour (vue semaine)** (boucle autonome) : chaque jour de la vue semaine affiche son temps total planifié (« · 1h30 »), via `dayPlannedMinutes` — repérer les journées chargées d'un coup d'œil. ✅ _boucle #130 (build 1.9.64)._
  - **Rappel desktop d'examen** (boucle autonome) : `examReminderDue` pur+testé → notification aux paliers **J-30/14/7/3/1/0** avant l'examen BTS (« 📚 BTS CG : dans 7 jours »), une fois par jour au 1ᵉʳ créneau de rappel. ✅ _boucle #131 (build 1.9.65)._
  - **Score de forme du jour (readiness)** (boucle autonome) : `readinessScore` pur+testé (sommeil 40 % + fatigue 30 % + courbatures 30 %) → jauge colorée **0-100** avec verdict (« Prêt à pousser / Correct / Récupération prioritaire ») sur la carte récupération. ✅ _boucle #132 (build 1.9.66)._
  - **Export historique vers Excel** (boucle autonome) : `workoutsTable` pur+testé (TSV, séances triées récent→ancien) → bouton « 📊 Exporter (Excel) » qui copie l'historique d'entraînement dans le presse-papiers, collage direct dans un tableur. ✅ _boucle #133 (build 1.9.67)._
  - **Carte de régularité (heatmap)** (boucle autonome) : `trainingHeatmap` pur+testé (grille type GitHub, 8 semaines, alignée lundi par colonne) → mini-grille colorée des séances sur la page Athlète (intensité selon le nb de séances/jour). ✅ _boucle #134 (build 1.9.68)._
  - **Heatmap de régularité du focus** (boucle autonome) : réutilise `trainingHeatmap` sur les blocs de focus → même grille sur la page Focus pour visualiser la constance des révisions BTS. ✅ _boucle #135 (build 1.9.69)._
  - **Échéances clés sur le dashboard** (boucle autonome) : `upcomingKeyDates` pur+testé → puces « 📚 BTS J-XX / 🏁 Course J-XX » (dans les 60 j, triées par proximité, orange à ≤ 7 j) dans « Ma journée » — les grands caps toujours visibles. ✅ _boucle #136 (build 1.9.70)._
  - **Copier mon bilan de la semaine** (boucle autonome) : `weeklySummaryText` pur+testé → bouton « 📋 Copier mon bilan » dans la revue hebdo qui met un résumé (séances, km, focus, révisions, sommeil) dans le presse-papiers. ✅ _boucle #137 (build 1.9.71)._
  - _Note diagnostic : bug « impossible de taper dans les champs » signalé par Adrien **non reproductible** en 1.9.53 (frappe testée OK sur Dashboard/Nutrition/Agenda via le vrai renderer) → très probablement une install pas encore à jour ; correctif = réinstaller le Setup 1.9.53._
  - **Paliers intermédiaires** (`intermediateGoals`, testé) : échelle de courses croissantes échelonnées vers l'objectif (ex. ultra 170 km/2 ans → Semi ~7 mois, 50 km ~13 mois, 100 km ~20 mois, puis 170 km). Affichés en timeline dans la section objectif. ✅ _boucle #22._
- [x] **5.4** **Guidage renforcé** : échauffement spécifique (`warmupFor`, testé) en tête de chaque séance guidée (encart repliable, adapté haut/bas/trail) + le compagnon d'entraînement affiche le **contexte de course** (objectif, échéance, phase). ✅ _boucle #26._

> ✅ **Vague 5 (Coaching) terminée** (boucles #19–#26, 2026-07-06). Installeur **1.1.5**.
- [x] **5.9c — Badge « déjà fait »** (boucle autonome) : dans la bibliothèque, les exercices déjà réalisés au moins une fois affichent un badge **✓ déjà fait** (bordure teintée) — suivi de couverture, motive à essayer les mouvements jamais faits. `loggedExerciseNames` pur + testé. ✅ _boucle #86 (build 1.9.20)._
- [x] **5.9b — Records personnels** (boucle autonome) : la fiche d'un exercice affiche **🏆 Record perso** (meilleure charge en kg, ou meilleures reps pour le poids du corps) calculé sur tout l'historique de séances (`personalRecords` pur + testé, séries `setLogs` incluses). ✅ _boucle #81 (build 1.9.15)._
- [x] **5.8** **Montée en volume sécurisée** : de ton volume actuel vers ta cible (km/sem) sur une date — gain hebdo plafonné (~12 %) + semaine de décharge/4. Dit la cible de cette semaine, ce que tu atteindras réellement à la date, et **est honnête si c'est trop rapide** (propose la durée réaliste). `volumeRamp` pur + 3 tests. Cas Adrien (15→50 fin août) : atteint ~30 km, 50 km réaliste vers 14 sem. ✅ _boucle #25._
- [x] **5.7** **Planning hebdo adaptatif** : tu coches tes jours (jusqu'à 7), l'app répartit automatiquement course facile / sortie longue / force / fractionné, espace les jours durs (jamais 2 collés), place la sortie longue le week-end et n'ajoute du fractionné qu'en phase avancée. Régénérable chaque semaine selon ton emploi du temps (retire les anciens créneaux auto, garde les manuels). `buildWeekPlan` pur + testé (6 tests). ✅ _boucle #24._
- [x] **5.6** **Compléments & ravitaillement** : panneau (page Athlète) — Whey (Overstims) : cible protéique personnalisée (g/kg selon objectif) + timing (post-muscu, collation, repos) ; **électrolytes en course** dosés par heure (boisson + sodium) **ajustés à la chaleur** (Frais → Très chaud). `proteinTarget`/`hydrationPlan` purs + testés. ✅ _boucle #23._
- [x] **5.5** Mouvements sans banc/box : Step-up et Step-down reformulés sur **escalier**, pompes inclinées sur **plan de travail/rambarde**. ✅ _boucle #20._

---

## Vague 3 — Qualité & maintenabilité _(P2)_

- [~] **3.1** Découper `app.js` : logique pure dans `lib/logic.js` ✅, données statiques (30 exercices + 3 programmes) dans `lib/exercises-data.js` ✅ (_boucle #13_, app.js 100 Ko → 93 Ko). Reste (optionnel) : séparer les gros blocs de rendu par domaine.
- [x] **3.2** Rationaliser les CSS : **19 → 15 fichiers** (4 `-plus` fusionnés dans `extras.css`, `audit.css` dans `pages.css`, ordre de cascade préservé, _boucle #12_) **+ purge des règles mortes** (B-2 : 7 classes obsolètes retirées, analyse outillée, 0 régression, _boucle #61_). ✅
- [x] **3.3** Rendu ciblé : `renderDashboardCore()` (léger) pour les actions fréquentes — quêtes, défi, pas de vie, focus, validation Ma journée — au lieu du `render()` complet (20 sections). Le `render()` global reste pour les changements larges (séances, restauration). ✅ _boucle #12._
- [x] **3.4** Couverture de tests étendue : **23 → 31 tests**. Calcul de prescription extrait en pur (`prescriptionFor`/`formatFor`), + cas limites (bornes, familles, titres hostiles XSS, ICS multi-événements, listes vides). ✅ _boucle #14._

---

## Vague 4 — Fonctionnalités produit _(P2/P3, selon tes priorités)_

Priorités choisies par Adrien (2026-07-06) : **les 4** — graphiques, Ma semaine, PDF hebdo, thème clair.
- [x] **4.1** Graphiques enrichis : 4 histogrammes sur 8 semaines (charge d'entraînement, focus/semaine, sommeil moyen, révisions validées) — `weeklyAggregate()` pur + testé, SVG maison, dans la page Athlète. ✅ _boucle #15._
- [x] **4.2** Export PDF hebdo : bouton « 🖨️ Bilan PDF » (page Ma semaine) → vue imprimable A4 paysage (KPI sport/focus/sommeil/révision + grille 7 jours + phrase de bilan) via `window.print()` + `print.css` (`@media print`). `weeklySummary()` pur + testé. Vérifié : `printToPDF` génère un PDF valide. ✅ _boucle #17._
- [x] ~~**4.3** Objectifs BTS CG intégrés au système d'XP~~ → déplacé en **2.5**.
- [x] **4.4** Vue « Ma semaine » : page lundi→dimanche, 4 types côte à côte (sport/focus/vie/révision, couleurs distinctes), compteurs d'équilibre, navigation semaine, aujourd'hui surligné. `weekItems()` pur + testé. Vérifiée par capture Electron. ✅ _boucle #16._
- [x] **4.5** Thème clair/sombre : bouton 🌙/☀️ dans l'en-tête, persistant (`localStorage['irl-theme']`), appliqué au boot (anti-flash). Surfaces refactorisées en variables (`--surface-2`, `--input-bg`) + `theme.css`. Bascule vérifiée (texte sombre/fond clair/panels blancs, Mission Control inclus). ✅ _boucle #18._

> ✅ **Vague 4 terminée** (boucles #15–#18, 2026-07-06). Installeur **1.1.2** livré.
- [ ] **4.6** Sauvegarde chiffrée / synchro multi-appareils (optionnel, casse le « 100 % local » — à discuter).

---

## Principe de travail (boucles autonomes)

- Je travaille par **boucles de 10–15 min**, chaque itération = un lot cohérent et testé.
- **À chaque boucle**, un récapitulatif horodaté est écrit dans `docs/recaps/` (voir `docs/recaps/`).
- **Commit git** à chaque lot stable (message clair, réversible).
- Rien de destructif sans filet : la baseline et chaque étape restent réversibles via git.

## Ordre d'exécution proposé

`0.x` (fondations) → `1.x` (calendrier unifié) → `2.x` (planning révision + rappels + notifications) → `S.x` (durcissement sécurité) → `3.x` (qualité), en tenant `4.x` comme réservoir priorisable. Les items `S.3`/`S.5` s'appliquent au fil de l'eau dès qu'un handler IPC ou un import est créé.
