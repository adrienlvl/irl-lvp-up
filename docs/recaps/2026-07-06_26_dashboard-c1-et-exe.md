# Récap boucle #28 — Dashboard désencombré (C1) + clarification .exe + build 1.1.6

**Quand :** 2026-07-06
**Vague :** 6 (UX) — C1
**Statut :** ✅ vérifié (56/56 tests, smoke OK, checks fresh-storage OK)

## Point important : Adrien ne voyait pas les changements
- Les `.exe` **à la racine** `D:\IRL LVP UP\` (`IRL-LVP-UP.exe`, `...-ULTRA.exe`, etc.) sont les **ORIGINAUX du 22/06** — ils ne contiennent AUCUNE de nos évolutions.
- Nos builds sont dans **`D:\IRL LVP UP\build-dist\`**. Le plus récent : **`IRL LVP UP Setup 1.1.6.exe`** (ou lancer directement `build-dist\win-unpacked\IRL LVP UP.exe`).
- → Il lançait un ancien exe. Instructions données.

## C1 — Dashboard désencombré (prudent) ✅
- **« Ma journée » remontée en tête** du dashboard (juste sous le profil) — c'est la vue la plus utile.
- **Mission Control + Boussole repliés par défaut** au premier lancement (via seed de `irl-collapsed`), dépliables d'un clic.
- Vérifié sur stockage vierge : ordre correct + les 2 sections repliées, `irl-collapsed = ["c:MISSION CONTROL","c:BOUSSOLE LOCALE"]`.

## Rebuild → 1.1.6
- Embarque A1 + A2 + C1 (et tout le coaching). App packagée testée.

## Suite (Vague 6)
- **C2** retirer le formulaire agenda du dashboard (nécessite un petit refactor de l'export .ics car #exportIcs est référencé par la page Calendrier — à faire proprement).
- **B2** bibliothèque d'exos dans son onglet · **B1** Athlète en sous-onglets · **B3** bloc Mes progrès.
- **D1** agenda unifié · **D2** nav regroupée.

## Git
- Commit : `feat(ux): dashboard C1 (Ma journée en tête + repli défaut) + build 1.1.6`.
