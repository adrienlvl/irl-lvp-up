# #321 — Digest « À rattraper » sur l'accueil (1.9.255)

## Le manque

Ce qui a besoin d'attention est dispersé : les révisions en retard s'affichent dans le panneau
d'étude, les séances manquées dans le coach Athlète, les habitudes à risque dans le panneau
habitudes, la forme basse dans la récupération. Pour savoir « qu'est-ce que je dois rattraper
aujourd'hui ? », il faut **scanner plusieurs onglets**.

Vérifié avant de coder : `renderDailyCompass` (« Ton prochain geste ») ne propose qu'UNE action
suivante ; `renderMissionControl` suit la complétion des 6 domaines du jour. Aucun n'**agrège les
retards/risques** à travers les domaines. Manque réel.

## Ce qui change

Fonction pure `attentionDigest(state, todayKey, opts)` qui réunit, en réutilisant les fonctions
existantes de chaque domaine :
- **forme basse** (`readinessScore` < 50) — *high* ;
- **examen imminent** (`examReminderDue`, J-30/14/7/3/1/0) — *high* ;
- **révisions en retard** (`overdueStudy`) — *med* ;
- **séances manquées** (`missedSessions`) — *med* ;
- **habitudes à relancer** (`habitsAtRisk`) — *med*.

Trié par gravité (high avant med), tronqué à 4. Nouveau panneau **« À rattraper »** en haut du
tableau de bord (`#attentionPanel`), affiché seulement si au moins un item. Chaque ligne est
cliquable et renvoie vers l'onglet concerné.

Signatures vérifiées avant d'appeler (leçon #306) : `habitsAtRisk(habits, todayKey, minStreak)`,
`missedSessions(agenda, workouts, todayKey)`, `overdueStudy(agenda, todayKey)`,
`examReminderDue(examGoal, todayKey)` (renvoie une **chaîne**), `readinessScore(recovery)`.

## Vérification navigateur

Semé forme basse, examen J-7, 2 révisions en retard, 1 séance manquée :

| Contrôle | Résultat |
|---|---|
| Panneau visible avec 4 lignes | ✅ |
| Ordre : forme basse + examen (high) avant révisions + séance (med) | ✅ |
| Clic sur une ligne « athlete » → bascule onglet Athlète | ✅ |
| Rien d'urgent → panneau masqué | ✅ |

## Tests

349 tests `node:test` (+ `attentionDigest` : agrégation, tri par gravité, format des items, cap,
vide, date invalide) + smoke `attentionDigest` **bloquant**.

## Rotation

#321 — rotation 28 en cours (build 1.9.255).
