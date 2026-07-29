> **⚠️ REMPLACÉE le 2026-07-29 par [713-roadmap-long-terme.md](713-roadmap-long-terme.md).**
> Ce document reste comme trace du bilan de mi-parcours (55 itérations) : il visait une app
> « finie à court terme ». Adrien a demandé une vision long terme — c est le 713 qui fait foi.

# Roadmap vers l'application finale

*Écrite le 2026-07-29, après 55 itérations de boucle autonome et la release v2.12.1.*
*Tout ce qui est chiffré ici a été mesuré sur le dépôt, pas estimé.*

---

## 1. Où en est l'app, en chiffres

| Mesure | Valeur |
|---|---|
| Tests node | **665**, `# fail 0` |
| Checks bloquants dans le smoke | **253** |
| Fonctions pures exportées | **455** |
| → rendues directement à l'écran | **371** (82 %) |
| → consommées par une autre fonction rendue | **69** (15 %) |
| → réellement orphelines | **15** (3 %) — et ce sont des utilitaires (URL, sanitizers, code-barres), pas du coaching |
| Releases publiées | **12** (v2.5.1 → v2.12.1) |

**Ce que ça veut dire.** La liste des « pistes de profondeur non exploitées » qui a piloté les
itérations 20 à 50 est aujourd'hui **périmée**. Le stock de « fonctions qui calculent quelque
chose que personne n'affiche » est vidé. Les prochaines améliorations ne viendront plus du
câblage : elles viendront de ce que l'app ne sait pas encore faire.

### Ce qui est terminé et n'a plus à être rouvert

- **Plan d'unification (docs/recaps/711) : clos.** Un seul générateur de semaine, un seul
  planificateur d'agenda, un seul plancher calorique, une seule source pour « ta forme du jour »,
  une seule source pour « combien je pèse ». Les trois générateurs concurrents sont masqués.
