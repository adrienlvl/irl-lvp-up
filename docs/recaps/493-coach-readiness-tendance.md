# 493 — Coaching : le coach repère la fatigue qui s'installe (2.0.124)

**Boucle #493 · build 2.0.124 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Quand le pilier poussé est le SPORT, `adaptiveCoachFocus` calait déjà l'action sur deux signaux de
récup : la **readiness du jour** (`readinessScore`, la forme du matin, UNE nuit — #463) et la
**charge cumulée** (`acuteChronicRatio`, le pic de volume — #492). Mais il restait **aveugle à la
PENTE de forme** : `readinessTrend` (la readiness des N derniers check-ins + delta) existait et était
même rendue dans l'onglet Athlète, mais **le coach ne la lisait pas**. Le cas piégeux est le
symétrique de celui du `loadSpike` : une readiness du jour **« correcte »** (55-70, l'action dit
« séance correcte, garde une marge : pas de record ») mais qui **GLISSE** relevé après relevé. Le
score d'un seul jour n'y voit qu'un milieu de tableau ; la pente révèle une **fatigue qui s'installe**
(surmenage naissant), exactement l'« adaptation aux écarts » demandée pour la nuit — et un domaine
(récup **cumulée**) que ni la readiness du jour ni la charge ne couvraient.

## Ce qui a été livré

Un **coach conscient de la tendance de readiness** greffé sur l'action sport. Quand le pilier poussé
est le SPORT, que la séance du jour n'est pas déjà faite (`doneToday`) et que la readiness du jour est
dans la **zone d'alerte douce** — **≥ 50** (sous 50 l'action dit déjà « récup », inutile d'empiler) et
**< 75** (au vert, glisser depuis très haut reste bénin) —, le coach interroge `readinessTrend`. Si
elle **descend franchement** (`direction === 'down'`, chute **≥ 12 pts** sur **≥ 4 check-ins**), il
NOMME la glissade au lieu de servir « séance correcte » (champ **`readinessSlide`** = le delta négatif,
ou `null`) :

> 📉 Readiness 55/100 aujourd'hui — correcte en soi, mais ta forme glisse sur tes 5 derniers check-ins
> (-45 pts) : ce n'est pas un creux d'un soir, c'est de la fatigue qui s'accumule. Séance allégée
> aujourd'hui, et soigne ta récup avant de taper dans le rouge.

Sans glissade (forme stable → tendance plate), jour au vert (≥ 75) ou jour déjà bas (< 50), **rien ne
change**.

## Conception

- **Additif pur** : champ `readinessSlide` (le delta, ou `null`) TOUJOURS renvoyé ; l'action est
  **remplacée** uniquement en cas de glissade, aucune autre branche touchée. Ne se déclenche que sur
  données réelles (≥ 4 check-ins datés).
- **Complémentaire, pas redondant** — les trois signaux de récup se répartissent proprement le
  terrain : readiness **du jour** (forme d'aujourd'hui), `readinessSlide` (**pente** de la forme),
  `loadSpike` (**charge** cumulée). La zone [50, 75[ est le point aveugle exact de la readiness du jour
  (« correcte »), là où la pente apporte l'info neuve.
- **Garde-fous anti-contradiction** :
  - le **`loadSpike`** (plus bas, plus urgent) peut encore réécrire l'action si un pic de charge
    coïncide — les deux disent « allège », pas de contradiction ; `readinessSlide` reste dans le champ,
    informatif ;
  - l'**escalade de reprise** (`comebackStage` « building ») garde le geste léger quand la forme glisse
    (`readinessSlide` ajouté au garde-fou `sportEase`, comme `loadSpike` en #492) — « repasse à une
    vraie séance » contredirait « fatigue qui s'accumule ».

## Vérif

- `adaptiveCoachFocus` reste pure ; test node:test dédié : glissade -45 pts / readiness 55 →
  `readinessSlide` renvoyé + « ta forme glisse sur tes 5 derniers check-ins » ; jour au vert (85) en
  tendance descendante → `readinessSlide` null, « prêt à pousser » ; forme stable (~63) → null,
  « garde une marge » ; jour déjà bas (< 50) → null, action récup.
- Check smoke bloquant `coachFocus` étendu (glissade → action tempérée ; jour au vert → pas d'alerte).
- `cd src && xvfb-run -a npm run verify` : **469 tests + smoke 100 % vert**.

## Suite possible

- Signal INVERSE : readiness qui **remonte** franchement (tendance 'up') sur un pilier sport en reprise
  → « ta forme revient, tu peux réhausser l'intensité » (cohérent avec l'escalade `comebackStage`).
- Croiser `readinessSlide` avec `morningEnergyTrend` (énergie du matin) : deux pentes descendantes
  concordantes = signal de surmenage renforcé.
- Étendre la conscience de tendance au pilier **sommeil** (dette qui s'aggrave sur la fenêtre) au-delà
  du verdict ponctuel `sleepCoachInsight`.
