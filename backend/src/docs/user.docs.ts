import { buildCrudDocs, objectSchema } from "./common";

export const userDocs = buildCrudDocs({
  tag: "Users",
  path: "/users",
  labels: {
    "list": "Lister les utilisateurs",
    "listDescription": "Retourne la liste paginée des utilisateurs.",
    "listOk": "Liste des utilisateurs.",
    "create": "Créer un utilisateur",
    "created": "Utilisateur créé.",
    "get": "Obtenir un utilisateur",
    "found": "Utilisateur trouvé.",
    "update": "Modifier un utilisateur",
    "updated": "Utilisateur mis à jour.",
    "remove": "Supprimer un utilisateur",
    "removed": "Utilisateur supprimé.",
    "notFound": "Utilisateur introuvable.",
    "conflict": "Email déjà utilisé."
  },
  listItems: [
    {
      id: "cmr0rce840000yws4oao08la7",
      firstName: "Alice",
      lastName: "Diallo",
      email: "alice@souverainrecrut.com",
      role: "RECRUITER"
    }
  ],
  createSchema: objectSchema({
    firstName: "Alice",
    lastName: "Diallo",
    email: "alice@souverainrecrut.com",
    password: "password123",
    role: {
      example: "RECRUITER",
      enum: [
        "ADMIN",
        "RECRUITER"
      ]
    }
  }),
});
