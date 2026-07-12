# Déployer IRL LVP UP sur ton téléphone (version web / PWA)

L'app est maintenant une **PWA** : installable et utilisable hors-ligne sur mobile, sans passer par un store. Il suffit de la mettre en ligne une fois, puis de l'« ajouter à l'écran d'accueil ».

Tout est déjà prêt côté code (manifest, service worker, workflow de déploiement). **Ce qu'il te reste à faire, une seule fois :**

## 1) Mettre le code sur GitHub

Le dépôt existe déjà (`adrienlvl/irl-lvp-up`, utilisé pour l'auto-update de la version Windows). Il faut juste y **pousser** les derniers commits :

```bash
cd "D:\IRL LVP UP"
git push        # (ou configure le remote si ce n'est pas déjà fait)
```

> Si le remote n'est pas configuré : `git remote add origin https://github.com/adrienlvl/irl-lvp-up.git` puis `git push -u origin master`.

## 2) Activer GitHub Pages (2 clics)

Sur GitHub → ton dépôt **irl-lvp-up** → **Settings** → **Pages** → **Build and deployment** → **Source : GitHub Actions**.

C'est tout. À chaque push, le workflow `.github/workflows/pages.yml` reconstruit et publie l'app automatiquement.

## 3) Ouvrir l'app

Au bout d'une minute, l'app est en ligne ici :

**https://adrienlvl.github.io/irl-lvp-up/**

- **Sur ton téléphone** (Chrome Android / Safari iOS) : ouvre ce lien → menu → **« Ajouter à l'écran d'accueil »**. Elle s'installe comme une vraie app (icône, plein écran, hors-ligne).
- **Sur ordinateur** (Chrome/Edge) : icône d'installation dans la barre d'adresse.

## Sécurité & données

- **Tes données ne sont jamais mises en ligne.** Seul le *code* de l'app est publié. Toutes tes données (séances, poids, agenda…) restent en **local** dans le navigateur de chaque appareil (`localStorage`), comme sur la version Windows.
- La version web et la version Windows sont **indépendantes** : deux appareils = deux jeux de données locaux. Pour transférer, utilise **Réglages → 💾 Exporter / Importer** (la version installée) — la sync multi-appareils chiffrée reste une option à décider (roadmap 4.6).
- L'URL est publique (n'importe qui peut *ouvrir l'app vide*), mais **personne ne voit tes données**.

## Fonctions réservées à la version Windows installée

Certaines capacités s'appuient sur Electron et se **désactivent proprement** en web (l'app affiche « aperçu web » / « disponible seulement dans l'app installée ») :

- notifications de bureau, export/import de fichier, estimation de trajet, mise à jour automatique.

Le cœur (séances guidées, minuteur de repos, Coach Poids, agenda, quêtes, suivi…) fonctionne **entièrement** en web/mobile.
