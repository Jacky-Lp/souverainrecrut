import { buildCrudDocs, objectSchema } from "./common";

export const applicationDocs = buildCrudDocs({
  tag: "Applications",
  path: "/applications",
  labels: {
    "list": "Lister les candidatures",
    "listDescription": "Retourne la liste paginée des candidatures.",
    "listOk": "Liste des candidatures.",
    "create": "Créer une candidature",
    "created": "Candidature créée.",
    "get": "Obtenir une candidature",
    "found": "Candidature trouvée.",
    "update": "Modifier une candidature",
    "updated": "Candidature mise à jour.",
    "remove": "Supprimer une candidature",
    "removed": "Candidature supprimée.",
    "notFound": "Candidature introuvable."
  },
  listItems: [
    {
      id: "cmr0rce8c0005yws40qkwhdwa",
      candidateId: "cmr0rce880001yws4aobnd3rl",
      jobId: "cmr0rce8a0003yws4haulp35i",
      status: "PENDING",
      candidate: {
        id: "cmr0rce880001yws4aobnd3rl",
        fullName: "Mamadou Bah",
        email: "mamadou@example.com"
      },
      job: {
        id: "cmr0rce8a0003yws4haulp35i",
        title: "Développeur Full Stack",
        company: "SouverainTech"
      }
    }
  ],
  createSchema: objectSchema({
    candidateId: "cmr0rce880001yws4aobnd3rl",
    jobId: "cmr0rce8a0003yws4haulp35i",
    status: {
      example: "PENDING",
      enum: [
        "PENDING",
        "REVIEW",
        "ACCEPTED",
        "REJECTED"
      ]
    }
  }, ["candidateId", "jobId"]),
  updateSchema: objectSchema({
    status: {
      example: "REVIEW",
      enum: [
        "PENDING",
        "REVIEW",
        "ACCEPTED",
        "REJECTED"
      ]
    }
  }, []),
});
