# #353 — Célébration « Journée parfaite » (quêtes) (1.9.287)

## Le manque

L'app affiche la **série de journées parfaites** (`questPerfectStreak`) passivement dans le panneau
quêtes, mais **ne célèbre jamais le moment** où tu complètes ta dernière quête du jour. Or c'est
précisément le pic de dopamine qui rend une app d'habitudes gratifiante.

## Ce qui change

- Nouveau toast d'annonce **sans bouton** `showFlashToast(msg, ms)` (réutilise l'élément et le style
  du toast d'annulation — pas de « Annuler » sur une célébration).
- `celebrateQuestsIfPerfect()` : si toutes les quêtes du jour sont validées, affiche
  « 🎉 Journée parfaite ! Toutes tes quêtes validées · 🔥 N jours d'affilée » (série repliée depuis
  `questPerfectStreak`). Renvoie true si célébré.
- Appelé dans le handler quête après validation → se déclenche **uniquement quand la dernière quête
  est cochée** (cocher une non-dernière ne déclenche rien).

## Vérification navigateur (flux réel, vraies cases cochées)

2 quêtes :

| Action | Résultat |
|---|---|
| Coche la 1re | ✅ aucun toast |
| Coche la 2e (dernière) | ✅ « 🎉 Journée parfaite ! Toutes tes quêtes validées · 🔥 1 jour d'affilée », **sans** bouton Annuler |

## Tests

369 tests + smoke `questPerfectCelebrate` **bloquant** (toutes validées → toast « parfaite » sans
`.ut-undo` + retourne true ; une non validée → pas de toast + false).

## Rotation

#353 — rotation 36 (build 1.9.287). Type : contenu/engagement (délice). Domaine : quêtes/XP.
Prochain #354.
