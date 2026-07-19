# Proposition — Tests de parcours utilisateur (E2E)

_Rédigé le 2026-07-19 · statut : **à trancher par Adrien** · ⚠️ **heurte la règle « aucune dépendance »**_

## 1. Problème

Le filet actuel est solide mais a un trou précis :

- `npm test` — **517 tests** `node:test` sur la **logique pure** ;
- `npm run test:smoke` — un **rendu Electron réel** avec ~70 gardes bloquantes.

Le smoke exécute bien l'app, mais c'est un **rendu ponctuel** : il vérifie qu'après avoir appelé des
fonctions de rendu, le DOM est conforme. **Aucun test ne joue un parcours** : cliquer, saisir,
enchaîner des écrans, et vérifier ce que l'utilisateur obtient au bout. `playwright` n'apparaît **nulle
part** dans `package-lock.json`, et `src/test/` ne contient que des tests unitaires + le smoke.

Ce que ça laisse passer, concrètement : une régression où **chaque fonction est correcte** mais où
**l'enchaînement** casse (un handler qui ne se rebranche pas après un re-render, un formulaire qui ne
réinitialise pas, un état qui ne se propage pas d'un onglet à l'autre). C'est exactement la classe de
bug que le smoke ne voit pas — et c'est aussi celle qui t'atteint en premier en usage réel.

**Précédent utile** : la régression #446 (`jobStatusFromText`, « entre**pris**e » classée « accepté »)
était passée **à travers une suite verte** ; elle a été attrapée par une relecture adversariale, pas
par les tests. Un E2E n'aurait pas attrapé celle-là non plus (c'est un bug de logique pure), mais
l'épisode montre que le filet a des mailles.

## 2. Options

| | Option | Dépendance | Ce que ça donne |
|---|---|---|---|
| **A** | **Playwright** headless sur la **PWA** (build GitHub Pages ou serveur statique local). | **+1 devDep + un binaire navigateur** (~100 Mo). | Le vrai E2E : clics, saisies, navigation. Tourne sur le VPS. |
| **B** | **Étendre le smoke Electron existant** avec des interactions scriptées (`click()`, saisie, puis assertions). | **Aucune**. | Couvre une bonne part des parcours, sans rien ajouter. Moins expressif (pas d'attentes réseau, pas de multi-onglets), mais on est déjà dans l'app réelle. |
| **C** | **Playwright-Electron** — pilote l'app desktop packagée. | +1 devDep. | Le plus proche de l'usage desktop réel, le plus lourd à mettre en place. |
| **D** | **Ne rien faire** — s'appuyer sur le smoke + la relecture adversariale des diffs. | — | Coût nul, trou connu assumé. |

## 3. Recommandation — **B**, et A seulement si tu veux vraiment l'E2E

L'option B donne **l'essentiel du bénéfice pour zéro dépendance**, et respecte la contrainte que tu as
posée dès le départ (et qui est une vraie force : surface d'attaque quasi nulle, aucune dette de
supply-chain). Le smoke tourne **déjà** dans un vrai Electron avec le DOM réel : y ajouter
`element.click()` + assertions sur le résultat couvre une bonne partie des parcours (onboarding,
enregistrer une séance, générer un planning de révision).

L'option A n'est justifiée que si tu veux un vrai harnais E2E durable — et alors **c'est ton appel**,
parce qu'elle contredit frontalement une interdiction absolue de `VPS-AUTOPILOT.md §3`. C'est
précisément pour ça que ce document existe au lieu d'une implémentation.

**Premiers parcours à couvrir** (dans les deux cas) : ① onboarding complet → état cohérent ;
② enregistrer une séance guidée → historique + XP à jour ; ③ créer un planning de révision →
créneaux visibles à l'agenda.

## 4. Risques

- **A/C = dépendance + binaire navigateur** téléchargé en CI et sur le VPS : c'est le point bloquant,
  pas la technique.
- **Temps de CI** : un E2E est lent ; à garder hors du cycle rapide `npm run verify` si ça freine.
- **Tests instables (flaky)** : un E2E mal écrit rend la suite non fiable, ce qui est **pire** que pas
  d'E2E — il faut des attentes explicites, jamais des `sleep`.
- **B a une limite honnête** : le smoke tourne en un seul contexte ; certains parcours (rechargement,
  persistance entre sessions) resteront mal couverts.

## 5. Ce qui dépend d'Adrien

1. **Acceptes-tu une devDependency + un binaire navigateur** pour un vrai E2E (option A) ? Si non →
   on part sur **B**, sans rien ajouter.
2. Si oui : **PWA (A)** ou **app desktop packagée (C)** ?
3. Quels **parcours** comptent le plus pour toi ? (mon trio par défaut ci-dessus, à confirmer)
