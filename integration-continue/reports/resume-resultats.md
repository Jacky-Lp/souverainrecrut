# Résultats de la CI (build Jenkins n°8, branche Dev, commit 77a55ed)

Configuration Jenkins ↔ SonarQube : `captures/09-jenkins-config-sonarqube.png` ; erreur à la création du webhook : `captures/10-sonarqube-webhook-erreur.png`. Captures Jenkins : `captures/02-jenkins-job.png` (dernier succès n°8, dernier échec n°6, durée 4 min 39 s) et `captures/03-jenkins-stage-view-build8.png` (toutes les étapes vertes).

## Tests et couverture

Exécution : `npm test` (Jest + ts-jest + supertest), 3 suites, **69 tests réussis sur 69**.

| Mesure (Jest) | Valeur |
|---|---|
| Instructions | 99,11 % (448/452) |
| Branches | 76,92 % (50/65) |
| Fonctions | 97,61 % (82/84) |
| Lignes | 99,09 % (440/444) |

Les tests couvrent l'authentification, la gestion des utilisateurs, des candidats, des offres et des candidatures, le tableau de bord, la santé de l'API et le contrôle d'accès (401, 403), avec les cas de validation (400), de ressource absente (404) et de doublon (409). Prisma est simulé : les tests ne nécessitent pas de base de données.

Sortie de `npm test` : `captures/08-npm-test.png`. Détail par dossier : `captures/07-couverture-par-dossier.png`.

Rapport exploitable : `backend/coverage/lcov.info`, archivé comme artefact du build et lu par SonarQube.

## SonarQube

Quality Gate : **OK** (conditions sur le nouveau code : couverture ≥ 80 %, duplication ≤ 3 %, aucune nouvelle issue).

| Métrique | Valeur |
|---|---|
| Couverture (calcul SonarQube) | 92,6 % (lignes 94,8 %, branches 76,9 %) |
| Duplication | 0,0 % |
| Sécurité | 2 issues (note B) |
| Fiabilité | 2 issues (note C) |
| Maintenabilité | 2 issues (note A) |
| Security hotspots | 0 |
| Lignes de code | 1 972 |

Export des résultats (métriques, conditions du Quality Gate, issues) : `sonarqube-resultats.json`. Capture : `captures/01-resultat-final-sonarqube.png` (état initial : `captures/00-etat-des-lieux-sonarqube.png`).

Issues restantes, non corrigées :
- **Sécurité (2) :** image Docker exécutée avec l'utilisateur `root` (`docker:S6471`) et en-tête `X-Powered-By` d'Express (`typescript:S5689`).
- **Fiabilité et maintenabilité (2) :** `parseInt` à remplacer par `Number.parseInt` dans `backend/src/utils/pagination.ts` (`typescript:S7773`). Ces deux mêmes issues comptent dans les deux domaines.

## Trivy (image `souverainrecrut-backend:8`)

| Passage | Résultat |
|---|---|
| Premier build avec Trivy (n°6) | **Échec voulu** : 2 vulnérabilités CRITICAL corrigeables, publication bloquée |
| Build n°8 | **0 CRITICAL**, 23 HIGH corrigeables signalées dans le rapport (non bloquantes) |

Les deux CVE critiques et leur correction :

| Paquet | Version | Correctif | Action |
|---|---|---|---|
| `proxy-addr` (dépendance d'Express) | 2.0.7 | 2.0.8 | Mise à jour dans `package-lock.json` |
| `tar` (embarqué dans `npm` de l'image `node:20-alpine`) | 6.2.1 | 7.5.19 | `npm` retiré de l'image finale, inutile à l'exécution |

Captures de l'échec du build n°6 : `captures/04-jenkins-build6-trivy-echec.png` (Trivy Scan en rouge, Publish sauté) et `captures/05-trivy-cve-critical.png` (console avec les 2 CVE).

Rapport détaillé : `trivy-report.json` (dans ce dossier).

## Publication

Image publiée sur Docker Hub : `jackylp/souverainrecrut-backend`, tags `8` et `latest` (digest `sha256:0ad9820992752720ee2007e27efe0219a27822851fc08cc01530c3cc26f01c32`).

## Journaux de console Jenkins

Copies des journaux des builds, secrets masqués par Jenkins (`******`) :

| Fichier | Contenu |
|---|---|
| `logs/console-build-6.log` | Build en **échec voulu** : Trivy trouve 2 CRITICAL, l'étape Publish est sautée |
| `logs/console-build-8.log` | Build **réussi** : tests, Quality Gate, scan Trivy sans CRITICAL, `Login Succeeded`, push des tags `8` et `latest` |

Capture Docker Hub : `captures/06-dockerhub-image.png`.
