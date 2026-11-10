# Procédure de rollback

## Principe

Le rollback consiste à redéployer une version précédente de l'image du backend. Chaque image est publiée sur Docker Hub avec le numéro du build Jenkins (`11`, `12`, ...). Revenir en arrière, c'est donc redéployer l'ancien numéro.

Je n'ai pas automatisé le rollback dans la pipeline. Il se fait avec la pipeline de déploiement existante, en changeant le tag. Je ne l'ai pas testé : cette procédure est documentée, pas rejouée.

## Choisir la version précédente

Les tags sont visibles sur Docker Hub, dans le dépôt `jackylp/souverainrecrut-backend`. La version actuellement déployée est dans le fichier `.env` du serveur (`IMAGE_TAG`).

Un point à vérifier avant de choisir : l'architecture de l'image. Le serveur est en amd64. Les builds `8` et `9` ont été construits sur mon Mac en arm64 : ils ne démarrent pas sur le serveur. Le premier tag utilisable est le `11`. Une version précédente utilisable n'existera qu'après le build suivant (le `12`), qui permettra de revenir au `11`.

## Procédure avec GitLab

1. Dans GitLab, aller dans *Build > Pipelines*, puis *New pipeline*.
2. Choisir la branche `main`.
3. Dans la variable `IMAGE_TAG`, mettre l'ancien tag (par exemple `11`).
4. Lancer le pipeline. Le job `validate_tag` vérifie que ce tag existe sur Docker Hub.
5. Cliquer sur le bouton de lecture du job `deploy` (approbation manuelle).
6. Le job `verify` contrôle ensuite les conteneurs et l'API.

Le tag `latest` est refusé : il ne permet pas de savoir quelle version tourne.

## Procédure manuelle sur le serveur

En cas de problème avec GitLab, je peux faire le retour à la main, en SSH :

```bash
cd ~/deployment
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=11/' .env
docker compose pull backend
docker compose up -d backend
docker compose ps
```

## Vérifier le retour

```bash
curl http://localhost:4000/v1/health
curl http://localhost:4000/v1/ready
docker compose ps
```

`/v1/health` doit répondre `UP`. `/v1/ready` doit répondre `READY` avec `database: CONNECTED`. Les deux conteneurs doivent être `healthy`.

## Base de données

Le rollback change l'image du backend. Il ne change pas la base. Le volume PostgreSQL (`souverainrecrut-postgres-data`) n'est pas touché, les données restent.

Le risque vient des migrations Prisma. La pipeline applique `prisma migrate deploy`, qui ne fait qu'avancer : il n'annule jamais une migration. Si une nouvelle version a modifié le schéma, l'ancienne image doit pouvoir fonctionner avec ce schéma.

Pour limiter le risque :
- écrire des migrations qui ajoutent (nouvelle table, nouvelle colonne optionnelle) plutôt que supprimer ou renommer ;
- faire une sauvegarde avant un déploiement qui modifie le schéma.

Sauvegarde et restauration :

```bash
cd ~/deployment
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > sauvegarde.sql
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' < sauvegarde.sql
```

Aujourd'hui, il n'y a qu'une migration (`init`, qui crée les tables). Le rollback ne pose donc pas de problème de schéma pour l'instant.

## Après un rollback : remettre la correction en production

Un rollback remet un service sain, mais il ne règle pas la cause. Une fois le problème trouvé et corrigé, je ne redéploie pas la nouvelle version d'un coup, sinon le même incident peut se reproduire pour tous les utilisateurs. Le cours (Jour 2, partie Release) présente trois techniques pour limiter ce risque. Je ne les ai pas mises en place : elles sont décrites ici comme la suite possible.

Aujourd'hui, le déploiement est direct : un seul conteneur `backend` sur le serveur, sans routeur devant. Le tag est remplacé pour tout le monde en même temps.

### Blue-Green

Deux environnements existent côte à côte. Le « blue » fait tourner la version actuelle et reçoit tout le trafic. Le « green » fait tourner la nouvelle version, prête et testée, sans trafic. Quand le green est validé, on bascule le routeur dessus. Le retour arrière est instantané : on rebascule sur le blue, qui est resté intact.

Pour mon projet, il faudrait deux services `backend` dans le compose (un par tag) et un reverse proxy devant, par exemple Nginx, qui envoie le trafic vers l'un ou l'autre. Les deux versions partagent la même base PostgreSQL : les migrations doivent donc être compatibles avec l'ancienne et la nouvelle version, comme dans la section précédente.

### Canary

La nouvelle version reçoit d'abord une petite part du trafic, par exemple 10 %, pendant que l'ancienne garde les 90 % restants. Tant que les métriques restent saines (état de santé, latence, taux d'erreur), on augmente la part de la nouvelle version, jusqu'à 100 %. Si elles se dégradent, on revient à 0 % : c'est un rollback limité à une petite partie des utilisateurs.

Pour mon projet, c'est le même montage que le Blue-Green, avec des poids différents sur le proxy (par exemple 9 pour l'ancienne version et 1 pour la nouvelle). Il faudrait en plus mesurer la latence et les erreurs pour décider d'augmenter la part. Aujourd'hui, je n'ai que `/v1/health` et `/v1/ready`.

### Feature flags

Le code est déployé, mais la fonctionnalité reste désactivée. On l'active progressivement, et on la coupe sans redéployer. Le rollback devient alors un simple changement de réglage, sans nouvelle image.

Pour mon projet, il faudrait que le backend lise un indicateur (par exemple une variable d'environnement ou une table) avant d'exécuter la nouvelle fonctionnalité. Cela se combine bien avec les migrations : j'ajoute d'abord les tables ou colonnes sans les utiliser, puis j'active la fonctionnalité plus tard.

### Comparaison

| Technique | Retour arrière | Ce qu'il faut en plus |
|---|---|---|
| Blue-Green | instantané, en rebasculant le routeur | un second `backend` et un reverse proxy, une base compatible avec les deux versions |
| Canary | on ramène la part de la nouvelle version à 0 % | un reverse proxy avec des poids, et des métriques (latence, erreurs) |
| Feature flags | on coupe la fonctionnalité, sans redéployer | du code dans le backend pour lire l'indicateur |

## Pour aller plus loin : rollback automatique

Le cours montre aussi un rollback déclenché par le pipeline : après le déploiement, un test de santé vérifie l'API, et s'il échoue, le pipeline redéploie le tag précédent. Il recommande de conserver le tag de la version précédente, de tester la procédure dans un environnement de recette, de documenter le retour arrière et de prévenir l'équipe.

Mon job `verify` fait déjà le test de santé : il attend `/v1/health` et affiche les logs en cas d'échec. Il ne redéploie pas l'ancienne version. Pour l'automatiser, il faudrait mémoriser le tag actuel avant le déploiement, puis relancer `deploy` avec ce tag si `verify` échoue. Je ne l'ai pas fait : le rollback reste une action manuelle, avec l'approbation d'un humain.
