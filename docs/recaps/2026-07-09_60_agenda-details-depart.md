# Boucle #60 — Détails d'événement + heure de départ (build 1.8.3)

**Demande d'Adrien :** « je peux pas actuellement mettre de détails sur l'agenda, j'aimerai bien pouvoir les mettre, et si aussi je pouvais avoir le temps de trajet estimé, heure de départ si c'est loin… prévoir le temps que j'ai pour y aller quoi ! 🙂 »

## Ce qui est fait (offline v1)

Chaque événement de l'agenda peut désormais porter :
- **📍 Lieu** (texte, ≤ 120 car.)
- **📝 Notes / détails** (texte, ≤ 500 car.)
- **🚗 Temps de trajet** (minutes, 0–600)

À partir du trajet, `departureInfo(item, now)` (fonction pure, testée) calcule :
- l'**heure de départ conseillée** = heure de l'événement − trajet (avec passage minuit géré) ;
- quand on regarde **aujourd'hui**, un compte à rebours vivant : **« pars dans X min »**, ou **« déjà l'heure de partir ! »** en rouge si c'est dépassé.

Rendu dans la **vue Jour** sous chaque créneau (`.slot-meta` → 📍 / 🚗 Départ HH:MM · trajet N min · pars dans X min / 📝).

## Détail technique

- `src/lib/logic.js` : `normalizeAgendaItem` gagne `location` / `notes` / `travelMin` (bornés + nettoyés) ; nouvelle fonction pure `departureInfo` exportée ; `todayItems` propage les 3 champs.
- `src/index.html` : formulaire d'ajout (`calendarAgendaForm`) → champs `#calendarAgendaLocation`, `#calendarAgendaTravel` (number), `#calendarAgendaNotes`.
- `src/app.js` : le handler de soumission lit les 3 champs ; `renderDayView` compose `.slot-meta` et calcule le départ (avec `now` seulement si on affiche le jour courant).
- `src/extras.css` : styles `.slot-meta` / `.slot-loc` / `.slot-dep` / `.slot-notes` / `.slot-late`.
- Tests : couverture `departureInfo` (heure normale, passage minuit, trajet 0 → null, en retard) + champs `normalizeAgendaItem` ; smoke check `agendaDetails`.

## Vérifs

- `npm run verify` → **112 tests / 112 pass**, **SMOKE OK** (`agendaDetails:true`).
- Flux réel Electron : événement avec lieu + trajet 25 min + notes → vue Jour affiche `📍 GRETA Rennes`, `🚗 Départ HH:MM · trajet 25 min · pars dans X min`, `📝 apporter le dossier`. ✅

## Limites v1 (assumées, notées)

- L'ajout rapide semaine (`weekQuickAdd`) ne capture pas encore les nouveaux champs → seul le formulaire complet le fait.
- Pas encore d'écran d'édition des champs sur un événement existant (à refaire via le formulaire).
- **Trajet auto depuis la position GPS → l'adresse** (géocodage + itinéraire) = réseau/API → réservé à la **Vague S.8**, cadré comme les autres fonctions réseau.
