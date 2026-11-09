import { CandidateService } from "../services/candidate.service";
import { CrudController } from "./crud.controller";

export class CandidateController extends CrudController {
  constructor() {
    super(new CandidateService());
  }
}

export const candidateController = new CandidateController();
