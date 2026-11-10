# Procédure de déploiement

Cette procédure déploie le backend sur le serveur à partir de l'image publiée sur Docker Hub par Jenkins. Elle se fait en trois temps : préparer le serveur (une seule fois), configurer GitLab (une seule fois), puis lancer le pipeline (à chaque version).

## Prérequis

- un serveur Ubuntu en amd64, accessible en SSH, avec un utilisateur qui a le droit d'utiliser `sudo` ;
- Tailscale installé sur le serveur et sur le poste de travail ;
- Terraform et Ansible installés sur le poste de travail (versions utilisées : Terraform 1.17.1, Ansible core 2.21.6) ;
- une clé SSH de déploiement qui ouvre le serveur sans mot de passe ;
- une image du backend publiée sur Docker Hub **en amd64** ;
- un projet GitLab qui contient le dépôt.

## 1. Préparer le serveur (une seule fois)

### Terraform

Terraform crée le réseau et le volume Docker, et génère l'inventaire Ansible.

```bash
cd deploiement/terraform
```

Créer le fichier `terraform.tfvars` (il n'est pas dans le dépôt) :

```
server_host          = "ADRESSE_TAILSCALE_DU_SERVEUR"
ssh_user             = "serveur"
ssh_port             = 22
ssh_private_key_path = "~/.ssh/CLE_DE_DEPLOIEMENT"
app_name             = "souverainrecrut"
```

Puis :

```bash
terraform init
terraform validate
terraform plan
terraform apply
```

Résultat attendu : `Apply complete! Resources: 3 added`. Le serveur a un réseau `souverainrecrut-net` et un volume `souverainrecrut-postgres-data`, et le fichier `deploiement/ansible/inventory.ini` existe.

### Ansible

Ansible prépare le système : mise à jour, dépendances, Docker et Compose (installés seulement s'ils manquent), service Docker, dossier `~/deployment`.

```bash
cd ../ansible
ansible-playbook -i inventory.ini playbook.yml --ask-become-pass
```

Le mot de passe demandé est celui de `sudo` sur le serveur. Résultat attendu : `failed=0`. Le playbook peut être relancé sans danger.

## 2. Configurer GitLab (une seule fois)

**Fichier de pipeline.** Dans *Settings > CI/CD > General pipelines*, mettre `deploiement/.gitlab-ci.yml` dans « CI/CD configuration file ». Le pipeline ne tourne que sur la branche `main`.

**Clés à préparer**

- Clé Tailscale : console Tailscale, *Settings > Keys > Generate auth key*, avec *Reusable* et *Ephemeral*.
- Token Docker Hub : *Account settings > Personal access tokens*, en lecture seule (le serveur ne fait que télécharger).
- Clé SSH en base64, sur une seule ligne :
  ```bash
  base64 < ~/.ssh/CLE_DE_DEPLOIEMENT | tr -d '\n' | pbcopy
  ```
- Secrets de la base et de l'API :
  ```bash
  openssl rand -hex 16   # POSTGRES_PASSWORD
  openssl rand -hex 32   # JWT_SECRET
  ```

**Variables CI/CD** (*Settings > CI/CD > Variables*, type *Variable*)

| Variable | Contenu | Masquée |
|---|---|---|
| `SERVER_TS_IP` | adresse Tailscale du serveur | oui |
| `SERVER_USER` | utilisateur SSH | non (moins de 8 caractères) |
| `SSH_PRIVATE_KEY_B64` | clé privée en base64 | oui |
| `TS_AUTHKEY` | clé Tailscale | oui |
| `DOCKERHUB_USER` | compte Docker Hub | non (moins de 8 caractères) |
| `DOCKERHUB_TOKEN` | token Docker Hub | oui |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | accès à PostgreSQL | oui |
| `JWT_SECRET` | secret de signature des jetons | oui |

Deux règles :
- le type doit être **Variable**, pas **File**. Avec un fichier, le job reçoit un chemin au lieu de la valeur ;
- `Protect variable` n'est utile que si `main` est une branche protégée. Sinon la variable arrive vide dans le job.

Le mot de passe PostgreSQL ne doit pas contenir de caractère spécial, car il est utilisé dans `DATABASE_URL`.

## 3. Déployer une version

1. Dans GitLab, *Build > Pipelines > New pipeline*, branche `main`.
2. Remplacer la variable `IMAGE_TAG` par le numéro de build Jenkins à déployer (par exemple `11`). Le tag `latest` est refusé.
3. Lancer le pipeline.
4. `validate_tag` vérifie que le tag existe sur Docker Hub.
5. Cliquer sur le bouton de lecture du job `deploy` : c'est l'approbation manuelle.
6. `verify` démarre ensuite tout seul.

Ce que fait `deploy` :

1. il crée `~/deployment` sur le serveur ;
2. il copie `docker-compose.yml` et le dossier `prisma/` ;
3. il écrit le `.env` du serveur à partir des variables GitLab (droits `600`) ;
4. il se connecte à Docker Hub et télécharge les images (`docker compose pull`) ;
5. il démarre PostgreSQL et attend qu'il soit sain ;
6. il applique les migrations avec un conteneur éphémère (`docker compose --profile migrate run --rm migrate`) ;
7. il démarre le backend (`docker compose up -d`).

Avant tout cela, le job vérifie que les variables obligatoires ne sont pas vides, et s'arrête en listant leurs noms si l'une manque.

`verify` affiche `docker compose ps`, puis attend que `/v1/health` réponde (12 essais, 5 secondes entre chaque). S'il échoue, il affiche les 50 dernières lignes de logs du backend.

## 4. Vérifier le déploiement

Depuis le poste de travail (via Tailscale) :

```bash
curl http://ADRESSE_DU_SERVEUR:4000/v1/health
curl http://ADRESSE_DU_SERVEUR:4000/v1/ready
```

`/v1/health` doit répondre `UP`. `/v1/ready` doit répondre `READY` avec `database: CONNECTED`.

Sur le serveur, dans `~/deployment` :

```bash
docker compose ps
docker compose logs -f backend
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"'
```

`docker compose ps` doit montrer les deux services `healthy`. La dernière commande liste les tables créées par les migrations (`users`, `candidates`, `jobs`, `applications`, `_prisma_migrations`).

## Migrations Prisma

Le CLI Prisma n'est pas dans l'image du backend : l'image ne contient que ce qui sert à l'exécution. Les migrations sont appliquées par un conteneur `node:22` éphémère, défini dans le compose avec le profil `migrate`. Il lit le dossier `prisma/` copié par le pipeline et lance `prisma migrate deploy`.

Cette commande applique seulement les migrations qui ne sont pas encore passées. Relancer un déploiement ne refait donc rien. Elle ne sait pas annuler une migration : voir `procedure-rollback.md`.

## En cas de problème

| Symptôme | Cause probable | Solution |
|---|---|---|
| `validate_tag` : tag introuvable (404) alors qu'il existe | `DOCKERHUB_USER` vide dans le job : variable protégée sur une branche non protégée, ou nom mal écrit | décocher `Protect variable`, ou protéger `main` ; vérifier le nom |
| Le job `deploy` liste des variables vides | variable absente, mal nommée, protégée ou de mauvais type | corriger la variable listée |
| `error in libcrypto` sur la clé SSH | clé mal copiée dans GitLab | utiliser `SSH_PRIVATE_KEY_B64`, de type *Variable* |
| `base64: invalid input` | la variable est de type *File* : le job reçoit un chemin | passer le type à *Variable* |
| `password is empty` au `docker login` | `DOCKERHUB_TOKEN` vide | corriger la variable |
| Le conteneur du backend ne démarre pas | image construite en arm64 | utiliser un tag amd64 (le `11` ou plus) |
| `terraform plan` : « No value for required variable » | `terraform.tfvars` manquant ou incomplet | recréer le fichier avec les cinq variables |
| Ansible : mot de passe `sudo` demandé | `sudo` demande un mot de passe | ajouter `--ask-become-pass` |
| Ansible : erreur 404 pendant `apt upgrade` | miroir apt en cours de mise à jour | relancer le playbook quelques minutes plus tard |
