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
  it("POST /auth/login retourne un token et l'utilisateur sans mot de passe", async () => {
    // Arrange
    db.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.co",
      role: "ADMIN",
      password: await bcrypt.hash("password123", 4),
    });

    // Act
    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: "a@b.co", password: "password123" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).not.toHaveProperty("password");
  });

  it("POST /auth/login refuse un email inconnu (401)", async () => {
    // Arrange
    db.user.findUnique.mockResolvedValue(null);

    // Act
    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: "x@y.z", password: "p" });

    // Assert
    expect(res.status).toBe(401);
  });

  it("POST /auth/login refuse un mauvais mot de passe (401)", async () => {
    // Arrange
    db.user.findUnique.mockResolvedValue({
      id: "u1",
      role: "ADMIN",
      password: await bcrypt.hash("autre", 4),
    });

    // Act
    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: "a@b.co", password: "nope" });

    // Assert
    expect(res.status).toBe(401);
  });

  it("GET /auth/me retourne le profil", async () => {
    // Arrange
    db.user.findUnique.mockResolvedValue({ id: "u1", email: "a@b.co" });

    // Act
    const res = await request(app).get("/v1/auth/me").set("Authorization", admin);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("u1");
  });

  it("GET /auth/me retourne 404 si le profil est introuvable", async () => {
    // Arrange
    db.user.findUnique.mockResolvedValue(null);

    // Act
    const res = await request(app).get("/v1/auth/me").set("Authorization", admin);

    // Assert
    expect(res.status).toBe(404);
  });

  it("rejette un schéma d'autorisation invalide (401)", async () => {
    // Arrange
    const header = "Basic abc";

    // Act
    const res = await request(app).get("/v1/auth/me").set("Authorization", header);

    // Assert
    expect(res.status).toBe(401);
  });

  it("rejette un token falsifié (401)", async () => {
    // Arrange
    const header = "Bearer faux";

    // Act
    const res = await request(app).get("/v1/auth/me").set("Authorization", header);

    // Assert
    expect(res.status).toBe(401);
  });
});

describe("Dashboard", () => {
  it("GET /dashboard/stats retourne les compteurs", async () => {
    // Arrange
    for (const model of ["user", "candidate", "job", "application"]) {
      db[model].count.mockResolvedValue(2);
    }

    // Act
    const res = await request(app)
      .get("/v1/dashboard/stats")
      .set("Authorization", recruiter);

    // Assert
    expect(res.status).toBe(200);
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
    // Arrange : aucune dépendance à préparer

    // Act
    const res = await request(app).get("/v1/health");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("UP");
  });

  it("GET /v1/ready retourne 200 si la base répond", async () => {
    // Arrange
    db.$queryRaw.mockResolvedValue([1]);

    // Act
    const res = await request(app).get("/v1/ready");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("READY");
  });

  it("GET /v1/ready retourne 503 si la base est indisponible", async () => {
    // Arrange
    db.$queryRaw.mockRejectedValue(new Error("down"));

    // Act
    const res = await request(app).get("/v1/ready");

    // Assert
    expect(res.status).toBe(503);
    expect(res.body.data.status).toBe("NOT_READY");
  });

  it("GET /v1/info retourne les informations de l'API", async () => {
    // Arrange : aucune dépendance à préparer

    // Act
    const res = await request(app).get("/v1/info");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("SouverainRecrut API");
  });

  it("GET / retourne le message de bienvenue", async () => {
    // Arrange : aucune dépendance à préparer

    // Act
    const res = await request(app).get("/");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api-docs sert la documentation Swagger", async () => {
    // Arrange : aucune dépendance à préparer

    // Act
    const res = await request(app).get("/api-docs/");

    // Assert
    expect(res.status).toBe(200);
  });

  it("retourne 404 pour une route inconnue", async () => {
    // Arrange : aucune dépendance à préparer

    // Act
    const res = await request(app).get("/inconnu");

    // Assert
    expect(res.status).toBe(404);
  });

  it("retourne 500 pour une erreur inattendue", async () => {
    // Arrange
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    db.job.findMany.mockRejectedValue(new Error("boom"));
    db.job.count.mockResolvedValue(0);

    // Act
    const res = await request(app).get("/v1/jobs").set("Authorization", recruiter);

    // Assert
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe("Erreur interne du serveur.");
    spy.mockRestore();
  });
});
