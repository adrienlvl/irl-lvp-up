# 655 — Navigation principale redessinée : tuiles icône + libellé cohérentes (2.0.263)

## Contexte

Retour direct d'Adrien : « le design et l'UI de l'app est toujours mauvaise en vrai ! Continue les
boucles ». Première itération d'une **passe qualité UI** menée écran par écran. J'ai ouvert l'app en
navigateur et inspecté le rendu réel : la nav principale (`.app-nav`, 9 onglets) était le défaut le
plus visible et le plus universel — elle encadre **tous** les écrans.

## Le problème (constaté dans le rendu, pas supposé)

- **Icônes incohérentes** : sur les 9 onglets, seuls 3 portaient une icône (`⚖️ Poids`, `💼 Alternance`,
  `⚙️ Réglages`) — les 6 autres étaient du texte nu. Ce mélange fait « bricolé ».
- **Sur téléphone** (≤650px) : grille 3×3 de **pastilles transparentes** en texte `.78rem` serré,
  quasi invisibles tant qu'on ne les cherche pas ; l'onglet actif = **aplat vert lime massif** (lourd).
- **Dette CSS** : les règles `.app-nav a{…}` (dans `polish.css`) ciblaient des `<a>` alors que le markup
  utilise des `<button>` → **règles mortes** qui ne s'appliquaient à rien.

## Le changement

- **`index.html`** : chaque onglet passe à `<button><span class="nav-ico">(icône)</span><span class="nav-lbl">(libellé)</span></button>`.
  Icône propre pour **chaque** onglet : 🏠 Aujourd'hui · 🗓️ Agenda · 💪 Athlète · ⚖️ Poids ·
  📚 Exercices · 🥗 Nutrition · 🎯 Focus & vie · 💼 Alternance · ⚙️ Réglages. Les 3 emojis inline
  historiques passent dans `.nav-ico` (plus de mélange texte/emoji dans le libellé).
- **`pages.css`** (charge après `polish.css`/`calendar-page.css` → gagne la cascade sans `!important`) :
  - Base : `.app-nav button` en `inline-flex` (icône + libellé alignés), `.nav-ico`/`.nav-lbl` cadrés.
  - Actif : halo **vert lime tinté** (`linear-gradient` + bordure interne `box-shadow inset`) au lieu de
    l'aplat massif — texte passe en `--accent`. Bordure interne = pas de décalage de layout, pas de
    coin arrondi sur bordure d'un seul côté.
  - Mobile (≤650px) : vraie **grille de tuiles** — chaque onglet a un fond `--surface-2` + bordure
    discrète (`inset 0 0 0 1px --line`), icône 1,25rem au-dessus du libellé 0,7rem. Se lit d'un coup d'œil.
  - Desktop (>650px) : la même barre reste une **rangée compacte** de 56px (icône + libellé en ligne).

## Non-régression

- Aucun JS ni smoke ne lit le **texte** des boutons de nav : l'état actif est piloté par `showPage`
  via l'attribut `data-page` + la classe `.active` (inchangés). Le bouton Agenda garde son
  `id="openWeekPage"`. `aria-current` et le focus clavier sont préservés (spans `aria-hidden`).
- Vérifié en **styles calculés** (l'outil de capture était bloqué cette session) : mobile → grille
  3×3, tuiles distinctes, actif tinté lime, 9/9 icônes+libellés, **aucun libellé tronqué**, nav 180px ;
  desktop 900px → flex row 56px, icône+libellé en ligne, scroll horizontal seulement en deçà de ~1000px.

## Vérification

- Purement rendu (CSS/markup) → pas de nouvelle logique testable ; les gardes existants protègent le
  comportement : check smoke **bloquant** `navAriaCurrent` (bascule actif/`aria-current`) + `whatsNew`
  (`CHANGELOG[0].v === '2.0.263'`) restent verts.
- `cd src && npm run verify` → **577 tests + SMOKE OK**.
- Aperçu avant/après publié en Artifact pour qu'Adrien juge visuellement.

## Suite

Prochaines itérations de la passe UI (loops) : carte joueur (Niveau/XP), densité/hiérarchie
typographique des panneaux du dashboard, puis écran par écran. Objectif : passer le ressenti de
« bricolé » à « pensé ».

Domaine : fondations
