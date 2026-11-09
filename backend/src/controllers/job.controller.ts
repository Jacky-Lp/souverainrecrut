import { JobService } from "../services/job.service";
import { CrudController } from "./crud.controller";

export class JobController extends CrudController {
  constructor() {
    super(new JobService());
  }
}

export const jobController = new JobController();
