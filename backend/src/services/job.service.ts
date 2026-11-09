import { Job, Prisma } from "@prisma/client";

import { JobRepository } from "../repositories/job.repository";
import { CrudService } from "./crud.service";

export class JobService extends CrudService<Job> {
  constructor() {
    super(new JobRepository(), "Offre introuvable.");
  }

  /**
   * Crée une offre d'emploi.
   */
  async create(data: Prisma.JobCreateInput) {
    return (this.repository as JobRepository).create(data);
  }
}
