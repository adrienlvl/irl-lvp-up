# #369 — Fondations : instantanés quotidiens du miroir (7 j d'historique) (3.0 · Vague 2, tranche 2) (2.0.13)

Suite de #368. Faiblesse restante : le miroir était une **copie unique** — un état abîmé (mais
parseable) l'aurait écrasée, détruisant la seule sauvegarde. Transformé en **points de restauration**.

## Ce qui change

- `idbMirrorState` écrit désormais AUSSI un **instantané quotidien** (`snap:AAAA-MM-JJ`, écrasé dans
  la journée) et **élague à 7** (les plus anciens partent) — l'équivalent PWA des 14 copies
  quotidiennes disque du desktop.
- `idbReadCandidates()` : liste ordonnée des candidats à la restauration — copie principale d'abord,
  puis instantanés du plus récent au plus ancien.
- `restoreFromIdbIfEmpty` essaie chaque candidat : JSON invalide → suivant ; état sans rien d'utile →
  suivant ; premier valide → restauré (toast 🛟). Une copie principale corrompue ne bloque plus rien.

## Vérification navigateur (scénario corruption)

Seed (xp 777, « SnapCorp ») → miroir + snap du jour → **corruption volontaire de la copie
principale** (`{invalid json!!`) + localStorage vidé → rechargement → l'app **saute le candidat
abîmé et restaure depuis l'instantané** : xp 777, SnapCorp, toast 🛟 ✅. Aucune erreur console.

## Tests

384 tests + smoke `idbMirror` étendu (BLOQUANT) : sonde écrite/relue, **snap du jour présent**,
**élagage vérifié** (8 vieux snaps injectés → ≤ 7 après miroir, celui du jour conservé),
`idbReadCandidates` renvoie la copie principale en tête.

## Contexte

Build **2.0.13**. Pas de Release (prochain lot). Vague 2 : le socle « données indestructibles »
progresse — reste : santé du stockage visible (Réglages), puis schéma versionné préparant la Sync.
