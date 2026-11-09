import request from "supertest";

import app from "../src/app";
import { prisma } from "../src/config/prisma";
import { admin, recruiter } from "./helpers";

jest.mock("../src/config/prisma", () => require("./prisma.mock"));

const db = prisma as any;

type Resource = {
  path: string;
  model: string;
  body: Record<string, unknown>;
  patch: Record<string, unknown>;
  /** Token autorisé en lecture/écriture (hors suppression). */
  writer: string;
  /** Token autorisé à supprimer. */
  remover: string;
  /** Token d'un rôle non autorisé, s'il existe. */
  forbidden?: string;
};

const resources: Resource[] = [
  {
    path: "/v1/users",
    model: "user",
    body: { firstName: "Alice", lastName: "Diallo", email: "a@b.co", password: "password123" },
    patch: { firstName: "Alicia" },
    writer: admin,
    remover: admin,
    forbidden: recruiter,
  },
  {
    path: "/v1/candidates",
    model: "candidate",
    body: { fullName: "Jean Dupont", email: "jean@b.co" },
    patch: { fullName: "Jean Martin" },
    writer: recruiter,
    remover: admin,
  },
  {
    path: "/v1/jobs",
    model: "job",
    body: {
      title: "Dev Node",
      description: "Développement d'API REST.",
      location: "Conakry",
      company: "SouverainTech",
      recruiterId: "r1",
    },
    patch: { title: "Dev Senior" },
    writer: recruiter,
    remover: admin,
  },
  {
    path: "/v1/applications",
    model: "application",
    body: { candidateId: "c1", jobId: "j1" },
    patch: { status: "REVIEWED" },
    writer: recruiter,
    remover: admin,
  },
];

beforeEach(() => {
  jest.resetAllMocks();
});

describe.each(resources)("API $path", (r) => {
  const model = () => db[r.model];

  it("refuse une requête sans token (401)", async () => {
    // Arrange : aucun en-tête Authorization

    // Act
    const res = await request(app).get(r.path);

    // Assert
    expect(res.status).toBe(401);
  });

  if (r.forbidden) {
    it("refuse un rôle non autorisé (403)", async () => {
      // Arrange
      const token = r.forbidden!;

      // Act
      const res = await request(app).get(r.path).set("Authorization", token);

      // Assert
      expect(res.status).toBe(403);
    });
  }

  it("GET retourne la liste paginée", async () => {
    // Arrange
    model().findMany.mockResolvedValue([{ id: "1" }]);
    model().count.mockResolvedValue(1);

    // Act
    const res = await request(app)
      .get(`${r.path}?page=1&limit=5`)
      .set("Authorization", r.writer);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: "1" }]);
    expect(res.body.pagination).toEqual({ page: 1, limit: 5, total: 1, totalPages: 1 });
  });

  it("GET /:id retourne la ressource", async () => {
    // Arrange
    model().findUnique.mockResolvedValue({ id: "1" });

    // Act
    const res = await request(app).get(`${r.path}/1`).set("Authorization", r.writer);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: "1" });
  });

  it("GET /:id retourne 404 si la ressource n'existe pas", async () => {
    // Arrange
    model().findUnique.mockResolvedValue(null);

    // Act
    const res = await request(app).get(`${r.path}/x`).set("Authorization", r.writer);

    // Assert
    expect(res.status).toBe(404);
  });

  it("POST crée la ressource (201)", async () => {
    // Arrange
    model().findUnique.mockResolvedValue(null);
    model().create.mockResolvedValue({ id: "new" });

    // Act
    const res = await request(app)
      .post(r.path)
      .set("Authorization", r.writer)
      .send(r.body);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ id: "new" });
  });

  it("POST retourne 400 si le corps est invalide", async () => {
    // Arrange
    const invalidBody = {};

    // Act
    const res = await request(app)
      .post(r.path)
      .set("Authorization", r.writer)
      .send(invalidBody);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it("PUT met à jour la ressource", async () => {
    // Arrange
    model().findUnique.mockResolvedValue({ id: "1" });
    model().update.mockResolvedValue({ id: "1", ...r.patch });

    // Act
    const res = await request(app)
      .put(`${r.path}/1`)
      .set("Authorization", r.writer)
      .send(r.patch);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: "1", ...r.patch });
  });

  it("PUT retourne 404 si la ressource n'existe pas", async () => {
    // Arrange
    model().findUnique.mockResolvedValue(null);

    // Act
    const res = await request(app)
      .put(`${r.path}/x`)
      .set("Authorization", r.writer)
      .send(r.patch);

    // Assert
    expect(res.status).toBe(404);
    expect(model().update).not.toHaveBeenCalled();
  });

  it("DELETE supprime la ressource", async () => {
    // Arrange
    model().findUnique.mockResolvedValue({ id: "1" });
    model().delete.mockResolvedValue({ id: "1" });

    // Act
    const res = await request(app).delete(`${r.path}/1`).set("Authorization", r.remover);

    // Assert
    expect(res.status).toBe(200);
    expect(model().delete).toHaveBeenCalledWith({ where: { id: "1" } });
  });

  it("DELETE retourne 404 si la ressource n'existe pas", async () => {
    // Arrange
    model().findUnique.mockResolvedValue(null);

    // Act
    const res = await request(app).delete(`${r.path}/x`).set("Authorization", r.remover);

    // Assert
    expect(res.status).toBe(404);
    expect(model().delete).not.toHaveBeenCalled();
  });
});

describe("Règles d'unicité et de rôles", () => {
  it("POST /users refuse un email déjà utilisé (409)", async () => {
    // Arrange
    db.user.findUnique.mockResolvedValue({ id: "1" });

    // Act
    const res = await request(app)
      .post("/v1/users")
      .set("Authorization", admin)
      .send(resources[0].body);

    // Assert
    expect(res.status).toBe(409);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("POST /users hache le mot de passe", async () => {
    // Arrange
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({ id: "1" });

    // Act
    const res = await request(app)
      .post("/v1/users")
      .set("Authorization", admin)
      .send(resources[0].body);

    // Assert
    expect(res.status).toBe(201);
    const { data } = db.user.create.mock.calls[0][0];
    expect(data.password).not.toBe("password123");
  });

  it("POST /candidates refuse un email déjà utilisé (409)", async () => {
    // Arrange
    db.candidate.findUnique.mockResolvedValue({ id: "1" });

    // Act
    const res = await request(app)
      .post("/v1/candidates")
      .set("Authorization", admin)
      .send(resources[1].body);

    // Assert
    expect(res.status).toBe(409);
    expect(db.candidate.create).not.toHaveBeenCalled();
  });

  it("DELETE /jobs/:id est refusé à un recruteur (403)", async () => {
    // Arrange
    const token = recruiter;

    // Act
    const res = await request(app).delete("/v1/jobs/1").set("Authorization", token);

    // Assert
    expect(res.status).toBe(403);
    expect(db.job.delete).not.toHaveBeenCalled();
  });
});
