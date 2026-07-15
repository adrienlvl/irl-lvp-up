# #335 — Anniversaire imminent dans « À rattraper » (1.9.269)

## Le manque

Les anniversaires à venir (`upcomingBirthdays`) ne s'affichaient que dans un panneau `#birthdayUpcoming`
situé **dans l'overlay Agenda** (`#weekPage`) — donc enfoui : tu ne le vois que si tu ouvres
l'Agenda. Un anniversaire demain est pourtant typiquement un « à ne pas oublier ». Le digest
« À rattraper » (#321) de l'accueil ne le remontait pas.

## Ce qui change

`attentionDigest` inclut désormais un signal **anniversaire imminent** (≤ 2 jours) : l'anniversaire
le plus proche remonte sur le tableau de bord, « 🎂 Anniversaire de X demain », en gravité *haute*
si c'est aujourd'hui/demain. Le clic ouvre l'**Agenda** (nouveau routage `page:'agenda'` →
`#openWeekPage`) là où sont les anniversaires.

## Vérification navigateur

Anniversaire de Léa positionné à demain :

| Contrôle | Résultat |
|---|---|
| Item dans « À rattraper » | ✅ « 🎂 Anniversaire de Léa demain » (att-high) |
| Clic → ouvre l'Agenda (weekPage) | ✅ |
| Anniversaire à 40 j → pas d'item | ✅ (test) |

## Tests

357 tests `node:test` (attentionDigest : anniversaire demain → item high vers `agenda`, anniversaire
lointain → rien) + smoke `attentionDigest` **bloquant** enrichi (anniversaire relatif à aujourd'hui).

## Clôture de rotation

#335 **clôt la rotation 31** (#332 Échap overlays → #333 pesée/jour → #334 accueil personnalisé →
#335 anniversaire dans le digest). Tag `v1.9.269` → auto-publication.
