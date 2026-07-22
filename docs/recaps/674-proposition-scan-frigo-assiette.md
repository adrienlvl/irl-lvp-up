# #674 — Proposition : Scan frigo / assiette (CAP 3.0 chantier 6, le dernier sans design doc)

## Contexte / rotation / quota

- **Priorité nuit** (DEMANDES.md) = coaching adaptatif à fond. **Bloquée ce tour par la rotation** : les
  5 derniers recaps (673→669) sont `docs, coach, robustesse, docs, coach` → `coach` (2ᵉ recent **et** 2×
  dans les 5) et `docs` (1ᵉ recent, 2× dans les 5) **interdits**. Backlog nommé P1→P7 : **entièrement
  coché**.
- **Quota de propositions §4 bis.4 DÉCLENCHÉ** : les 10 derniers recaps (664→673) ne contiennent
  **aucune** nouvelle proposition (`ls docs/proposals/` inchangé depuis #663). Donc l'itération **DOIT**
  être une proposition — pas du code. C'est la première fois que ce quota mord depuis sa création.
- Choix guidé aussi par « SI LE BACKLOG SE VIDE » (ROADMAP) étape 2 : « écris une proposition manquante ».

## La proposition (`docs/proposals/scan-frigo-assiette.md`)

**Manque prouvé** : c'est le **seul** chantier du Cap 3.0 sans document de design (Coaching ✅,
Fondations/Sécurité/Sync/Planning en ont chacun un). Le code porte déjà la promesse en clair
(`index.html:177` : « Le scan du frigo par photo viendra plus tard. ») et `SECURITE-RESEAU-S8.md:34`
exige une **décision de vie privée AVANT tout code**. J'ai fait un état des lieux factuel (sous-agent) :

- Saisie nutrition **100 % manuelle, agrégée/jour** (`{date,protein,water,fruit}`, app.js:22-23) ;
  frigo `state.pantry` rempli via recherche CIQUAL locale (`searchFoods`, 2265 aliments,
  `lib/foods-data.js`). Cible réelle du scan = **remplir le frigo**, pas logger des calories.
- Posture verrou : CSP `default-src 'self'` sans `connect-src` (`index.html:6`) → renderer ne peut
  appeler aucun hôte ; réseau confiné au main, allowlisté (`electron-main.cjs:59-141`) ; zéro dép runtime.

**Le nœud** : la « reconnaissance » n'a que 2 familles, **chacune casse un pilier** — API cloud
(la photo sort + CSP web relâchée + clé) **ou** modèle on-device (dépendance runtime + modèle multi-Mo).
Et **les deux** butent sur la **quantité** (grammes non estimables) → sur-promesse.

**Options** : A cloud opt-in · B modèle on-device · **C code-barres `BarcodeDetector` on-device +
confirmation CIQUAL** (zéro dép, zéro cloud, zéro CSP touchée) · D capture assistée sans reco · E ne
rien faire. **Reco : E maintenant ; C comme premier pas sûr (réalisable en étapes autonomes façon P6) ;
A/B seulement sur décision explicite de vie privée, en session supervisée.** 5 décisions listées en fin
de doc.

## Périmètre / interdictions

- **Aucune ligne de code, aucune dépendance, aucune surface réseau ajoutée** (§3 respecté à la lettre) —
  document de design uniquement.
- DEMANDES.md mis à jour : chantier 6 ajouté au bloc « Avancer CAP 3.0 » (« En cours »).
- ROADMAP « État actuel » mis à jour. **Pas de bump** (docs pur).

## Vérification

`cd src && xvfb-run -a npm run verify` → **580 tests + SMOKE OK**, 100 % vert (aucun code touché ; run
de contrôle de non-régression).

## Suite

Le Cap 3.0 a désormais **un design doc par chantier** — plus aucun « plus tard » flou susceptible de
déclencher un bricolage cloud non décidé. La priorité nuit coaching reprendra dès que la rotation
libère `coach`. Tous les vrais leviers restants sont **gatés sur décision d'Adrien** (cf. DEMANDES.md).

Domaine : docs.
