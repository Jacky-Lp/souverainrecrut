import {
  Application,
  ApplicationStatus,
  Prisma,
} from "@prisma/client";

import { ApplicationRepository } from "../repositories/application.repository";
import { CrudService } from "./crud.service";

export class ApplicationService extends CrudService<Application> {
  constructor() {
    super(new ApplicationRepository(), "Candidature introuvable.");
  }

  /**
   * Crée une candidature.
   */
  async create(data: Prisma.ApplicationCreateInput) {
    return (this.repository as ApplicationRepository).create(data);
  }

  /**
   * Met à jour le statut d'une candidature.
   */
  async updateStatus(id: string, status: ApplicationStatus) {
    await this.getById(id);

    return (this.repository as ApplicationRepository).updateStatus(
      id,
      status
    );
  }
}
