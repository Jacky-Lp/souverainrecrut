import { buildCrudDocs, objectSchema } from "./common";

export const candidateDocs = buildCrudDocs({
  tag: "Candidates",
  path: "/candidates",
  labels: {
    "list": "Lister les candidats",
    "listDescription": "Retourne la liste paginée des candidats.",
    "listOk": "Liste des candidats.",
    "create": "Créer un candidat",
    "created": "Candidat créé.",
    "get": "Obtenir un candidat",
    "found": "Candidat trouvé.",
    "update": "Modifier un candidat",
    "updated": "Candidat mis à jour.",
    "remove": "Supprimer un candidat",
    "removed": "Candidat supprimé.",
    "notFound": "Candidat introuvable.",
    "conflict": "Email déjà utilisé."
  },
  listItems: [
    {
      id: "cmr0rce880001yws4aobnd3rl",
      fullName: "Mamadou Bah",
      email: "mamadou@example.com",
      phone: "+224620000001"
    }
  ],
  createSchema: objectSchema({
    fullName: "Jean Dupont",
    email: "jean@example.com",
    phone: "+33123456789"
  }),
});
