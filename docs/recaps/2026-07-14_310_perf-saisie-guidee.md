# #310 — Saisie des charges fluide + bug d'aliasing corrigé (1.9.244)

**Rotation 25 · item #3 · domaine : perf — et revue critique de mon propre travail**

## Ce que je cherchais
Pas un manque de l'app cette fois : **une régression que j'avais moi-même introduite
en #307**. En persistant la séance guidée « à chaque frappe » pour que rien ne soit
perdu, j'avais branché `save()` sur l'événement `input`.

Or `save()` fait un `JSON.stringify(state)` complet **et** un `localStorage.setItem`
**synchrone** — donc bloquant. L'app anticipe d'ailleurs le problème : elle affiche
« ⚠ Stockage local saturé : exporte une sauvegarde ou réduis les photos ».

Et surtout : `migratePhotosToDisk()` ne s'exécute que **dans l'app desktop**
(`window.desktop?.savePhoto`). **Dans la PWA — celle qu'Adrien vient d'installer sur
son iPhone — les photos de progression restent en base64 DANS le state**, donc dans
localStorage.

### Mesure (avant de conclure)
| | taille du state | `save()` |
|---|---|---|
| state nu | 5 Ko | 0,1 ms |
| **3 photos (cas PWA réel)** | **2 405 Ko** | **10,5 ms** |

→ taper « 42.5 » = 4 frappes = **~42 ms de blocage du thread principal**, à chaque
charge saisie, en pleine série. Et sur un téléphone milieu de gamme,
`localStorage.setItem` est nettement plus lent encore.

## La correction — et le bug qu'elle a révélé
Deux garde-fous :
1. **Débounce (450 ms)** de la persistance déclenchée par la frappe. Les actions
   réelles (validation, navigation, remplacement, repos, fermeture) écrivent
   **immédiatement** et **vident le débounce en attente** — rien n'est perdu.
2. **`guidedSnapshotEquals(a, b)`** (pur, testé) : on n'écrit pas si l'instantané est
   identique au précédent. Ignore volontairement `savedAt` (qui change à chaque
   instantané et n'est pas un changement métier).

### 🐛 Le bug trouvé en vérifiant
La première vérification a montré que **la charge tapée n'était PAS persistée** après
le débounce — alors qu'elle l'était à la validation. J'ai creusé plutôt que de
supposer.

Cause : `guidedSnapshot` faisait `exercises: w.exercises` — **la référence vivante,
pas une copie**. Donc `state.guidedSession.exercises` **était** `guidedWorkout.exercises`.
Chaque frappe mutait le modèle **et l'instantané « précédent » en même temps** : ma
comparaison comparait l'objet **avec lui-même**, concluait « rien n'a changé », et
sautait l'écriture.

Un instantané qui aliase l'objet vivant n'est pas un instantané. Corrigé à la racine :
**copie profonde** (`structuredClone`, repli `JSON.parse(JSON.stringify(...))`).

Ce bug latent existait déjà depuis #307 (l'instantané y aliasait aussi la séance) ;
il ne se voyait pas parce qu'on réécrivait tout à chaque fois. Le garde-fou d'égalité
l'a fait remonter.

## Tests
- `logic.test.js` :
  - **`guidedSnapshot` est une COPIE** : références distinctes, muter la séance vivante
    ne modifie pas l'instantané, et la comparaison détecte alors bien le changement.
    *(Test écrit spécifiquement pour verrouiller le piège.)*
  - `guidedSnapshotEquals` : identiques → égaux ; **`savedAt` ignoré** ; toute vraie
    modification détectée (index, charge, reps, validation, série ajoutée, exercice
    remplacé, repos terminé/réajusté) ; `null`.
- `renderer-smoke.cjs` : check `guidedPersistGuard`.
- `npm run verify` : **337 tests + SMOKE OK**.

## Vérif navigateur — avant / après, mesuré
| | avant | après |
|---|---|---|
| Frappe de « 42.5 » (4 car.) | 4 écritures · ~42 ms | **0 écriture · 0,6 ms** |
| Après le débounce | — | **1 écriture**, charge 42,5 **bien persistée** |
| Re-saisir la même valeur | 4 écritures | **0 écriture** |

La garantie de #307 (une charge tapée non validée survit à une interruption) est
**intacte** — vérifiée explicitement.

## Fichiers
- `src/lib/logic.js` — `guidedSnapshot` copie désormais en profondeur ;
  `guidedSnapshotEquals()` + exports + CHANGELOG[0] 1.9.244.
- `src/app.js` — `persistGuidedSession()` (garde-fou d'égalité + vidage du débounce),
  `persistGuidedSessionSoon()` (débounce 450 ms) branché sur `input`.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

## À signaler à Adrien
Les photos de progression restent en base64 dans le `localStorage` de la PWA (elles ne
sont déportées sur disque que dans l'app desktop). C'est la cause de fond du coût de
`save()`, et ça pousse aussi vers la limite de quota du navigateur. Une vraie solution
(IndexedDB, ou compression à l'import) mériterait une itération dédiée — je ne l'ai pas
improvisée ici.
