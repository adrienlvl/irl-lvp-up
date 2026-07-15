# #331 — Onglet Poids : saisie du poids du jour sur place (1.9.265)

## Le manque

Après avoir sorti le Coach Poids dans son propre onglet (#329), un trou est apparu : la **saisie du
poids** (`#weightInput`) est restée dans **Athlète → Séance** (dans un panneau groupé avec
workout-panel). Donc sur l'onglet Poids on voyait la cible, les paliers et le plan… mais on ne
pouvait pas **logger son poids** — il fallait retourner dans Athlète. Incohérent, surtout avec le
conseil « pèse-toi 2-3×/semaine » ajouté au #328.

## Ce qui change

Une **saisie rapide « ton poids aujourd'hui »** en tête de l'onglet Poids :
- champ + bouton « Enregistrer » qui écrit dans `state.weights` ;
- **une pesée par jour** : ré-enregistrer le même jour remplace (pas de doublons) ;
- une ligne **« Dernière pesée : X kg · il y a N j »** avec un rappel **⏰ Pense à te repeser** au-delà
  de 4 jours (renforce le conseil de fréquence) ;
- après enregistrement, le plan et les paliers se recalculent depuis le nouveau poids courant.

L'onglet Poids devient autonome : **logger → voir son plan → suivre les paliers**, sans quitter la
page.

## Vérification navigateur

Départ : dernière pesée 76 kg il y a 5 jours.

| Contrôle | Résultat |
|---|---|
| Ligne avant : « Dernière pesée : 76 kg · il y a 5 j. ⏰ Pense à te repeser. » | ✅ |
| Enregistrer 76,4 → écrit dans state | ✅ value 76,4 aujourd'hui |
| Ligne après : « Dernière pesée : 76,4 kg · aujourd'hui. » (rappel disparu) | ✅ |
| Champ vidé après | ✅ |
| Le plan se met à jour (1er palier repart de 76,4 → 76,9 kg à S+2) | ✅ |
| 2e saisie le même jour remplace (une pesée/jour) | ✅ (smoke) |

## Tests

355 tests `node:test` + smoke `coachLogWeight` **bloquant** (enregistre le poids du jour, remplace
si même jour, affiche « Dernière pesée »).

## Clôture de rotation

#331 **clôt la rotation 30** — le coach poids est passé d'un panneau enfoui à un vrai centre : onglet
dédié (#329), sélecteur soigné (#330), paliers + conseils (#328), et maintenant la saisie sur place.
Tag `v1.9.265` → auto-publication.
