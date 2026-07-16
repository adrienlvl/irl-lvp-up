# VPS — faire tourner la boucle autonome 24/7

But : que Claude Code travaille sur IRL LVP UP depuis un serveur toujours allumé (nuit, journée,
absences), au lieu de mourir avec la session du PC. Guide pensé pour **Ubuntu 24.04 LTS** (2 vCPU /
4 Go RAM suffisent largement).

## 1. Sécuriser la base (priorité cybersécurité du projet)

```bash
# utilisateur non-root
adduser adrien && usermod -aG sudo adrien
# SSH : clés uniquement (dans /etc/ssh/sshd_config : PasswordAuthentication no, PermitRootLogin no)
systemctl restart ssh
# pare-feu minimal + anti-bruteforce + MAJ auto
ufw allow OpenSSH && ufw enable
apt-get install -y fail2ban unattended-upgrades
```
**Rien d'autre d'ouvert.** Le VPS n'expose aucun service : il *sort* vers GitHub/Anthropic, c'est tout.

## 2. Outils

```bash
# Node 22 LTS via nvm — PAS Node 24 (pièges connus du projet)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install 22
apt-get install -y git tmux
# Dépendances Electron headless (pour le smoke via xvfb)
apt-get install -y xvfb libnss3 libatk-bridge2.0-0 libgtk-3-0 libgbm1 libasound2t64
```

## 3. GitHub

```bash
# au choix : gh auth login (token limité au repo), ou clé SSH de déploiement avec droit push
git clone git@github.com:adrienlvl/irl-lvp-up.git && cd irl-lvp-up/src && npm ci
# contrôle : la suite complète doit passer en headless
xvfb-run -a npm run verify
```

## 4. Claude Code

```bash
npm install -g @anthropic-ai/claude-code
claude   # connexion au compte la 1re fois (ou `claude setup-token` pour un poste headless durable)
```

## 5. Lancer la boucle (survit à la déconnexion SSH)

```bash
tmux new -s loop
cd ~/irl-lvp-up && claude
# coller la consigne /loop du projet, puis détacher : Ctrl+B puis D
# revenir voir : tmux attach -t loop
```

## Notes importantes

- **Cadence** : sur un VPS 24/7, une boucle à ~90 s consommerait énormément d'usage Claude.
  Recommandé : **15-30 min en continu**, ou des fenêtres (ex. la nuit à cadence serrée).
- **Releases Windows** : toujours construites par **GitHub Actions au tag** — le VPS n'a besoin ni
  de Wine ni de signer quoi que ce soit. La règle « Releases espacées (~1/jour) » s'applique aussi ici.
- **Vérification navigateur** : le smoke Electron sous `xvfb-run` couvre le renderer ; pour une
  vérif visuelle fine, ça reste le boulot des sessions de jour.
- **Secrets** : le token GitHub et l'auth Claude vivent sur le VPS → accès SSH par clé uniquement,
  jamais de copie de ces secrets dans le repo.
- Les instances (PC + VPS) travaillent sur le même `master` : `git pull --rebase` avant chaque
  itération pour éviter les conflits (la boucle le fait naturellement en commençant par lire l'état).
