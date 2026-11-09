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
  /** Rôle autorisé en lecture/écriture (hors suppression). */
  writer: string;
  /** Rôle autorisé à supprimer. */
  remover: string;
  /** Token pour un rôle non autorisé, s'il existe. */
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
  const m = () => db[r.model];

  it("refuse sans token (401)", async () => {
    await request(app).get(r.path).expect(401);
  });

  if (r.forbidden) {
    it("refuse un rôle non autorisé (403)", async () => {
      await request(app).get(r.path).set("Authorization", r.forbidden!).expect(403);
    });
  }

  it("GET liste paginée", async () => {
    m().findMany.mockResolvedValue([{ id: "1" }]);
    m().count.mockResolvedValue(1);

    const res = await request(app)
      .get(`${r.path}?page=1&limit=5`)
      .set("Authorization", r.writer)
      .expect(200);

    expect(res.body.data).toEqual([{ id: "1" }]);
    expect(res.body.pagination).toEqual({ page: 1, limit: 5, total: 1, totalPages: 1 });
  });

  it("GET par id", async () => {
    m().findUnique.mockResolvedValue({ id: "1" });
    const res = await request(app).get(`${r.path}/1`).set("Authorization", r.writer).expect(200);
    expect(res.body.data).toEqual({ id: "1" });
  });

  it("GET par id inexistant (404)", async () => {
    m().findUnique.mockResolvedValue(null);
    await request(app).get(`${r.path}/x`).set("Authorization", r.writer).expect(404);
  });

  it("POST crée la ressource (201)", async () => {
    m().findUnique.mockResolvedValue(null);
    m().create.mockResolvedValue({ id: "new" });
    const res = await request(app).post(r.path).set("Authorization", r.writer).send(r.body).expect(201);
    expect(res.body.data).toEqual({ id: "new" });
  });

  it("POST invalide (400)", async () => {
    const res = await request(app).post(r.path).set("Authorization", r.writer).send({}).expect(400);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it("PUT met à jour", async () => {
    m().findUnique.mockResolvedValue({ id: "1" });
    m().update.mockResolvedValue({ id: "1", ...r.patch });
    await request(app).put(`${r.path}/1`).set("Authorization", r.writer).send(r.patch).expect(200);
  });

  it("PUT sur ressource inexistante (404)", async () => {
    m().findUnique.mockResolvedValue(null);
    await request(app).put(`${r.path}/x`).set("Authorization", r.writer).send(r.patch).expect(404);
  });

  it("DELETE supprime", async () => {
    m().findUnique.mockResolvedValue({ id: "1" });
    m().delete.mockResolvedValue({ id: "1" });
    await request(app).delete(`${r.path}/1`).set("Authorization", r.remover).expect(200);
  });

  it("DELETE sur ressource inexistante (404)", async () => {
    m().findUnique.mockResolvedValue(null);
    await request(app).delete(`${r.path}/x`).set("Authorization", r.remover).expect(404);
  });
});

describe("Règles d'unicité et rôles", () => {
  it("POST /users refuse un email déjà utilisé (409)", async () => {
    db.user.findUnique.mockResolvedValue({ id: "1" });
    await request(app).post("/v1/users").set("Authorization", admin)
      .send(resources[0].body).expect(409);
  });

  it("POST /users hache le mot de passe", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({ id: "1" });
    await request(app).post("/v1/users").set("Authorization", admin).send(resources[0].body).expect(201);
    const { data } = db.user.create.mock.calls[0][0];
    expect(data.password).not.toBe("password123");
  });

  it("POST /candidates refuse un email déjà utilisé (409)", async () => {
    db.candidate.findUnique.mockResolvedValue({ id: "1" });
    await request(app).post("/v1/candidates").set("Authorization", admin)
      .send(resources[1].body).expect(409);
  });

  it("DELETE refusé à un recruteur (403)", async () => {
    await request(app).delete("/v1/jobs/1").set("Authorization", recruiter).expect(403);
  });
});
