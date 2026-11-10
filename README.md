# SouverainRecrut

## Présentation

SouverainRecrut est une plateforme web de gestion des recrutements destinée aux entreprises.

Elle permet de :

- gérer les candidats ;
- publier des offres d'emploi ;
- suivre les candidatures ;
- centraliser le processus de recrutement.

Ce projet est utilisé comme **projet fil rouge** des cours DevOps. Le travail CI/CD porte uniquement sur le **backend** : le frontend n'est ni testé, ni construit, ni déployé.

---

## Architecture

```
Frontend (React)
        │
        ▼
Backend (Express API)
        │
        ▼
PostgreSQL
```

### Chaîne CI/CD

```
GitHub (branche Dev)
   │
   ▼
Jenkins : tests, SonarQube, Quality Gate, build Docker, scan Trivy
   │
   ▼
Docker Hub : jackylp/souverainrecrut-backend:<numéro de build>
   │
   ▼
GitLab CI/CD (branche main) : validation du tag, déploiement en SSH, vérification
   │
   ▼
Serveur Ubuntu (Docker Compose : backend + PostgreSQL)
```

Le serveur est préparé avant, une seule fois, avec Terraform (réseau et volume Docker) et Ansible (Docker, dossier de déploiement).

---

## Stack technique

### Frontend

- React
- TypeScript
- Vite
- Axios
- Material UI

### Backend

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- Jest et supertest (tests)

### DevOps

- Git, GitHub, GitLab
- Jenkins, SonarQube, Trivy
- Docker, Docker Compose, Docker Hub
- Terraform, Ansible
- GitLab CI/CD
- Tailscale (accès au serveur)

---

## Arborescence

```
souverainrecrut/
│
├── backend/                 API Express, tests, Dockerfile
├── frontend/                Application React (hors périmètre CI/CD)
├── integration-continue/    Jenkinsfile, image Jenkins, config SonarQube, rapports
├── deploiement/
│   ├── terraform/           Réseau et volume Docker du serveur, inventaire Ansible
│   ├── ansible/             Inventaire et playbook de préparation du serveur
│   ├── deployment/          docker-compose.yml et .env.example
│   ├── captures/            Captures du déploiement
│   └── .gitlab-ci.yml       Pipeline de déploiement
├── documentation/           Rapport final, architecture, procédure de rollback
├── docs/                    Documentation du projet (API, base, architecture)
└── README.md
```

---

## Prérequis

- Node.js 22 ou plus
- Docker (Docker Desktop sur Mac)
- Pour la partie déploiement : Terraform, Ansible, un serveur Ubuntu accessible en SSH, un compte Docker Hub et un compte GitLab

---

## Lancer le backend en local

**1. Démarrer PostgreSQL**

```bash
docker run -d --name souverainrecrut-db -p 5432:5432 \
  -e POSTGRES_USER=souverainrecrut \
  -e POSTGRES_PASSWORD=motdepasse \
  -e POSTGRES_DB=souverainrecrut \
  postgres:16-alpine
```

**2. Configurer l'environnement**

```bash
cd backend
cp .env.example .env
```

Dans `.env`, adapter au minimum `DATABASE_URL` et `JWT_SECRET` :

```
DATABASE_URL="postgresql://souverainrecrut:motdepasse@localhost:5432/souverainrecrut"
JWT_SECRET="une-valeur-longue-et-aleatoire"
```

**3. Installer, migrer, lancer**

```bash
npm ci
npx prisma generate
npx prisma migrate dev
npm run dev
```

L'API répond sur http://localhost:4000 :

- http://localhost:4000/v1/health : état de l'API
- http://localhost:4000/v1/ready : état de l'API et de la base
- http://localhost:4000/api-docs : documentation Swagger

Le fichier `.env` n'est jamais versionné.

---

## Lancer les tests

```bash
cd backend
npm test
```

Les tests utilisent Jest et supertest, avec Prisma simulé : aucune base n'est nécessaire. Le rapport de couverture est écrit dans `backend/coverage/` (le fichier `lcov.info` est lu par SonarQube).

---

## Mettre en place l'intégration continue (Jenkins)

Jenkins, SonarQube, le Quality Gate, le scan Trivy et la publication sur Docker Hub sont décrits pas à pas dans [integration-continue/README.md](integration-continue/README.md).

