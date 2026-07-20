# #571 — P2.4 : noms accessibles des champs de recherche (build 2.0.194)

**Domaine : a11y.** Build 2.0.194.

## Rotation §4 bis (avant de coder)

Les 5 derniers domaines (par recap) : #570 `coach` · #569 `robustesse` · #568 `athlete` ·
#567 `coach` · #566 `a11y`. Donc :

- `coach` (priorité de nuit) est dans le **dernier** recap (#570) ET **2×** dans les 5 (#570/#567)
  → **interdit** par la rotation §4 bis (qui, dit §3, prime même sur la demande de nuit) ;
- `robustesse` est dans les **2 derniers** (#569) → **interdit** ;
- `a11y` est **1×** (#566) et **hors des 2 derniers** → **autorisé**.

→ 2ᵉ demande d'Adrien (faire avancer CAP 3.0 / qualité), tâche **nommée P2.4** dans
`docs/ROADMAP.md` → « 🎯 Prochaines priorités » (dernière piste P2 ouverte).

Quota de propositions (§4 bis.4) : satisfait — 6 dossiers P1 rédigés puis tranchés par Adrien
aujourd'hui (`docs/proposals/`, commits `e6d5333` / `3e22343`).

## Le manque (vérifié avant de coder, §2.3)

WCAG 3.3.2 : un `placeholder` **n'est pas un nom accessible** — il disparaît à la saisie et
n'est pas exposé de façon fiable aux lecteurs d'écran. Le patron correct est déjà appliqué et
verrouillé pour `#altSearch` (`aria-label="Rechercher une candidature"`, `index.html:218`).

Vérification du code (`grep` + lecture de `index.html`) :

- `#foodSearch` (Nutrition, l. 177) : **placeholder seul**, pas d'`aria-label` → confirmé.
- `#agendaSearch` (Agenda, l. 243) : **placeholder seul** → confirmé.
- `#exerciseSearch` (Bibliothèque, l. 164) : **placeholder seul** → **la roadmap se trompait**
  (elle affirmait « `#exerciseSearch` a déjà un `aria-label` », périmètre « corrigé » du 2026-07-19).
  Ni `aria-label`, ni `<label for>`, ni `aria-labelledby` : il manque un nom accessible **lui aussi**.
  Piste corrigée (§4 bis.5) et champ inclus dans le fix.

## Le fix

`aria-label` ajouté aux **trois** champs, en cohérence avec l'existant `#altSearch` :

- `#foodSearch` → « Chercher un aliment » (reprend le titre de la carte).
- `#agendaSearch` → « Rechercher dans l'agenda ».
- `#exerciseSearch` → « Rechercher un exercice » (reprend son placeholder).

**Aucun texte visible ne change** : `aria-label` n'est pas rendu à l'écran → §4 ter sans objet.
a11y bumpe (précédents #549/#550/#566).

## Verrou smoke (bloquant)

Nouveau check **bloquant** `searchFieldLabels` (`renderer-smoke.cjs`), sur le modèle de
`dashboardInputLabels` : `['foodSearch', 'agendaSearch', 'exerciseSearch', 'altSearch']` doivent
tous exposer un `aria-label` non vide. Inclure `#altSearch` verrouille aussi le champ déjà correct
contre une régression. `errors.push` associé → un placeholder seul rechuterait le smoke.

## Vérification

`cd src && xvfb-run -a npm run verify` → **528 tests + smoke verts**, `searchFieldLabels:true`.

Série P2 : reste `P2.4` cochée → **toutes les pistes P2 vérifiables sont traitées** (P2.1 #549,
P2.2 #566, P2.3 #550, P2.4 #571, P2.5 #552).

Domaine : a11y
</content>
</invoke>
