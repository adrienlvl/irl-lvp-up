# Boucle #208 (autonome) — #2 Onboarding guidé qui met en route · build 1.9.142

**Cap #2 — onboarding.** L'onboarding de départ ne collectait que priorité/niveau/séances/matériel et **ne faisait rien** ensuite (pas de programme, pas de quêtes). Il ne rendait pas la puissance de l'app découvrable.

## Livré — l'onboarding génère et met en route

Le dialogue de bienvenue collecte maintenant : **objectif physique** (les 5), **poids / taille / âge / sexe**, séances/semaine, **matériel**. Au clic sur **« 🚀 Générer mon programme & démarrer »**, l'app :

1. enregistre le profil complet (utilisé par le Coach Poids, la nutrition, l'IMC…) ;
2. **génère le 1er programme** de la semaine selon l'objectif (`objectiveProgram`, adapté au matériel) ;
3. **le place dans l'agenda sur 4 semaines** (`scheduleObjectiveProgram`) ;
4. **ajoute les premières quêtes du jour** (`suggestedQuests`) ;
5. emmène sur Athlète → Séance et affiche un toast récap.

**Vérifié en vrai (navigateur, utilisateur neuf)** : dialogue ouvert → rempli (objectif « sèche », poids/taille/âge) → au clic : `fitnessObjective='seche'`, profil enregistré, **28 séances placées dans l'agenda** (7/sem × 4), **8 quêtes**, `onboardingDone=true`. ✅

## Détail technique

- **`lib/logic.js`** : `onboardingSetup(inputs)` → patch d'état validé/borné (profil, objectif, séances, activeProgram, goal mappé). Pur + testé (bornes, objectif inconnu → athlétique).
- **`app.js`** : handler `#finishOnboarding` réécrit (applique le patch + génère/programme + quêtes) ; le pré-remplissage à l'ouverture reprend les nouveaux champs.
- **`index.html`** : dialogue enrichi (objectif + poids/taille/âge/sexe + matériel). **`companion.css`** : `.onb-wide`/`.onb-equip-title`.

## Vérifs

- `npm run verify` → **242 tests / 242 pass** (+1 : `onboardingSetup`), garde-fou CSS vert, **SMOKE OK** (`onboardingSetup:true`). Vérif flux réel en navigateur.
- `npm run dist` → **Setup 1.9.142.exe** (app d'Adrien jamais fermée).

## Suite #2

Rendre l'onboarding **rejouable** (bouton dans Réglages) + éventuel format multi-étapes. Puis #3 contenu mobilité, #4 coaching périodisé.