En résumé :

```bash
docker compose -f integration-continue/docker-compose.yml up -d --build
```

Jenkins est ensuite disponible sur http://localhost:8080. Il faut créer deux credentials (`sonar-token` et `dockerhub-credentials`), déclarer le serveur SonarQube et le webhook, puis créer le job sur la branche `Dev` avec `integration-continue/Jenkinsfile`.

Chaque build réussi publie l'image `jackylp/souverainrecrut-backend:<numéro de build>` pour linux/amd64.

---

## Préparer le serveur (Terraform et Ansible)

Ces deux étapes se lancent depuis le poste de travail, une seule fois.

**Terraform** : crée le réseau et le volume Docker, et génère l'inventaire Ansible.

```bash
cd deploiement/terraform
```

Créer un fichier `terraform.tfvars` (exclu du dépôt) avec ses valeurs :

```
server_host          = "ADRESSE_DU_SERVEUR"
ssh_user             = "serveur"
ssh_port             = 22
ssh_private_key_path = "~/.ssh/CLE_PRIVEE"
app_name             = "souverainrecrut"
```

Puis :

```bash
terraform init
terraform validate
terraform plan
terraform apply
```

**Ansible** : prépare le serveur (mise à jour, Docker et Compose, service Docker, dossier `~/deployment`).

```bash
cd ../ansible
ansible-playbook -i inventory.ini playbook.yml --ask-become-pass
```

---

## Déployer (GitLab CI/CD)

Le pipeline est dans `deploiement/.gitlab-ci.yml`. Il ne tourne que sur la branche `main`.

**1. Dans le projet GitLab**, régler *Settings > CI/CD > General pipelines > CI/CD configuration file* sur `deploiement/.gitlab-ci.yml`.

**2. Créer les variables CI/CD** (*Settings > CI/CD > Variables*) :

| Variable | Contenu |
|---|---|
| `SERVER_TS_IP` | adresse du serveur |
| `SERVER_USER` | utilisateur SSH |
| `SSH_PRIVATE_KEY_B64` | clé privée de déploiement encodée en base64, sur une ligne (`base64 < cle \| tr -d '\n'`) |
| `TS_AUTHKEY` | clé d'authentification Tailscale (éphémère et réutilisable) |
| `DOCKERHUB_USER` | compte Docker Hub |
| `DOCKERHUB_TOKEN` | token Docker Hub en lecture seule |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | accès à PostgreSQL |
| `JWT_SECRET` | secret de signature des jetons de l'API |

Les secrets sont en `Masked`. `POSTGRES_PASSWORD` ne doit pas contenir de caractère spécial, car il sert dans `DATABASE_URL`.

**3. Lancer le pipeline** sur `main`, avec la variable `IMAGE_TAG` réglée sur le numéro de build à déployer (le tag `latest` est refusé). Les jobs :

- `validate_tag` : contrôle que le tag existe sur Docker Hub ;
- `deploy` : approbation manuelle, puis copie des fichiers, `.env`, téléchargement de l'image, migrations Prisma et démarrage ;
- `verify` : attend que `/v1/health` réponde.

Le fichier `.env` du serveur est créé par le pipeline à partir des variables GitLab. Le modèle est [deploiement/deployment/.env.example](deploiement/deployment/.env.example).

**Vérifier** : `http://ADRESSE_DU_SERVEUR:4000/v1/health` doit répondre `UP`.

---

## Rollback

Pour revenir à une version précédente, relancer le pipeline avec l'ancien tag dans `IMAGE_TAG`. La procédure est dans [documentation/procedure-rollback.md](documentation/procedure-rollback.md).

---

## Documentation

- [Rapport final](documentation/rapport-final.md) : travail réalisé, résultats, captures
- [Architecture de la chaîne CI/CD](documentation/architecture.md)
- [Procédure de rollback](documentation/procedure-rollback.md)
- [Intégration continue](integration-continue/README.md)

---

## Secrets

Aucun secret n'est dans le dépôt. Les tokens Jenkins sont des credentials Jenkins, les secrets de déploiement sont des variables GitLab, et `terraform.tfvars`, `terraform.tfstate` et les fichiers `.env` sont exclus par le `.gitignore`.
