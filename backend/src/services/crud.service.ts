import { AppError } from "../errors/app.error";

/**
 * Contrat minimal attendu d'un repository CRUD.
 */
export interface CrudRepository<T> {
  findAll(skip?: number, take?: number): Promise<{ items: T[]; total: number }>;
  findById(id: string): Promise<T | null>;
  update(id: string, data: any): Promise<T>;
  delete(id: string): Promise<T>;
}

/**
 * Service CRUD générique : lecture, mise à jour et suppression.
 */
export abstract class CrudService<T> {
  protected constructor(
    protected readonly repository: CrudRepository<T>,
    private readonly notFoundMessage: string
  ) {}

  async getAll(skip = 0, take = 10) {
    return this.repository.findAll(skip, take);
  }

  async getById(id: string): Promise<T> {
    const entity = await this.repository.findById(id);

    if (!entity) {
      throw new AppError(this.notFoundMessage, 404);
    }

    return entity;
  }

  async update(id: string, data: any): Promise<T> {
    await this.getById(id);

    return this.repository.update(id, data);
  }

  async delete(id: string): Promise<T> {
    await this.getById(id);

    return this.repository.delete(id);
  }
}
