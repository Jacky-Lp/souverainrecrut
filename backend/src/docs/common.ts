/**
 * Blocs Swagger partagés entre les fichiers de documentation.
 */
export const bearer = [{ bearerAuth: [] }];

export const idParam = {
  in: "path",
  name: "id",
  required: true,
  schema: { type: "string" },
};

export const pageParams = [
  {
    in: "query",
    name: "page",
    schema: { type: "integer", default: 1 },
  },
  {
    in: "query",
    name: "limit",
    schema: { type: "integer", default: 10 },
  },
];

export const paginationExample = {
  page: 1,
  limit: 10,
  total: 1,
  totalPages: 1,
};

export const unauthorized = {
  description: "Authentification requise.",
};

export interface CrudDocsConfig {
  tag: string;
  path: string;
  labels: {
    list: string;
    listDescription: string;
    listOk: string;
    create: string;
    created: string;
    conflict?: string;
    get: string;
    found: string;
    update: string;
    updated: string;
    remove: string;
    removed: string;
    notFound: string;
  };
  listItems: unknown[];
  createSchema: Record<string, any>;
  updateSchema?: Record<string, any>;
}

type Field = string | { example: string; enum: string[] };

/**
 * Construit un schéma d'objet à partir d'exemples par champ.
 * Tous les champs sont obligatoires, sauf indication contraire.
 */
export const objectSchema = (
  fields: Record<string, Field>,
  required: string[] = Object.keys(fields)
) => ({
  type: "object",
  properties: Object.fromEntries(
    Object.entries(fields).map(([name, field]) => [
      name,
      typeof field === "string"
        ? { type: "string", example: field }
        : { type: "string", ...field },
    ])
  ),
  ...(required.length > 0 && { required }),
});

const jsonBody = (schema: unknown) => ({
  required: true,
  content: { "application/json": { schema } },
});

/**
 * Schéma de mise à jour par défaut : mêmes propriétés que la création,
 * sans exemples ni champs obligatoires.
 */
const toUpdateSchema = (schema: Record<string, any>) => ({
  type: schema.type,
  properties: Object.fromEntries(
    Object.entries(schema.properties).map(([name, prop]) => {
      const { example: _example, ...rest } = prop as Record<string, any>;
      return [name, rest];
    })
  ),
});

/**
 * Construit la documentation Swagger CRUD d'une ressource.
 */
export const buildCrudDocs = ({
  tag,
  path,
  labels,
  listItems,
  createSchema,
  updateSchema = toUpdateSchema(createSchema),
}: CrudDocsConfig) => {
  const base = { tags: [tag], security: bearer };
  const withId = { ...base, parameters: [idParam] };
  const notFound = { description: labels.notFound };

  return {
    paths: {
      [path]: {
        get: {
          ...base,
          summary: labels.list,
          description: labels.listDescription,
          parameters: pageParams,
          responses: {
            200: {
              description: labels.listOk,
              content: {
                "application/json": {
                  example: {
                    success: true,
                    data: listItems,
                    pagination: paginationExample,
                  },
                },
              },
            },
            401: unauthorized,
          },
        },
        post: {
          ...base,
          summary: labels.create,
          requestBody: jsonBody(createSchema),
          responses: {
            201: { description: labels.created },
            400: { description: "Erreur de validation." },
            ...(labels.conflict && {
              409: { description: labels.conflict },
            }),
          },
        },
      },
      [`${path}/{id}`]: {
        get: {
          ...withId,
          summary: labels.get,
          responses: {
            200: { description: labels.found },
            404: notFound,
          },
        },
        put: {
          ...withId,
          summary: labels.update,
          requestBody: jsonBody(updateSchema),
          responses: {
            200: { description: labels.updated },
            404: notFound,
          },
        },
        delete: {
          ...withId,
          summary: labels.remove,
          responses: {
            200: { description: labels.removed },
            404: notFound,
          },
        },
      },
    },
  };
};
