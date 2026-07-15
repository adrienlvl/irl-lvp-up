# #319 — Onglet Athlète : 3 zones + « Base d'endurance » conditionnelle (1.9.253)

## Demande d'Adrien

> « Relance la boucle autonome et fait les 2 »

Les deux propositions ouvertes de l'audit des onglets :
- **A** — regrouper l'onglet Athlète en 3 zones intitulées ;
- **C** — « Base d'endurance » visible seulement pour un profil trail/endurance.

Les deux touchent la même surface (la disposition de la Séance) → traitées ensemble en #319, qui
clôt la rotation 27.

## A — 3 zones intitulées

Le sous-onglet « Séance » est désormais rangé en trois zones avec intertitre :
- **▶️ Faire maintenant** — Ta décision du jour · Planifier la suite
- **🗺️ Mon entraînement** — programme, objectifs, profil, séances, poids… (tout le paramétrage)
- **🧘 Récupération & mobilité** — Routines guidées

### Le piège de structure (leçon)

Mon plan initial supposait chaque panneau = une `<section>` de premier niveau. **Faux, vérifié en
navigateur** : beaucoup de panneaux vivent groupés 2-3 dans des conteneurs `section.training-grid`
(mise en page responsive). « Base d'endurance » est même bundlée avec « Objectifs hebdomadaires »
dans la MÊME grille — impossible de les séparer en deux zones. Ma v1 déplaçait des panneaux
individuels → elle sortait un panneau de sa grille et en oubliait la moitié (profil, séances…),
laissés éparpillés.

**Correction (v2)** : on réordonne au niveau des **conteneurs** `section[data-atab="seance"]`, pas
des panneaux. On bucketise TOUTES les sections Séance dans les 3 zones (défaut = « Mon
entraînement ») et on les repose sous les intertitres. Les grilles restent intactes, rien n'est
oublié. Sans la vérification navigateur, j'aurais livré une mise en page cassée.

L'implémentation est au runtime (`organizeAthleteZones`, idempotent), car les sections Séance et
Progrès sont entremêlées dans le DOM — les bouger en HTML statique serait fragile. `.atab-zone`
ajouté à `pageGroups.athlete` pour que les intertitres se masquent hors onglet Athlète, et
`data-atab="seance"` pour qu'ils suivent le sous-onglet.

## C — « Base d'endurance » conditionnelle

Fonction pure `showsEnduranceBase({goal, fitnessObjective, raceGoalDate})` : le panneau trail
(dénivelé, sortie longue, plan de course, ultra) ne s'affiche que si objectif profil « trail », OU
objectif sportif « endurance », OU une course est programmée. Pour un profil force/muscle, c'est du
bruit → masqué (`.endurance-hidden`). Vérifié que trail-panel ne contient PAS la config de course
elle-même (sinon on créerait un cercle vicieux) — il est sûr à masquer.

## Vérification navigateur

| Contrôle | Résultat |
|---|---|
| 3 intertitres dans le bon ordre, sous-onglet Séance | ✅ |
| Panneaux regroupés sous la bonne zone (grilles intactes) | ✅ |
| force/muscle → « Base d'endurance » masquée | ✅ |
| trail / endurance / course programmée → visible | ✅ (3/3) |
| Onglet Progrès : 0 intertitre visible, plan visible | ✅ |
| Autre page (dashboard) : intertitres masqués (`app-page-hidden`) | ✅ |

## Tests

347 tests `node:test` (+ `showsEnduranceBase`) + smoke `athleteZones` **bloquant** (3 intertitres,
zone de chaque panneau clé, trail conditionnel).

## Rotation

#319 **clôt la rotation 27** → tag `v1.9.253` (auto-publie). Restent : rien d'ouvert de l'audit
(A/B/C tous faits). La boucle autonome reprend ensuite (#320, rotation 28).
