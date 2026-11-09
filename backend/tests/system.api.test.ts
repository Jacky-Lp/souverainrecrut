import bcrypt from "bcrypt";
import request from "supertest";

import app from "../src/app";
import { prisma } from "../src/config/prisma";
import { admin, recruiter } from "./helpers";

jest.mock("../src/config/prisma", () => require("./prisma.mock"));

const db = prisma as any;

beforeEach(() => {
  jest.resetAllMocks();
});

describe("Auth", () => {
  it("POST /auth/login retourne un token", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.co",
      role: "ADMIN",
      password: await bcrypt.hash("password123", 4),
    });

    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: "a@b.co", password: "password123" })
      .expect(200);

    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).not.toHaveProperty("password");
  });

  it("POST /auth/login refuse un email inconnu (401)", async () => {
    db.user.findUnique.mockResolvedValue(null);
    await request(app).post("/v1/auth/login").send({ email: "x@y.z", password: "p" }).expect(401);
  });

  it("POST /auth/login refuse un mauvais mot de passe (401)", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "u1",
      role: "ADMIN",
      password: await bcrypt.hash("autre", 4),
    });
    await request(app).post("/v1/auth/login").send({ email: "a@b.co", password: "nope" }).expect(401);
  });

  it("GET /auth/me retourne le profil", async () => {
    db.user.findUnique.mockResolvedValue({ id: "u1", email: "a@b.co" });
    const res = await request(app).get("/v1/auth/me").set("Authorization", admin).expect(200);
    expect(res.body.data.id).toBe("u1");
  });

  it("GET /auth/me avec profil introuvable (404)", async () => {
    db.user.findUnique.mockResolvedValue(null);
    await request(app).get("/v1/auth/me").set("Authorization", admin).expect(404);
  });

  it("rejette un en-tête Authorization invalide ou un token falsifié", async () => {
    await request(app).get("/v1/auth/me").set("Authorization", "Basic abc").expect(401);
    await request(app).get("/v1/auth/me").set("Authorization", "Bearer faux").expect(401);
  });
});

describe("Dashboard", () => {
  it("GET /dashboard/stats retourne les compteurs", async () => {
    for (const model of ["user", "candidate", "job", "application"]) {
      db[model].count.mockResolvedValue(2);
    }
    const res = await request(app).get("/v1/dashboard/stats").set("Authorization", recruiter).expect(200);
    expect(res.body.data).toEqual({
      users: 2,
      candidates: 2,
      jobs: 2,
      applications: 2,
      pendingApplications: 2,
    });
  });
});

describe("Santé, info et application", () => {
  it("GET /v1/health retourne UP", async () => {
    const res = await request(app).get("/v1/health").expect(200);
    expect(res.body.data.status).toBe("UP");
  });

  it("GET /v1/ready retourne 200 si la base répond", async () => {
    db.$queryRaw.mockResolvedValue([1]);
    await request(app).get("/v1/ready").expect(200);
  });

  it("GET /v1/ready retourne 503 si la base est indisponible", async () => {
    db.$queryRaw.mockRejectedValue(new Error("down"));
    await request(app).get("/v1/ready").expect(503);
  });

  it("GET /v1/info retourne les informations de l'API", async () => {
    const res = await request(app).get("/v1/info").expect(200);
    expect(res.body.data.name).toBe("SouverainRecrut API");
  });

  it("GET / retourne le message de bienvenue", async () => {
    await request(app).get("/").expect(200);
  });

  it("GET /api-docs sert la documentation Swagger", async () => {
    await request(app).get("/api-docs/").expect(200);
  });

  it("une route inconnue retourne 404", async () => {
    await request(app).get("/inconnu").expect(404);
  });

  it("une erreur inattendue retourne 500", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    db.job.findMany.mockRejectedValue(new Error("boom"));
    db.job.count.mockResolvedValue(0);
    await request(app).get("/v1/jobs").set("Authorization", recruiter).expect(500);
    spy.mockRestore();
  });
});
