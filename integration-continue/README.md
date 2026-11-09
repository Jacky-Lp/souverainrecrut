# Intégration continue (Jenkins)

Chaîne CI du backend SouverainRecrut : tests, analyse SonarQube, contrôle du Quality Gate, construction de l'image Docker, scan Trivy et publication sur Docker Hub.

| Fichier | Rôle |
|---|---|
| `Jenkinsfile` | Pipeline (Build, Test, Quality, Quality Gate, Docker Build, Trivy Scan, Publish) |
| `Dockerfile` | Image Jenkins : LTS JDK 21 + CLI Docker + plugins de `plugins.txt` |
| `plugins.txt` | Plugins installés à la construction de l'image Jenkins |
| `docker-compose.yml` | Lance Jenkins sur http://localhost:8080 |
| `sonar/sonar-project.properties` | Configuration de l'analyse SonarQube |
| `reports/` | Résultats de la CI (voir `reports/resume-resultats.md`) |

## Prérequis

- Docker (Docker Desktop) ;
- un SonarQube accessible sur http://localhost:9000 ;
- un compte GitHub (dépôt) et un compte Docker Hub (publication).

## 1. Démarrer Jenkins

```bash
docker compose -f integration-continue/docker-compose.yml up -d --build
docker exec souverainrecrut-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Ouvrir http://localhost:8080, saisir le mot de passe initial, créer le compte administrateur. Les plugins nécessaires (Git, GitHub, Pipeline, Docker Pipeline, SonarQube Scanner, Credentials Binding) sont déjà installés par l'image.

## 2. Configurer Jenkins (une seule fois)

**Credentials** (Manage Jenkins → Credentials → Global). Le *scope* doit être **Global** : un credential en scope *System* n'est pas visible des pipelines.

| ID | Type | Contenu |
|---|---|---|
| `sonar-token` | Secret text | Token SonarQube (My Account → Security) |
| `dockerhub-credentials` | Username with password | Identifiant Docker Hub + *access token* (droits Read & Write) |

**Serveur SonarQube** (Manage Jenkins → System → SonarQube servers) :
nom `SonarQube`, URL `http://host.docker.internal:9000` (et non `localhost`, qui désignerait le conteneur Jenkins), token `sonar-token`.

**Webhook SonarQube** (Administration → Configuration → Webhooks) :
nom `Jenkins`, URL `http://host.docker.internal:8080/sonarqube-webhook/`.
SonarQube refuse par défaut les adresses privées : dans cet environnement local, il est démarré avec `SONAR_VALIDATEWEBHOOKS=false`.

**Job** : type *Pipeline*, *Pipeline script from SCM*, Git, dépôt `https://github.com/Jacky-Lp/souverainrecrut.git`, branche `*/Dev`, Script Path `integration-continue/Jenkinsfile`. Aucun credential Git n'est nécessaire (dépôt public).

## 3. Lancer la pipeline

Cliquer sur **Build Now**. Le job n'a pas de déclencheur automatique : Jenkins étant sur `localhost`, un webhook GitHub ne peut pas l'atteindre. Un déclenchement par *Poll SCM* est possible (Build Triggers).

## Reproduire en local sans Jenkins

```bash
cd backend
npm ci && npx prisma generate
npm test            # tests + couverture (backend/coverage/lcov.info)
cd ..
docker run --rm -e SONAR_HOST_URL=http://host.docker.internal:9000 -e SONAR_TOKEN \
  -v "$(pwd):/usr/src" -w /usr/src sonarsource/sonar-scanner-cli \
  sonar-scanner -Dproject.settings=integration-continue/sonar/sonar-project.properties
```

(`export SONAR_TOKEN=...` au préalable, pour ne pas écrire le token dans la commande.)

## Secrets

Aucun secret n'est versionné. Les tokens SonarQube et Docker Hub sont des credentials Jenkins, lus à l'exécution. Pour la publication, la session `docker login` est écrite dans un dossier temporaire supprimé à la fin de l'étape.
