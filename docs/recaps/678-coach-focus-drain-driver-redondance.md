# #678 — Coach focus (jours À PLAT) : le driver « ce qui te plombe la tête » ne répète plus l'appel à l'action

**Build 2.0.279** · Domaine : coach · 2026-07-22

## Contexte & rotation
Priorité nuit = coaching en QUALITÉ (§3, curation). Rotation §4 bis (5 derniers recaps :
`etudes, robustesse, coach, docs, docs`) → `etudes`+`robustesse` (2 derniers) et `docs` (2×/5)
interdits ; **`coach` libre** (1× en #675, hors 2 derniers). Quota §4 bis.4 non déclenché
(#674 = proposition récente). Piste **nommée** au recap #675 (« le pendant NÉGATIF
`focusDrainDriver` n'a pas de note d'action jumelle au-dessus → candidat mineur si un futur
tour coach manque de piste »).

## Manque prouvé (§4 ter, cumul rendu chargé)
`focusDrainDriver` (`logic.js:5966`) est **imbriqué** dans la branche `readinessScore < 50` de
`adaptiveCoachFocus`, juste après `focusGoalDrained` — il s'ajoute donc **toujours** derrière lui
(collision **systématique**, exactement comme #672 côté positif). Le parent `focusGoalDrained`
porte déjà **l'appel à l'action** :

> « … un cerveau fatigué ne produit pas un vrai bloc profond, et **t'acharner** empilerait des
> minutes creuses… **Un focus court et facile aujourd'hui, soigne ta récup** — l'esprit frais
> rattrapera ces minutes bien plus vite. »

Et le driver RE-servait cette injonction :
- variante **sommeil** : « …recharge le sommeil ce soir … **pas l'acharnement du jour**. » →
  écho de « t'acharner » du parent.
- variante **fatigue** : « **le repos de ce soir vaut plus qu'un bloc forcé maintenant**, tu
  retrouveras un esprit bien plus tranchant demain. » → écho de « focus court et facile » du parent.

## Correctif — §3 curation (retirer, pas ajouter)
Le driver garde sa **seule valeur propre** — nommer le frein dominant + son mécanisme — et laisse
le parent porter **seul** l'appel à l'action (`logic.js:5970/5971`) :
- sommeil → « … ta nuit courte de X h — **recharge le sommeil ce soir, c'est lui qui remettra ton
  cerveau en état de deep work**. » (échoe « pas l'acharnement du jour » coupé)
- fatigue → « … ta fatigue générale (X/5) — **c'est ce réservoir vide qui émousse ta concentration,
  laisse-le se recharger et ton esprit sera bien plus tranchant demain**. » (« un bloc forcé
  maintenant » remplacé par le mécanisme + un levier distinct)

Deux redites en moins, **zéro champ ajouté**, valeur de retour `focusDrainDriver` inchangée.
Pendant NÉGATIF exact des nettoyages #672 (branche AVANCE) et #675 (branche SERRÉE positive) → la
famille `focus…Driver` est maintenant auditée pour la collision de queue sur les deux versants.

## Vérif
- `logic.test.js` durci : driver sommeil asserte `!/pas l'acharnement du jour/` **et** un seul
  `/acharn/` dans l'insight cumulé (celui du parent « t'acharner ») ; driver fatigue asserte
  `/émousse ta concentration/` **et** `!/bloc forcé maintenant/` (preuves de non-redite).
- Smoke `coachFocus` : volet `fDrainSleep` durci — bloquant `!/pas l'acharnement du jour/` + un
  seul `/acharn/`. Volets honnêteté (courbatures, freins à égalité) inchangés.
- `cd src && xvfb-run -a npm run verify` → **581 tests + SMOKE OK** (100 % vert).
- Bump **2.0.279** + CHANGELOG en tête + 2 assertions `CHANGELOG[0].v`.

## Suites possibles (non traitées ici)
La famille `focus…Driver` (fresh/drain, sommeil/énergie, branches AVANCE/SERRÉE) est désormais
auditée pour la collision de queue sur **les deux versants**. Prochain tour coach : angle NEUF
(pas re-labourer les drivers focus). Candidat mémoire : milestones « une semaine » redondants
(cf. `coach-leads-contradictions-2guards`).

_Domaine : coach._
