import { AppError } from "../src/errors/app.error";
import { buildPaginationMeta, getPagination } from "../src/utils/pagination";

describe("getPagination", () => {
  it("applique les valeurs par défaut", () => {
    // Arrange : aucun paramètre

    // Act
    const result = getPagination();

    // Assert
    expect(result).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it("borne la page et la limite maximales", () => {
    // Arrange
    const page = "-5";
    const limit = "1000";

    // Act
    const result = getPagination(page, limit);

    // Assert
    expect(result).toEqual({ page: 1, limit: 100, skip: 0 });
  });

  it("borne la limite minimale", () => {
    // Arrange
    const page = "0";
    const limit = "0";

    // Act
    const result = getPagination(page, limit);

    // Assert
    expect(result).toEqual({ page: 1, limit: 1, skip: 0 });
  });

  it("calcule le décalage", () => {
    // Arrange
    const page = "3";
    const limit = "20";

    // Act
    const result = getPagination(page, limit);

    // Assert
    expect(result).toEqual({ page: 3, limit: 20, skip: 40 });
  });
});

describe("buildPaginationMeta", () => {
  it("calcule le nombre de pages", () => {
    // Arrange
    const total = 25;

    // Act
    const meta = buildPaginationMeta(1, 10, total);

    // Assert
    expect(meta).toEqual({ page: 1, limit: 10, total: 25, totalPages: 3 });
  });

  it("retourne 0 page quand il n'y a aucun résultat", () => {
    // Arrange
    const total = 0;

    // Act
    const meta = buildPaginationMeta(1, 10, total);

    // Assert
    expect(meta.totalPages).toBe(0);
  });
});

describe("AppError", () => {
  it("porte le message, le code HTTP et le statut opérationnel", () => {
    // Arrange
    const message = "oups";

    // Act
    const error = new AppError(message, 418);

    // Assert
    expect(error).toMatchObject({ message, statusCode: 418, isOperational: true });
  });

  it("utilise 500 comme code par défaut", () => {
    // Arrange : aucun code fourni

    // Act
    const error = new AppError("x");

    // Assert
    expect(error.statusCode).toBe(500);
  });
});
