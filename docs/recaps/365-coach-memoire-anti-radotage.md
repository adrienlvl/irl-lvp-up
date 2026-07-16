# #365 — Coach adaptatif : mémoire anti-radotage (3.0 · Vague 1) (2.0.9)

Reprise de la Vague 1 après la parenthèse alternance (#362-364). Le coach choisissait son focus sur
un instantané, sans mémoire : si le sommeil décrochait, il répétait « Ton sommeil s'essouffle » tous
les jours, mot pour mot — et un coach qui radote finit ignoré.

## Ce qui change

- **`state.coachLog`** : le rendu journalise le focus du jour (`{date, pillar}`, une entrée par jour,
  mise à jour si le focus change en cours de journée, plafonné à 60 jours). Coercé dans
  `normalizeState`. `save()` ne re-rend rien → pas de récursion.
- **`adaptiveCoachFocus` lit ce journal** : si le même pilier « à corriger » a été le focus les
  **3 derniers jours consécutifs** et qu'il est encore en tête des corrections (donc rien ne s'est
  amélioré), le coach **change d'angle** — 2ᵉ pilier à corriger s'il existe, sinon renfort du
  meilleur élan (`reinforce`). Le message ajoute « On varie les angles aujourd'hui. » et l'objet
  expose `rotated`. Un jour différent intercalé remet les compteurs à zéro (le pilier peut revenir).
- **L'alternance ne tourne jamais** : priorité absolue avec échéance, elle ne passe pas par la
  rotation — Adrien doit être poussé à postuler chaque jour, point.

## Vérification navigateur

Jour 1 (journal vide) → « Ton sommeil s'essouffle », journalisé ✅. Après 3 jours de « sommeil » au
journal → « Ton entraînement s'essouffle … On varie les angles aujourd'hui. », `rotated:true`,
journal du jour mis à jour en `sport` ✅. Aucune erreur console.

## Tests

382 tests (`anti-radotage` : pas de rotation à 2 jours, rotation au 3ᵉ, série cassée par un jour
différent, bascule `reinforce` si un seul pilier à corriger, alternance jamais tournée) + assertion
smoke dans le check `coachFocus`.

## Contexte

Build **2.0.9**. Pas de Release (regroupée — règle anti-spam de MAJ). Vague 1 (Coaching adaptatif)
en cours ; reste à explorer : bilan hebdo du coach, lien coach ↔ objectifs.
