import { AppError } from "../src/errors/app.error";
import { buildPaginationMeta, getPagination } from "../src/utils/pagination";

describe("getPagination", () => {
  it("applique les valeurs par défaut", () => {
    expect(getPagination()).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it("borne la page et la limite", () => {
    expect(getPagination("-5", "1000")).toEqual({ page: 1, limit: 100, skip: 0 });
    expect(getPagination("0", "0")).toEqual({ page: 1, limit: 1, skip: 0 });
  });

  it("calcule le décalage", () => {
    expect(getPagination("3", "20")).toEqual({ page: 3, limit: 20, skip: 40 });
  });
});

describe("buildPaginationMeta", () => {
  it("calcule le nombre de pages", () => {
    expect(buildPaginationMeta(1, 10, 25)).toEqual({ page: 1, limit: 10, total: 25, totalPages: 3 });
    expect(buildPaginationMeta(1, 10, 0).totalPages).toBe(0);
  });
});

describe("AppError", () => {
  it("porte le code HTTP et le statut opérationnel", () => {
    const error = new AppError("oups", 418);
    expect(error).toMatchObject({ message: "oups", statusCode: 418, isOperational: true });
    expect(new AppError("x").statusCode).toBe(500);
  });
});
