# Boucle #71 — Agenda : détails partout + édition, cartes animées au survol · build 1.9.5

**Demande d'Adrien :** « je t'ai demandé de pouvoir mettre la durée de trajet etc, c'est toujours impossible ; pareil pour mettre une description à l'activité ou au rendez-vous. Améliore aussi Exercices/Athlète. »

## La cause (et le correctif)

Les champs 📍 lieu / 🚗 trajet / 📝 notes n'avaient été ajoutés qu'au formulaire de la **vue mois** (`calendarAgendaForm`), pas à l'**ajout rapide** de la vue Jour/Semaine (`weekQuickAdd`) — là où Adrien ajoute réellement ses événements. Et il n'y avait **aucune édition** d'un événement existant (seulement ajouter/supprimer). D'où « toujours impossible ».

## Livré

- **Ajout rapide (vue Jour/Semaine)** : champs **📍 lieu**, **🚗 trajet (min)** + bouton **🧭 Estimer**, **📝 notes** ajoutés. On peut donc tout renseigner à la création.
- **Édition d'un événement** : bouton **✏️ sur chaque bloc de la vue Jour** → boîte de dialogue `#agendaEditDialog` (titre, date, heure, type, priorité, journée entière, lieu, trajet, notes) + **🗑️ Supprimer**. On peut enfin **ajouter/modifier une description** sur un rendez-vous existant.
- **Estimation de trajet factorisée** : `estimateTravelInto(loc, travel, status, btn)` partagée par les 3 formulaires (calendrier, ajout rapide, édition).
- **Bonus Exercices/Athlète** : les **cartes de la bibliothèque s'animent au survol** (`exercisePicture(…, 'hover')` → markup animé figé, CSS `exFrameFlip` uniquement sur `:hover`). Survoler un exercice montre le mouvement.

## Vérifs

- `npm run verify` → **124 tests / 124 pass**, **SMOKE OK** (`agendaEdit:true`).
- **Flux réel Electron** : ajout rapide « RDV Kiné » avec lieu « Cabinet, Lorient » + trajet 20 + notes → item créé avec les 3 champs ; bouton ✏️ présent ; ouverture édition (notes pré-remplies), modification titre + notes → enregistré, **lieu conservé**, pas de doublon.
- Capture : cartes de la bibliothèque rendues proprement (photo statique par défaut, animation au survol).

## Reste

- Publication `npm run release` (Adrien).
- (Optionnel) édition aussi depuis la vue Semaine / le mois (aujourd'hui : mois = suppression au clic ; Jour = édition complète).
