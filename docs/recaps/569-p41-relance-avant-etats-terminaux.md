# #569 — P4.1 : `relanc` classé AVANT les états terminaux → funnel Alternance corrompu (2.0.192)

**Domaine : robustesse** (lignée regex-classification #446 / #551 / #568).

## Rotation §4 bis (contrôle AVANT de coder)

Les 5 derniers recaps : `athlete · coach · a11y · etudes · coach`.
- `coach` (priorité de nuit, DEMANDES.md) : dans le dernier recap (#567) **ET** 2× dans les 5
  (#567, #564) → **interdit** (§3 : la rotation prime même sur la demande de nuit).
- `athlete` : dans les 2 derniers (#568) → **interdit**.

→ Je sers la **2ᵉ demande d'Adrien** (avancer CAP 3.0 / qualité) avec une tâche **nommée** :
**P4.1** (chasse aux regex non ancrées de `jobStatusFromText`). Domaine `robustesse` absent des 5
derniers → autorisé.

## La cible P4.1 et la méthode

P4.1 vise trois motifs de `jobStatusFromText` (`logic.js`) : `/relanc/`, `/entretien|entrevue/` et
le seau `postule`. Méthode P4 appliquée à chacun : construire des phrases FR réalistes de cellule de
**statut** (l'entrée est la colonne statut du Sheets, pas un intitulé de poste), rejouer, prouver.

### `/entretien|entrevue/` (:333) — correct, pas de fix

Aucun mot FR ne contient « entretien » / « entrevue » dans un autre **sens de statut** ; le seul
homonyme (« entretien » = maintenance) n'apparaît pas dans une colonne statut. Il est déjà placé
**après** les états terminaux (fix documenté :329-332), donc « refusé après entretien » = refus. RAS.

### Seau `postule` (:336) — correct, pas de fix

`postule|envoye|candidat|attente|en cours|contacte|mail envoye|confirm` + tournures « prise de
contact » : tous testés **après** tous les états avancés/terminaux. Les collisions plausibles sont
neutralisées par l'**ordre** (« à contacter » → capté par `a_postuler` en tête ; « entretien
confirmé » → capté par `entretien` avant). RAS.

### `/relanc/` (:307) — FAUX POSITIF PROUVÉ (le vrai défaut)

La classe « mot-dans-mot » est **vide** pour `relanc` (aucun mot FR ne contient « relanc » dans un
autre sens — dit honnêtement, §4 bis.5). **Mais** la méthode P4 (phrases réalistes rejouées) a
révélé un défaut d'**ORDRE**, exactement celui corrigé pour `entretien` : `relanc` était testé en
**2ᵉ position**, AVANT `refus` (:313, :328), `accepte` (:325) et `entretien` (:333). Or `relance`
est le rang 2 du pipeline (`JOB_STATUSES`), **sous** entretien (3), accepté (4), refus (5).

Conséquence, sur des cellules réalistes du suivi d'Adrien :
- `« Relancé, sans suite »` → **relance** au lieu de **refus** (« sans suite » = refus).
- `« Relancé puis refusé »` / `« Relancé, finalement abandonné »` → **relance** au lieu de refus.
- `« Relancé, entretien décroché »` → **relance** au lieu d'**entretien**.
- `« Relancé, j'ai été pris »` → **relance** au lieu d'**accepté**.

Double corruption du module **prioritaire** d'Adrien :
1. `mergeApplications` (`logic.js:1061`) ne régresse jamais un rang → la candidature reste **figée**
   en colonne « Relancé » du funnel, re-sync après re-sync.
2. `applicationStats` (`logic.js:246`) compte `answered = entretien + accepté + refus` — **pas**
   relance : un refus-après-relance sort du « répondu » → **taux de réponse sous-évalué**.

## Le fix

Déplacement de `if (/relanc/.test(x)) return 'relance'` de la 2ᵉ position vers **juste avant le seau
`postule`** (après refus/accepté/entretien), avec commentaire expliquant la lignée entretien. `relance`
reste **avant** `postule` (rang 2 > 1) : « postulé puis relancé » = relance, « relancé sans réponse »
(pas de mot terminal) = relance. Une simple relance en cours est donc préservée ; seul le
« relancé PUIS <état terminal/avancé> » bascule désormais sur l'état final.

## Contrôle §4 ter

Pas de nouvelle prose (aucune note coach, un `insight +=` de moins n'est pas concerné) : la
modification change un **classement**, pas un texte cumulé. Vérifié par rejeu de scénarios de funnel
réalistes (5 phrases « relancé + X ») + non-régression (« Relancé » seul, « 2e relance », « postulé
puis relancé »). Entrée CHANGELOG relue (honnête : « un classement d'entonnoir plus juste, rien
d'ajouté »).

## Tests & vérif

+9 assertions dans `jobStatusFromText` (relance seule préservée × 4, bascule terminale × 5). Aucun
nouveau champ, aucune fonction. **528 tests + smoke verts** (`xvfb-run -a npm run verify`). Build
2.0.192.

**Bilan P4.1 :** les 3 motifs traités — `entretien` et le seau `postule` **corrects** (ordre déjà
protecteur), `relanc` **corrigé**. Reste côté P4 : **P4.3** (balayage du reste de `logic.js`).

Domaine : robustesse
</content>
</invoke>
