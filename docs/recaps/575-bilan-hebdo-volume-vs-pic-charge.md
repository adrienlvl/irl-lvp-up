# #575 — Bilan hebdo : plus de « tu montes en volume » un jour où il faut alléger (2.0.197)

**Domaine : athlete** · build 2.0.197 · 531 tests + smoke verts.

## Rotation (§4 bis.3)

5 derniers domaines (mtime, avant cette boucle) = `fondations · coach · robustesse · a11y · coach`.
- `coach` (priorité de nuit #1) : dans les 2 derniers recaps (#573) **et** 2× sur 5 → **interdit** (§3 :
  la rotation prime même sur la demande de nuit — le code coach autonome est de toute façon épuisé).
- `fondations` : dans le dernier recap (#574) → interdit ; IndexedDB **réservé au supervisé**.
- `athlete` : **absent des 5 derniers** → autorisé.

Quota §4 bis.4 : `docs/proposals/` a changé au sein des 10 derniers recaps (#574, proposition
Sécurité) → quota **non** déclenché, itération de code permise.

Priorité de nuit #1 (coaching) rotation-bloquée → 2ᵉ demande d'Adrien (**avancer CAP 3.0 / qualité,
un peu de robustesse/cohérence**), tâche nommée **P5.1** (« Mesurer avant de supposer — longueur des
textes utilisateur ailleurs que le coach »).

## Méthode P5 : mesurer, pas supposer

Harnais de mesure (400 états chargés déterministes) sur les surfaces texte **hors coach** :

| Surface | p50 | p90 | max | verdict |
|---|---|---|---|---|
| `weeklySummaryText` (partage) | 176 | 177 | 177 | **borné** (6 lignes fixes) |
| `weeklyInsights` (join) | 214 | 289 | 289 | **borné** (capé `.slice(0,5)`, phrases courtes) |
| `dayPlanText` (copie du jour) | 256 | 475 | 660 | grossit avec le **nb d'items** (1 ligne/item, titres saisis par Adrien) — export presse-papier, **pas** un pavé à l'écran |

**La piste « pavé » de P5.1 est réfutée** pour les surfaces générées : elles sont structurellement
bornées (comme #548 a invalidé une piste sur 1 260 scénarios — un résultat négatif est un résultat).
Aucune troncature décimale non plus (`sleepAvg` arrondi propre, pas de piège type #570).

## Le vrai défaut trouvé : une contradiction sur le bilan hebdo (cohérence, cf. P5.2)

En mesurant, un état réaliste a fait sortir **deux insights contradictoires côte à côte** dans
`weeklyInsights` (le « Bilan hebdo » de la page Athlète — **pas** le coach) :

- 📈 (good) « +X min vs semaine dernière — **tu montes en volume**. »
- 🟥 (warn) « Charge en pic (ACWR 2.59) : prévois une **semaine plus légère** pour éviter la blessure. »

**Reproduit** sur une rampe réaliste (3 semaines légères → une semaine chargée, le scénario blessure
classique) : ACWR 2.59 (`zone: 'high'`) **et** +170 min vs semaine précédente → les deux poussent en
sens opposés le même jour, et le 📈 félicite **précisément** le risque que le 🟥 signale. Les deux
conditions co-occurrent naturellement : une rampe brutale gonfle à la fois le delta hebdo de minutes
**et** l'ACWR.

## Fix — curation, pas ajout (§3)

`weeklyInsights` (logic.js) : l'ACWR est calculé **avant** le bloc de tendance (`loadSpiking =
acwr.zone === 'high'`) ; la félicitation 📈 est gardée `&& !loadSpiking`. Le constat de **baisse**
(📉, « volume en baisse ») n'entre pas en conflit avec « allège » → conservé. Quand la charge est en
pic, seule reste l'alerte 🟥, cohérente. **Aucune note/champ ajouté** — une contradiction retirée.

Contrôle §4 ter (rendu cumulé relu) :
- Pic : `✅ 4/4 séances — objectif atteint` + `🟥 Charge en pic … prévois une semaine plus légère`
  (avoir tenu ses séances **puis** dé-loader = périodisation normale, pas une contradiction).
- Montée **saine** (ACWR 1.41, non-pic) : `📈 +70 min … tu montes en volume` **conservé** — la
  célébration d'une progression maîtrisée n'est pas touchée.

## Tests

- Logic : nouveau test `weeklyInsights : pas de « tu montes en volume » quand la charge est en pic` —
  état de pic (ACWR high vérifié en préalable) → pas de 📈, 🟥 présent ; + non-régression montée saine.
- Smoke : check `weeklyInsights` **étendu** (état de pic → contient « Charge en pic » et **pas**
  « montes en volume ») **et promu bloquant** — il était **défini mais jamais poussé dans `errors`**
  (même piège que #566/`a11yObjective`) → nouveau `errors.push` (« Bilan hebdo intelligent KO … »).

531 tests + smoke verts (`weeklyInsights:true`). Recap #575.

_Domaine : athlete_