- **Sécurité alimentaire.** Les rythmes agressifs restent proposés (décision d'Adrien), mais le
  risque est nommé : IMC visé, ce qui se dégrade, vers qui se tourner. Principe anti-restriction
  affiché avec chaque proposition de repas.
- **Ultra-trail intégré.** Le dénivelé et la sortie longue pilotent le Plan de bataille.
- **Méthode de travail.** Sonde avant de juger, garde-fou testé par mutation, un commit = un
  sujet. C'est ce qui a produit tous les défauts trouvés ; ça ne change pas.

---

## 2. Ce qui reste — quatre chantiers, dans l'ordre

### Chantier 1 — Les dettes vérifiées (court, précis, sans risque)

Chacune a été **constatée**, pas supposée.

1. ~~**Le champ dénivelé s'auto-gonfle.**~~ **RÉGLÉ le 2026-07-29 (itération 56).** Le champ
   était pré-rempli avec la SOMME hebdomadaire, que `#saveTrail` réenregistrait comme la valeur
   DU JOUR : trois clics sans rien taper faisaient 450 → 900 → 1350 → 1800 m. Le champ montre
   désormais la saisie du jour, les libellés disent « du jour », et les agrégats coercent les
   chaînes (`state.trail` n'est pas normalisé). Verrouillé par un check bloquant.
2. **Écrans jamais sondés en 390 px.** Focus & vie, Réglages, la vue jour, et les dialogues
   (fiche exercice, replanifier). Chaque sonde précédente sur un écran neuf a trouvé quelque
   chose ; il n'y a pas de raison que ceux-là fassent exception.
3. **Le markup masqué.** Trois générateurs sont masqués par `hidden`, avec leurs fonctions et
   leurs écouteurs. C'est volontairement réversible. Après une période d'usage réel sans manque
   ressenti, décider : suppression franche (et allègement des tests qui les protègent) ou
   conservation définitive. **Décision d'Adrien, pas avant octobre.**

### Chantier 2 — L'intelligence qui manque encore

L'app donne aujourd'hui un excellent avis **par sujet**. Ce qu'elle ne sait pas faire, c'est
**arbitrer entre les sujets sous contrainte**. Trois propositions — chacune à valider par une
sonde avant d'écrire une ligne, selon la méthode maison.

1. **L'arbitrage sous budget de temps.** Toutes les pièces existent séparément : capacité
   journalière réglable, décompte d'examen BTS, politique d'entraînement, déficit calorique.
   Personne ne les fait dialoguer. Une semaine à 5 h disponibles avec un examen jeudi et un
   déficit en cours devrait produire une phrase du type *« on garde les deux séances de force,
   on sacrifie la sortie longue, et on ne creuse pas le déficit cette semaine »*. C'est le
   passage de « conseiller » à « décider avec toi ».
2. **La mémoire de ce qui a marché POUR TOI.** L'app sait ce que tu as fait ; elle ne sait pas
   encore corréler tes propres décisions à tes propres résultats sur plusieurs blocs. Exemple :
   « les trois blocs où tu as tenu 4 séances/semaine t'ont donné +8 kg au squat ; celui à
   3 séances, +2 ». Le socle existe (`blocksByObjective`, `bilanDeBloc`, `blockComparison`) mais
   la comparaison n'est jamais tirée jusqu'à la recommandation.
3. **Le coût annoncé de chaque choix.** Le sélecteur de nutrition le fait déjà très bien : tu
   choisis, l'app dit ce que ça coûte. Ce modèle mérite d'être étendu aux autres réglages
   (nombre de séances, jours choisis, objectif) — aujourd'hui ils s'appliquent sans que l'app
   dise ce qu'ils changent.

### Chantier 3 — La distribution, si elle a lieu

Adrien a posé la question (« si l'application est mise sur l'App Store »). Ce n'est pas du
code, c'est une check-list, et elle n'est pas commencée :

- Mentions de non-avis-médical au bon endroit (aujourd'hui présentes dans le compagnon, pas
  partout où l'app parle de poids ou de calories).
- Politique de confidentialité — facile à écrire honnêtement : tout est local, rien ne sort.
- Parcours de première ouverture pour quelqu'un qui n'est pas Adrien.
- Les garde-fous alimentaires sont déjà en place : c'est le point le plus sensible d'une app de
  suivi de poids, et il est traité.

### Chantier 4 — Le module Alternance

Décision déjà prise et consignée : **au 2026-09-01, si aucune alternance n'est trouvée, mettre
le module de côté** (désactiver ou masquer, jamais supprimer — réutilisable l'an prochain).
Rien à faire avant cette date.

---

## 3. Ce que « finie » veut dire

L'app sera finie quand ces cinq affirmations seront vraies **et vérifiées par un check
bloquant** :

1. Chaque écran a été sondé en 390 px au moins une fois, sans débordement ni champ sous 16 px.
2. Aucune donnée demandée à l'utilisateur n'est stockée sans être lue par au moins un écran.
3. Aucun sujet n'a deux voix : un chiffre affiché à deux endroits vient de la même fonction.
4. Toute phrase affirmative du coach est adossée à une mesure fraîche, et cite cette mesure.
5. Les réglages disent ce qu'ils coûtent avant d'être appliqués.

Les points 2 et 3 sont **atteints aujourd'hui**. Le point 4 l'est sur le sommeil, la nutrition,
le poids et l'entraînement — reste le focus et les révisions. Les points 1 et 5 sont les deux
vrais chantiers restants.

---

## 4. Ordre de marche proposé

| Ordre | Quoi | Pourquoi d'abord |
|---|---|---|
| 1 | Dette n°1 : le champ D+ qui se gonfle | Défaut confirmé, correction courte, risque nul |
| 2 | Sondes des 4 écrans jamais regardés | Chaque sonde neuve a trouvé un défaut jusqu'ici |
| 3 | Chantier 2.3 : le coût annoncé des réglages | Le modèle est déjà écrit et éprouvé côté nutrition |
| 4 | Chantier 2.1 : l'arbitrage sous budget | Le plus gros saut qualitatif, mais il faut 1 à 3 d'abord |
| 5 | Chantier 2.2 : la mémoire des blocs | Demande plusieurs blocs de données réelles pour être honnête |
| 6 | Chantier 3, si distribution | Décision d'Adrien |
| — | Chantier 4 | Date fixe : 2026-09-01 |

**Une règle qui ne change pas** : une itération = une amélioration menée jusqu'au bout, avec sa
sonde avant, son garde-fou testé par mutation après, et une revue adversariale toutes les trois
itérations. C'est ce qui a permis de trouver 40+ défauts réels, dont la moitié dans du code que
je venais d'écrire.
