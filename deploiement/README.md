# Déploiement

Provisionnement et déploiement du backend SouverainRecrut sur un serveur Ubuntu : Terraform, Ansible, GitLab CI/CD et Docker Compose avec PostgreSQL.

L'image du backend n'est pas construite ici : elle est publiée sur Docker Hub par Jenkins (voir `../integration-continue/`). Le déploiement la télécharge.

| Dossier ou fichier | Rôle |
|---|---|
| `terraform/` | Crée le réseau et le volume Docker du serveur, génère l'inventaire Ansible |
| `ansible/` | Inventaire et playbook de préparation du serveur (Docker, Compose, dossier de déploiement) |
| `deployment/docker-compose.yml` | Services `postgres`, `backend` et `migrate` (migrations Prisma, lancé à la demande) |
| `deployment/.env.example` | Modèle des variables attendues par le compose |
| `.gitlab-ci.yml` | Pipeline : `validate_tag`, `deploy` (manuel), `verify` |
| `captures/` | Captures d'écran du déploiement, utilisées dans le rapport |

## En bref

**1. Préparer le serveur (une seule fois, depuis le poste de travail)**

```bash
cd terraform
# créer terraform.tfvars : server_host, ssh_user, ssh_port, ssh_private_key_path, app_name
terraform init && terraform validate && terraform plan && terraform apply

cd ../ansible
ansible-playbook -i inventory.ini playbook.yml --ask-become-pass
```

**2. Configurer GitLab (une seule fois)**

- fichier de pipeline : `deploiement/.gitlab-ci.yml` ;
- variables CI/CD : `SERVER_TS_IP`, `SERVER_USER`, `SSH_PRIVATE_KEY_B64`, `TS_AUTHKEY`, `DOCKERHUB_USER`, `DOCKERHUB_TOKEN`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `JWT_SECRET`.

**3. Déployer (à chaque version)**

*Build > Pipelines > New pipeline* sur `main`, avec `IMAGE_TAG` réglé sur le numéro de build Jenkins, puis lecture manuelle du job `deploy`.

**4. Vérifier**

```bash
curl http://ADRESSE_DU_SERVEUR:4000/v1/health
curl http://ADRESSE_DU_SERVEUR:4000/v1/ready
```

## Secrets

Aucun secret n'est dans ce dossier. `terraform/terraform.tfvars`, `terraform/terraform.tfstate` et tout fichier `.env` réel sont exclus du dépôt. Le `.env` du serveur est créé par le pipeline à partir des variables GitLab.

## Pour aller plus loin

- [Procédure de déploiement](../documentation/procedure-deploiement.md) : pas à pas détaillé et tableau de dépannage
- [Procédure de rollback](../documentation/procedure-rollback.md)
- [Architecture](../documentation/architecture.md)
- [Rapport final](../documentation/rapport-final.md)
