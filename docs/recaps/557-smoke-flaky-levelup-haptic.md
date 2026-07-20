# #557 — Smoke déflaké : le parcours « enregistrer une séance » ne vibre plus au passage de niveau

**Type :** réparation du harnais (§5 de VPS-AUTOPILOT). **Pas de bump** (changement test-only, §2.6).
**Fichier touché :** `src/test/renderer-smoke.cjs` (7 lignes ajoutées, aucune logique produit modifiée).

## Pourquoi cette itération n'est PAS du backlog

Au tout début du run, `xvfb-run -a npm run verify` était **rouge** — mais de façon **intermittente**
(~1 échec sur 5). §5 est explicite : « verify rouge AVANT tes changements → répare le harnais
d'abord, **rien d'autre**. » Un harnais flaky est pire que pas de test : il fait échouer au hasard
la porte « 100 % vert » de **chaque** future itération (dont la poussée coaching de la nuit). Cette
itération lui est donc entièrement consacrée.

## La flakiness, diagnostiquée

Le check `recordSessionJourney` (posé en #556) enregistre une séance **de bout en bout** : clic
`#addWorkoutButton` → saisie → `submit` réel → assertions. #556 avait pris soin de **pré-remplir
l'historique** d'un Squat plus lourd pour qu'aucun **record** ne soit battu (un record →
`haptic('record')` → `navigator.vibrate`, bloqué par Chromium sans geste utilisateur → warning
console `level ≥ 3` → **SMOKE FAIL**).

Mais une **autre** célébration restait ouverte : le `submit` crédite l'XP de la séance, puis
`render()` → `renderDashboardCore` (`app.js:551`) déclenche `haptic('levelUp')` **dès que ce +XP
franchit un palier de 100**. Selon l'XP accumulée par les checks précédents, la séance faisait
**parfois** passer un niveau, parfois non — d'où l'intermittence. Preuve à l'œil dans les logs :
run rouge → `"levelSet":"90 / 100 XP"` (le +XP tipe par-dessus 100 → vibrate) ; run vert →
`"levelSet":"20 / 100 XP"` (pas de franchissement, pas de vibrate).

Confirmé empiriquement : sur master **propre**, 4 runs → 1 échec ; le problème préexiste à mes
changements (ce n'est donc pas une régression que j'aurais introduite).

## Le correctif

On neutralise **tout** `haptic` pendant le parcours (record, level-up, quest, etc.), exactement
comme le fait déjà le check `overlayFocus` (`renderer-smoke.cjs:~794`) : `const _oh =
window.haptic; window.haptic = () => {}` avant le journey, restauré **après** le `render()` de
restauration d'état. Aucune assertion affaiblie — le journey teste l'**enregistrement**, pas les
célébrations, qui ont leurs propres checks (`newRecordToast`, `levelUp`). Les appels `haptic()` nus
d'`app.js` se résolvent sur `window.haptic`, donc le stub les intercepte tous (précédent l. 794).

## Vérif

`cd src && xvfb-run -a npm run verify` → **522 tests + smoke, exit 0**. Puis **6 runs smoke
consécutifs → 6/6 verts** (contre ~1 échec sur 5 avant). Flakiness éliminée.

## Piste prête pour une prochaine boucle (coach, mise de côté par §5)

En explorant le coach (priorité de nuit), j'ai trouvé — via un **rendu chargé (§4ter)** — un vrai
défaut de curation : `orderCoachNotes` trie **phrase par phrase**, or plusieurs guards sont
**autorisés sur deux phrases** (prémisse classée + conclusion non classée, ex. sommeil : « … risque
de blessure. Bien dormir démultiplie l'effort. »). Le tri **déchire** le bloc : la conclusion, restée
au rang par défaut, atterrit **orpheline tout en bas**, loin de sa prémisse — le fil casse dès qu'on
déplie « plus de contexte ». Correctif validé en local mais **non commité** (§5 imposait « rien
d'autre » ce run) : dans `orderCoachNotes`, faire **hériter** une phrase non classée du rang de la
dernière phrase classée qui la précède (garde chaque bloc soudé ; tri stable → ordre intra-bloc
intact). Test logique + check smoke `coachCuration` prêts à reposer. Domaine `coach`, rotation à
revérifier au moment de la reprendre.

Domaine : robustesse
