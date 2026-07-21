# #666 — Coach : la note nutrition « forme basse » ne se déchire plus au rendu (build 2.0.272)

## Contexte / rotation
- **Priorité de nuit (DEMANDES.md)** : pousser le coaching adaptatif à fond, en QUALITÉ (§3 : corriger/
  souder/hiérarchiser, pas ajouter de note). Mission de nuit = non-visuelle (robustesse/tests/contenu).
- **Rotation §4 bis** — 5 derniers recaps par domaine : `tests(665), athlete(664), robustesse(663),
  alternance(662), fondations(661)`. `coach` **absent des 5** → libre, et aligné sur la priorité de nuit.
- Mémoire coach : tous les angles connus sont clos ; consigne = **angle NEUF prouvé en rendu chargé
  (§4 ter) avant de toucher**. C'est ce qui a été fait.

## Le défaut (prouvé en rendu chargé, §4 ter)
Méthode : fuzzer de rendu cumulé (`/tmp/coachrender2.cjs`, 6 000 états chargés réalistes) → repéré
seed 28 (pilier nutrition, readiness 48/100). Puis **détecteur générique de « notes déchirées »**
(`/tmp/coachtear.cjs`, 20 000 états) : compare l'ordre-auteur (`splitCoachSentences`) à l'ordre-rendu
(`orderCoachNotes`) et signale une prémisse non classée (défaut 4) suivie d'une conclusion classée
(rang < 4) qui la **dépasse** au tri → **170 occurrences** de cette note précise.

`readinessNutriGuard` (`logic.js:6583`) appende **une seule note de DEUX phrases** :
- Prémisse : « Un dernier repère pour aujourd'hui : ta forme est basse ce matin (readiness X/100), et
  les jours de fatigue sont ceux où l'assiette dérape le plus… » → `coachNoteUrgency` = **4** (défaut).
- Conclusion : « C'est justement aujourd'hui que tenir l'essentiel compte le plus : tes **protéines**,
  ton eau… » → **rang 3** (tier « intrants », via `protéines`).

`orderCoachNotes` trie **phrase par phrase** ; son soudage (#585/#592/#621) ne propage un rang que
**vers l'AVANT** (prémisse classée → conclusion défaut qui hérite). Ici c'est l'**inverse** : la
conclusion classée (3) remontait **au-dessus** de sa prémisse orpheline (4). Rendu cassé : on lisait
« c'est justement aujourd'hui que tenir l'essentiel compte le plus » **avant** d'avoir dit POURQUOI (la
prémisse « forme basse » tombait tout en bas, après d'autres notes). Le fil premise→conclusion rompu —
exactement la classe corrigée en **2.0.185** (#…), mais pour l'autre sens.

## Le correctif (§3, curation, zéro mot ajouté)
`logic.js:6583` — les deux phrases sont **soudées en une seule** (`. C'est` → ` ; c'est`).
`splitCoachSentences` ne coupe que sur `.!?` → une phrase unique n'est jamais séparée par
`orderCoachNotes` : la note voyage d'un bloc, dans l'ordre, à son rang d'intrant (3). Aucun mot
ajouté ni retiré, aucun autre champ touché (ripple zéro : seule la chaîne `insight` de cette branche
change, `readinessNutriGuard` inchangé).

**Pas de correction générale d'`orderCoachNotes`** : un soudage arrière (prémisse-défaut héritant du
rang de la conclusion classée suivante) rouvrirait la régression #592/#558 (une note neutre adjacente
à une alerte se ferait tirer vers le haut à tort). Le fix per-note est le motif établi (#621).

## Vérification
- Rendu seed 28 relu (§4 ter) : la note est un **seul élément** `orderCoachNotes`, prémisse→conclusion
  contiguës. Détecteur : la déchirure « C'est justement aujourd'hui… » **disparaît** (les 104
  occurrences restantes « Un dernier repère… » sont désormais la note ENTIÈRE qui remonte d'un bloc —
  comportement légitime, identique aux notes hydratation/légumes déjà classées rang 3).
- **Test verrouillant** (`logic.test.js`, test `readinessNutriGuard` étendu) : `orderCoachNotes(low.insight)`
  contient **exactement un** élément portant les deux moitiés, prémisse AVANT conclusion. Échoue sur
  l'ancien code (2 éléments séparés), passe après.
- Check smoke `coachCuration`/`coachFocus` : verts (les regexes testent des sous-chaînes de `.insight`
  qui n'enjambent pas la jonction — préservées).
- `cd src && xvfb-run -a npm run verify` → **578 tests + SMOKE OK**. Build **2.0.272**.

## Notes / pistes laissées ouvertes
- Le détecteur a aussi montré des notes « Objectif hebdo déjà tenu : N/M séances 💪 » **sans ponctuation
  finale** qui **fusionnent** avec la phrase suivante (phénomène distinct de la déchirure — une note qui
  n'a pas de `.!?` colle à la suivante dans `splitCoachSentences`). Non traité ce tour (hors périmètre,
  §3 = un fix chirurgical/itération) — **candidat coach NEUF** pour une prochaine boucle : les notes
  terminées par emoji sans point.

Domaine : coach
