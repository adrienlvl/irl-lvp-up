# #337 — Rappel de sauvegarde dans « À rattraper » (1.9.271)

## Suite naturelle du #336

La sauvegarde PWA (ajoutée au #336) est **manuelle** — donc facile à oublier, alors qu'iOS peut
évincer le localStorage. Sans rappel, on risque d'y penser trop tard.

## Ce qui change

- `state.lastBackup` (date) est désormais **enregistré à chaque export** (chemins desktop ET PWA),
  ajouté aux `defaults` et à `normalizeState` (coercition en `YYYY-MM-DD` ou `''`).
- `attentionDigest` gagne un signal **backup** : si l'utilisateur a des données à protéger (poids,
  ≥ 3 séances, une habitude, ≥ 3 events) ET n'a pas sauvegardé depuis ≥ 14 jours (ou jamais), un item
  « 💾 Sauvegarde tes données (dernière il y a N j / jamais fait) » remonte sur l'accueil, route vers
  **Réglages** (où sont les boutons). Un nouveau venu sans données n'est pas embêté.

## Vérification navigateur (flux complet)

| Étape | Résultat |
|---|---|
| Données présentes, jamais sauvegardé | ✅ « 💾 Sauvegarde tes données (jamais fait) » dans « À rattraper » |
| Clic Export (chemin PWA) → `lastBackup` = aujourd'hui | ✅ 2026-07-15 |
| Après re-rendu → le rappel **disparaît** | ✅ |

Le nudge s'allume et s'éteint tout seul : il ne réapparaît qu'après 14 jours sans nouvelle sauvegarde.

## Tests

358 tests `node:test` (attentionDigest : jamais sauvegardé → item, il y a 20 j → item avec le
compte, récent → rien, aucune donnée → rien) + smoke `digestBackup` **bloquant**.

## Rotation

#337 — rotation 32 (build 1.9.271).
