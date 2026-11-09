import { buildCrudDocs, objectSchema } from "./common";

export const jobDocs = buildCrudDocs({
  tag: "Jobs",
  path: "/jobs",
  labels: {
    "list": "Lister les offres d'emploi",
    "listDescription": "Retourne la liste paginée des offres d'emploi.",
    "listOk": "Liste des offres.",
    "create": "Créer une offre d'emploi",
    "created": "Offre créée.",
    "get": "Obtenir une offre d'emploi",
    "found": "Offre trouvée.",
    "update": "Modifier une offre d'emploi",
    "updated": "Offre mise à jour.",
    "remove": "Supprimer une offre d'emploi",
    "removed": "Offre supprimée.",
    "notFound": "Offre introuvable."
  },
  listItems: [
    {
      id: "cmr0rce8a0003yws4haulp35i",
      title: "Développeur Full Stack",
      description: "Node.js / React",
      location: "Conakry",
      company: "SouverainTech",
      recruiterId: "cmr0rce840000yws4oao08la7"
    }
  ],
  createSchema: objectSchema({
    title: "Développeur Backend",
    description: "Développement d'API REST avec Node.js et Prisma.",
    location: "Conakry",
    company: "SouverainTech",
    recruiterId: "cmr0rce840000yws4oao08la7"
  }),
});
