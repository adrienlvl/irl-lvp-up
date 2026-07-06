# Récap boucle #23 — Compléments & ravitaillement (Whey + électrolytes)

**Quand :** 2026-07-06
**Vague :** 5 (Coaching) — 5.6 (idée d'Adrien)
**Statut :** ✅ vérifié (47/47 tests, smoke OK, valeurs confirmées en app)
**Ta demande :** comment utiliser les compléments (Whey Overstims : heures/quantités) + électrolytes en course, surtout à la chaleur.

## Ce que j'ai construit
Nouveau panneau **« Compléments & ravitaillement »** dans la page **Athlète** :

### 🥛 Whey (Overstims)
- **Cible protéique personnalisée** selon ton poids et ton objectif (`proteinTarget`, testé) : force 1,9 g/kg · trail 1,6 · corps capable 1,8. Pour ton profil (81 kg) : **≈ 145 g/jour**.
- **Timing** : 1 dose (~25–30 g) dans les 2 h après la muscu · 1 dose au réveil/en collation si la cible est dure à atteindre · pas indispensable les jours de repos.
- Rappel : la whey **complète** l'alimentation, elle ne la remplace pas (vérifier les g/dose sur l'étiquette).

### 🧂 Électrolytes en course (ajustés à la chaleur)
Sélecteur de conditions → dosage **par heure d'effort** (`hydrationPlan`, testé) :
| Conditions | Boisson/h | Sodium/h |
|---|---|---|
| Frais (< 15°) | 350–500 ml | 300–500 mg |
| Tempéré (15–25°) | 400–600 ml | 400–600 mg |
| **Chaud (25–30°)** | 500–700 ml | 600–800 mg |
| **Très chaud (> 30°)** | **600–800 ml** | **800–1000 mg** |

+ conseils chaleur (boire avant la soif, monter le sodium, se rafraîchir, partir hydraté) et la règle d'or : **tout tester à l'entraînement, jamais de nouveauté le jour J**.

### Sécurité
Mention claire : repères généraux de nutrition sportive, à ajuster à la transpiration/tolérance, **pas un avis médical**.

## Vérifications
- `node --check` OK · `npm test` **45 → 47** (proteinTarget par objectif, hydrationPlan croissant avec la chaleur) · smoke `SMOKE OK` · valeurs relues en app (145 g ; 400–600 / 600–800 / 800–1000 mg sodium).

## Suite
- **5.4** (dernière brique coaching) : échauffement guidé + compagnon plan du jour selon la phase de course, puis rebuild `.exe` 1.1.4.
- Idées d'extension : ajuster la whey à ta dose réelle Overstims, suivi de la prise de compléments, glucides/heure en course longue.

## Git
- Commit : `feat(nutrition): panneau compléments Whey + électrolytes ajustés chaleur (5.6)`.
