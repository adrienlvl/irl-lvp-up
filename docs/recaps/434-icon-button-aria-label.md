# 434 — Accessibilité : le bouton boussole « 🧭 » de Ma semaine a enfin un nom accessible (2.0.67)

## Le manque (§4.3 accessibilité, domaine Agenda / Ma semaine)

Après 5 boucles d'affilée de correctness/robustesse (#429→#433, toutes autour de « date impossible
qui déborde » ou d'idempotence de fusion), variété de type ET de domaine (§4) : une passe
**accessibilité**.

Audit des boutons interactifs (`index.html` + templates `app.js`) : l'app est en fait **très
soignée** côté a11y — chaque bouton icône-seule généré dynamiquement porte déjà un `aria-label`
(`delete-workout`, `del-birthday`, `habit-edit` ✏️, `todo-del` ×, `todo-undone` ✓…), et les blocs
statiques aussi (flèches de navigation ←/→, croix de fermeture ×, cases, selects de filtre). Le
smoke garde même déjà 4 checks a11y bloquants (`closeButtonsA11y`, `navArrowsA11y`, `restSoundA11y`,
`filterSelectsA11y`).

**Un seul oubli** est ressorti d'une recherche systématique des boutons dont le contenu ne comporte
**aucune lettre/chiffre** (icône seule) et sans `aria-label` :

```html
<!-- index.html:240, formulaire #weekQuickAdd (« Ma semaine ») -->
<button type="button" id="weekQuickEstimate" class="secondary-button"
        title="Estimer le trajet depuis mon point de départ (OpenStreetMap)">🧭</button>
```

Contenu = juste l'emoji 🧭, pas de texte, pas d'`aria-label`. Ce bouton estime le temps de trajet
d'un bloc de la semaine. Or ses **deux jumeaux qui font la même action ailleurs** affichent, eux,
« 🧭 **Estimer** » (`calendarAgendaEstimate` `index.html:227`, `editAgendaEstimate` `:242`) : leur
texte visible sert de nom accessible. `weekQuickEstimate` était le seul incohérent.

Pourquoi ça compte concrètement : l'app est une **PWA installée sur l'iPhone d'Adrien**. Sous
**VoiceOver** (iOS), un bouton dont le seul contenu est un emoji est annoncé « boussole, bouton » —
sans dire à quoi il sert — et le `title` (tooltip au survol) n'est **pas** annoncé de façon fiable
au tactile. L'utilisateur au lecteur d'écran n'avait donc aucun moyen de savoir que ce bouton estime
un trajet.

`grep` : aucun check ne couvrait ce bouton côté nom accessible (seule sa **présence** était vérifiée
par le check `agendaEdit`).

## Le geste (un `aria-label`, aligné sur le motif existant)

```html
<button type="button" id="weekQuickEstimate" class="secondary-button"
        aria-label="Estimer le trajet depuis mon point de départ"
        title="Estimer le trajet depuis mon point de départ (OpenStreetMap)">🧭</button>
```

Un `aria-label` reprenant le libellé du `title`, comme tous les autres boutons icône-seule de l'app.
**Zéro changement visuel** (l'emoji reste seul à l'écran), zéro logique touchée. On n'a **pas** ajouté
d'`aria-label` aux boutons qui portent déjà un texte visible (`🧭 Estimer`, `⧉ Dupliquer`,
`🔄 Remplacer`, `−15s`/`+15s`…) : ce serait redondant et pourrait au contraire *écraser* le nom
visible attendu par la commande vocale.

## Tests & vérif

- **Nouveau check smoke bloquant `iconButtonsA11y`** (`renderer-smoke.cjs`) : vérifie qu'un bouton
  au contenu **sans lettre ni chiffre** (icône seule) — aujourd'hui `#weekQuickEstimate` — porte bien
  un `aria-label` non vide. Ligne `errors.push` dédiée. Ce garde-fou refermera aussi le cas si un
  futur bouton icône-seule était ajouté sans nom accessible.
- `cd src && xvfb-run -a npm run verify` → **441 tests + smoke 100 % verts** (`iconButtonsA11y:true`,
  `whatsNew` en 2.0.67, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.66 → 2.0.67** : effet utilisateur réel (nom accessible pour VoiceOver/lecteurs d'écran)
  → entrée CHANGELOG (♿) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).
- Un attribut HTML + un check smoke. Aucune feature retirée, aucune Release, zéro dépendance,
  aucune donnée perso, posture sécurité inchangée.

## Variété (§4)

Rompt volontairement la série correctness/dates (#429→#433) pour une passe **accessibilité (§4.3)**,
domaine **Agenda / Ma semaine**. L'audit confirme au passage que l'a11y de l'app est déjà très
propre : c'était le dernier bouton icône-seule sans nom accessible. Boucle #434.
