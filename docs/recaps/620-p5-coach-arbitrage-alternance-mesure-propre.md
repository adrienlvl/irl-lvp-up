# #620 — Mesure P5 : arbitrage coach (`coachDayPriority`) + moteur alternance sondés → propres (sans bump)

## Contexte / choix de la boucle

Priorité de nuit = **coaching à fond** (`docs/DEMANDES.md`), mais §3 soumet le domaine `coach` à la
**rotation §4 bis** comme les autres. Contrôle des 5 derniers recaps avant de coder :

```
619 nutrition · 618 coach · 617 etudes · 616 robustesse · 615 sommeil
```

→ `nutrition` et `etudes` (les **2 derniers**) sont **bloqués** ; `coach`, `robustesse` et `sommeil`
apparaissent 1× → autorisés. Le backlog **nommé** (P1→P7) est **entièrement coché**, les propositions
coaching restantes (protéines #619, base d'exercices #610) et le Cap 3.0 (IDB/sync/sécurité) sont
**gated sur décision d'Adrien** ou **réservés au supervisé**. Plutôt que d'inventer une tâche, j'ai
appliqué la méthode **P5 — mesurer avant de supposer** (celle qui a marché #548/#575/#615/#616) sur les
deux surfaces qui portent le plus de valeur pour Adrien : la **synthèse coach du dashboard**
(`coachDayPriority`, réponse §3 à « quoi faire en premier ») et le **moteur alternance** (sa priorité
de vie n°1).

## Ce qui a été vérifié (rendu §4 ter + fuzzers)

**1. `coachDayPriority` — contrôle de cohérence §4 ter sur état CHARGÉ (pas le cas minimal du test).**
État réaliste « à la Adrien » (15 j d'entraînement, couchers ~5 h irréguliers → sommeil `urgent`,
protéines basses, 5 candidatures/semaine dont un entretien, 1 examen BTS, habitudes en demi-teinte).
La carte cumulée rendue **pour de vrai** :

```
primary : 🤝 Prépare ton entretien  (why : « Plus que 77 j avant la rentrée · un entretien, c'est
          là que tout se joue. »  action : « Renseigne-toi sur l'entreprise et prépare 2-3 questions »)
À rattraper (deduped) : 🌙 Sommeil déréglé — nuit courte et coucher irrégulier · 🔥 1 habitude à
          relancer · 💾 Sauvegarde tes données
```

**Courte, non redondante, hiérarchisée** : l'alternance (priorité absolue) tient la n°1, le signal
santé n°1 d'Adrien (sommeil déréglé, #618) remonte bien en « À rattraper » **sans doublonner** le focus,
aucune contradiction santé↔momentum. Le pavé de 620 car. que §4 ter traque **n'existe pas ici** :
l'`insight` fait 73 car., une seule clause. → **rien à curer**.

**2. `coachDayPriority` — fuzzer d'invariants (30 000 états aléatoires).** Vérifié qu'aucun item de
`deduped` ne porte le pilier déjà couvert par le focus ; que `defer` n'existe **que** si `reframed` ;
que `reframed` implique `primary.pillar === 'recuperation'` **et** un `defer` ; que l'item `readiness`
promu en n°1 ne reste jamais dans `deduped`. **0 anomalie.** La couche d'arbitrage/dédup (#606→#607,
affinée #614/#618) est **cohérente end-to-end**.

**3. `applicationStats` — fuzzer (40 000 états aléatoires).** Statuts, dates (−30…+9 j), scores,
champs manquants mélangés. Invariants testés : `weekReached === (weekCount >= weekGoal)`, `weekPct` et
`responseRate` bornés [0,100], `appliedToday ⇒ envoi daté aujourd'hui`, `streak ≥ 0` **et** `streak > 0
⇒ candidature aujourd'hui ou hier`. **0 anomalie.** Le cœur motivation alternance est **robuste**
(cohérent avec #553 qui avait déjà validé `normalizeApplication`/`mergeApplications`).

## Deux observations remontées — DÉLIBÉRÉMENT non modifiées (elles engagent Adrien, §5)

En lisant le focus alternance (`adaptiveCoachFocus`, `logic.js:5413-5427`), deux points de
**hiérarchisation** sont apparus. Aucun n'est un bug ; les deux **engagent la stratégie d'Adrien ou
exigent une donnée absente** → je les **signale** au lieu de trancher seul :

- **Ordre « postule » avant « prépare ton entretien ».** L'ordre est (1) pas postulé aujourd'hui →
  *postule* ; (2) relance en attente → *relance* ; (3) entretien au pipeline → *prépare-le*. Un
  entretien est donc la **dernière** priorité : un matin où Adrien a un entretien au pipeline mais n'a
  pas encore postulé, le coach dit « Postule » plutôt que « Prépare ton entretien ». On peut défendre
  que préparer un entretien (proche d'une offre) prime sur une n-ième candidature froide — **mais** la
  discipline du dépôt quotidien est le design assumé (CHANGELOG 2.0.88), et **sans date d'entretien** on
  ne sait pas si l'entretien est imminent ou déjà passé. Reclasser risquerait d'ânonner « prépare ton
  entretien » sur un entretien **déjà tenu** (statut `entretien` figé en attente de réponse). L'ordre
  actuel est donc le choix **le plus sûr** vu la donnée disponible → **inchangé**.
- **Pas de date d'entretien.** `normalizeApplication.date` = jour d'**envoi**, pas la date d'entretien.
  Un vrai « prépare ton entretien **le 24**, dans 3 j » demanderait un champ dédié (UI + modèle) → gros
  chantier qui engage Adrien, pas une retouche autonome.

## Conclusion

**Aucun défaut, aucune curation à faire, aucune capacité neuve à forte valeur non redondante** sur
l'arbitrage coach + le moteur alternance ce tour. Résultat **négatif assumé** (§4 bis.5 / P5 : « un
résultat négatif est un résultat »), documenté pour éviter qu'une boucle future re-laboure
`coachDayPriority`/`applicationStats` et re-fuzz ces mêmes cibles. Le point non évident à retenir :
**la carte coach cumulée est déjà courte et bien hiérarchisée sur état chargé** — le gisement §4 ter
(le pavé) est fermé ici ; les seuls angles restants (priorité entretien, date d'entretien) **engagent
Adrien**, ils sont ci-dessus.

## Versionnage / verify

**Pas de bump** (aucun effet utilisateur — recap seul, §2.6). `npm test` : **565 tests verts** (base
inchangée ; aucun fichier `src/` touché → renderer non impacté).

Domaine : robustesse
</content>
</invoke>
