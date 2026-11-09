import { Candidate, Prisma } from "@prisma/client";

import { CandidateRepository } from "../repositories/candidate.repository";
import { AppError } from "../errors/app.error";
import { CrudService } from "./crud.service";

export class CandidateService extends CrudService<Candidate> {
  constructor() {
    super(new CandidateRepository(), "Candidat introuvable.");
  }

  /**
   * Crée un candidat.
   */
  async create(data: Prisma.CandidateCreateInput) {
    const repository = this.repository as CandidateRepository;

    if (await repository.findByEmail(data.email)) {
      throw new AppError(
        "Un candidat avec cet email existe déjà.",
        409
      );
    }

    return repository.create(data);
  }
}
