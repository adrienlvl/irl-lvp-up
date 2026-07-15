# #334 — Accueil personnalisé selon l'heure (1.9.268)

## Pistes écartées d'abord (dites honnêtement)

- **Quêtes** : l'ajout de quêtes custom (nom + catégorie + XP, via un dialog) existe déjà — pas un
  manque.
- **Conseils nutrition** : `nutritionTips` est déjà une liste concise et correcte ; l'enrichir serait
  du remplissage marginal.

## Le manque retenu (type frais : polish / personnalisation)

Le message d'accueil (`#dailyMessage` dans le hero) était **générique** : « Jour N de ton aventure.
Choisis ta prochaine petite victoire. » — ni prénom, ni moment de la journée. L'onboarding capture
pourtant `profile.name`, jamais utilisé pour saluer.

## Ce qui change

Fonction pure `dailyGreeting({ name, hour })` → `{ hello, nudge }` : salutation adaptée à l'heure
(Bonjour / Bon après-midi / Bonsoir / Encore debout) avec le prénom, plus un petit mot de contexte
(matin : « pose ton cap » ; soir : « fais le bilan de ta journée »…). Le hero affiche désormais :
« **Bonsoir Adrien 👋 — jour 12 de ton aventure, fais le bilan de ta journée.** »

## Vérification navigateur (20 h)

| Contrôle | Résultat |
|---|---|
| Message affiché | ✅ « Bonsoir Adrien 👋 — jour 12… fais le bilan de ta journée. » |
| Matin (8 h) | ✅ « Bonjour Adrien — pose ton cap pour aujourd'hui » |
| Après-midi (15 h) | ✅ « Bon après-midi Adrien — une petite victoire à cocher ? » |
| Nuit (1 h) | ✅ « Encore debout Adrien — pense aussi à te reposer » |

## Tests

357 tests `node:test` (+ `dailyGreeting` : 4 tranches, sans nom, prénom seul tronqué, heure absente
→ midi, bornes) + smoke `dailyGreeting` **bloquant** (fonction + 👋 présent dans #dailyMessage).

## Rotation

#334 — rotation 31 (build 1.9.268). Prochain #335 = clôture (tag v1.9.269).
