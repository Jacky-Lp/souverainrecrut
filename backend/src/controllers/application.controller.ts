import { ApplicationService } from "../services/application.service";
import { CrudController } from "./crud.controller";

export class ApplicationController extends CrudController {
  constructor() {
    super(new ApplicationService());
  }
}

export const applicationController = new ApplicationController();
