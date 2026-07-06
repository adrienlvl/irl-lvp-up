# Récap boucle #25 — Montée en volume sécurisée

**Quand :** 2026-07-06
**Vague :** 5 (Coaching) — 5.8
**Statut :** ✅ vérifié (55/55 tests, smoke OK, cas Adrien confirmé)
**Ton contexte :** actuellement 10–20 km/sem (irrégulier), objectif 50 km/sem avant fin août.

## Ce que j'ai construit
- **`volumeRamp(startKm, targetKm, weeks, opts)`** (lib/logic.js, pur + 3 tests) : progression hebdomadaire du kilométrage, **gain plafonné à ~12 %/sem** + **semaine de décharge toutes les 4**. Renvoie la série, la cible de cette semaine, ce qui est réellement atteignable à la date, et un **verdict honnête** (avec la durée réaliste si la cible est trop rapide).
- **Section « Montée en volume »** (page Ultra) : volume actuel + cible + date → cette semaine à viser, atteinte à la date, série S1…Sn (décharges mises en évidence), et le verdict de coach.

## Vérifié pour ton cas (15 → 50 km, fin août = 8 sem)
- Cette semaine : **15 km** · à fin août : **~30 km**
- Série : 15 → 17 → 19 → **13 (décharge)** → 21 → 24 → 26 → **30**
- Verdict : **⚠ trop rapide** — 50 km/sem réaliste vers **~14 semaines** (mi-octobre). Priorité : la régularité d'abord.

C'est le rôle du coach : viser haut, mais sans te casser. La base irrégulière rend la prudence encore plus importante.

## Vérifications
- `node --check` OK · `npm test` **52 → 55** (cas trop rapide/honnête, cible atteinte sans dépassement, semaine de décharge) · smoke `SMOKE OK`.

## Suite (dernière brique coaching)
- **5.4** : échauffement guidé + compagnon selon la phase de course. Puis rebuild `.exe` 1.1.5 (embarquera aussi la montée en volume).

## Recommandation coach pour Adrien (résumé)
1. **4–6 semaines pour ancrer la régularité** autour de 18–22 km/sem (3 sorties : 2 faciles + 1 un peu plus longue).
2. Ensuite, montée ~10–12 %/sem avec une semaine allégée sur 4 → **50 km/sem visé mi-octobre**, base solide pour attaquer la fondation ultra.

## Git
- Commit : `feat(coaching): montée en volume sécurisée (volumeRamp) 5.8`.
