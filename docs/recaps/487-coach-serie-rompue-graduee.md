# 487 — Coaching : le coach gradue sa consolation à la taille de la série cassée (2.0.118)

**Boucle #487 · build 2.0.118 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Depuis #486, `adaptiveCoachFocus` (« Le focus du moment ») sait **consoler une série qui vient de
casser** (`brokenStreak`) : quand il corrige un pilier retombé après une vraie série (≥ 4 j, close il
y a peu), il reconnaît l'acquis plutôt que de reprocher la pause. Mais il servait **le même message
quelle que soit la longueur perdue** : consoler « pareil » une série de 4 jours et une série d'un mois
sonne faux — la première se relance d'un geste léger, la seconde était un **vrai capital** dont la
reprise mérite un mot à la hauteur. « Nuance de la reprise selon la longueur de la série perdue
(“tu tenais un mois — ça vaut une vraie reprise” vs “4 jours, vite relancé”) pour graduer
l'encouragement » figurait en **tête des prochaines pistes** de #486.

## Ce qui a été livré

`brokenStreak` **gradue** désormais sa formulation selon la magnitude, avec les **paliers existants**
(`STREAK_MILESTONES` : 7 = semaine, 14 = deux semaines, 30 = mois) :

- **Série longue** (`broke >= 7`, palier de la semaine franchi) → ton `long`, magnitude **nommée** :

  > Tu tenais **une semaine entière** d'affilée sur ton entraînement avant cette pause — ça, c'est du
  > solide : pas un échec, une vraie base à relancer. Un geste aujourd'hui et tu repars de haut.

  Libellés : ≥ 30 → « un mois entier », ≥ 14 → « deux semaines pleines », ≥ 7 → « une semaine entière ».

- **Série courte** (4 ≤ `broke` < 7) → ton `court`, message léger conservé :

  > Tu tenais 5 jours d'affilée sur ton entraînement avant cette pause — pas un échec, une **série vite
  > relancée** : un geste aujourd'hui et tu repars.

Reconnaître un vrai capital perdu à sa juste valeur motive plus qu'un mot passe-partout.

Points de conception :

- **Réutilise l'échelle existante** (`STREAK_MILESTONES` 7/14/30) — aucun nouveau seuil, cohérent avec
  la carotte des paliers en jeu (#485) et les journées complètes (#477).
- **Additif pur** : nouveau champ `brokenStreakTier` (`'long'` | `'court'`, ou `null` si pas de série
  rompue) TOUJOURS renvoyé ; seul le libellé de la note `brokenStreak` change, l'action reste intacte.
- **Hérite de toutes les gardes de `brokenStreak`** (`rebuild`, hors rotation, série bien rompue
  aujourd'hui, dernier geste ≤ 10 j, série ≥ 4 j).

## Vérif

- `adaptiveCoachFocus` reste pur ; test node:test étendu (série de 5 j → `brokenStreakTier` `'court'`
  + « vite relancée » ; série de 8 j → `brokenStreakTier` `'long'` + « une semaine entière » + « ça,
  c'est du solide », pas de « vite relancée » ; pas de série rompue → tier `null`).
- Check smoke bloquant `coachFocus` étendu (`fBroken` : 5 j → `court` ; `fLongBroken` : 8 j → `long`,
  magnitude nommée ; `fShortBroken` : tier `null`).
- `cd src && xvfb-run -a npm run verify` : **100 % vert**.

## Suite possible

- Micro-jalon de reprise après une série rompue : célébrer le retour à 2/3 jours d'affilée comme un
  « tu reconstruis ce que tu avais perdu » (piste #486 encore ouverte).
- Rappeler le record personnel de série d'un pilier quand la reprise s'en rapproche.
