# Recherche GitHub — code/idées utiles pour IRL LVP UP (2026-07-07)

_Demande d'Adrien : « regarde sur GitHub s'il y a du code intéressant pour l'app ». Voici ce qui est pertinent, filtré par notre contrainte : **app 100 % locale, sans réseau par défaut, sans code tiers exécuté (CSP `script-src 'self'`), dépendances minimales**. Rien n'est ajouté sans ton feu vert._

## 1. 🔁 Récurrence d'événements (le vrai manque) — **rrule.js / RRULE**
- **Repo :** [jkbrzt/rrule](https://github.com/jkbrzt/rrule) (MIT) — la référence JS pour les règles de récurrence iCalendar (RRULE).
- **Pourquoi c'est pertinent :** aujourd'hui l'agenda ne gère que « chaque semaine ×4/×8 » + anniversaires annuels. Un vrai moteur RRULE permettrait : *tous les jours, tous les 2 jours, le dernier vendredi du mois, tous les 15 jours…*.
- **Bonus :** notre `parseIcs` importe seulement la **1re** occurrence des événements Google/Apple récurrents — un moteur RRULE **déplierait** ces séries à l'import (vraie amélioration).
- **Reco sécurité :** soit **vendoriser** le build navigateur (auto-hébergé, jamais de CDN), soit — plus dans notre esprit — **réimplémenter un petit sous-ensemble RRULE natif** (quotidien/hebdo/mensuel/annuel, intervalle, jusqu'à une date) sans dépendance. Testable et léger.
- **Alternative parsing robuste :** [peterbraden/ical.js](https://github.com/peterbraden/ical.js) / Mozilla ICAL.js pour un import .ics plus complet (RRULE + fuseaux), si on veut aller loin sur l'import.

## 2. 🎮 Idées de gamification — **Habitica** (inspiration, pas de copie)
- **Repo :** [HabitRPG/habitica](https://github.com/HabitRPG/habitica) — le « RPG de vie » open-source de référence (très gros projet serveur+mobile, licence non compatible copier-coller → **on s'en inspire, on ne copie pas**).
- **Idée à reprendre :** leur triptyque **Habits / Dailies / To-Dos**. On a déjà **quêtes + to-do + agenda** ; il manque les **« Dailies »** = *habitudes quotidiennes récurrentes avec série (streak)* (ex. « boire 2 L d'eau », « 10 min de lecture »). Ça collerait parfaitement au thème RPG et compléterait la to-do (ponctuel) par du récurrent suivi dans le temps.

## 3. 📅 Autres pistes vues (moins prioritaires)
- **rSchedule** ([jorroll/rschedule](https://github.com/topics/rrule)) : récurrence avec meilleur support des fuseaux, plus modulaire — overkill pour nos besoins.
- Utilitaires de dates (date-fns…) : **pas nécessaires**, l'app gère très bien avec `Date` natif.

## Recommandation
Le meilleur apport concret serait la **récurrence d'événements** (point 1), en version **native légère** (pas de dépendance) pour rester fidèle à la sécurité locale : ça débloque les rendez-vous récurrents ET le dépliage des agendas importés. Ensuite, les **« habitudes quotidiennes »** (point 2) comme brique de gamification.

_Sources : [rrule.js](https://github.com/jkbrzt/rrule), [ical.js](https://github.com/peterbraden/ical.js), [Habitica](https://github.com/HabitRPG/habitica)._
