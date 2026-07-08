# Boucle #57 — Les 10 nouveaux exercices intégrés aux séances

**Date :** 2026-07-08
**Version :** 1.8.0 → 1.8.1

## Contexte
Les 10 exercices ajoutés en #56 dormaient dans la bibliothèque. Je les rends **utiles en séance** (programmes guidés).

## Ce qui a été fait
- **Nouvelle séance « Puissance & prévention »** dans le programme _Spécial trail & course_ (`run`, désormais **4 séances**) : Squat sauté · Fentes sautées · Sauts de cheville · Nordic curl · Pont fessier une jambe · Équilibre unipodal. `why` coaching (plyo pour l'économie de course, excentrique + proprio pour blinder ischios/chevilles, à faire frais).
- **Ajouts ciblés** dans _Hybride trail + force_ : **Turkish get-up kettlebell** (jour C · Puissance & tronc), **Good morning kettlebell** (jour B · Jambes & chaîne postérieure).
- **Planche touches d'épaule** ajoutée au jour _Équilibre & tronc_ (programme _Force & tractions_).
- → 9 des 10 nouveaux exercices sont maintenant programmés (Montées de genoux reste en accès libre = drill d'échauffement).

## Vérifications
- Nouveau test d'intégrité : **chaque exercice cité dans un programme existe dans la bibliothèque** + `days.length === workouts.length` par programme (attrape les fautes de frappe, ex. apostrophe typographique de « Planche touches d'épaule »). `node --test` → **105/105** ✅.
- Smoke → `SMOKE OK` (les séances à 6 exercices rendent sans souci).

## Suite
- Planches photo 7-8 (Adrien) → vraies photos pour les 10.
- Vague S.8 (scan frigo, OAuth agenda, signature de code).
