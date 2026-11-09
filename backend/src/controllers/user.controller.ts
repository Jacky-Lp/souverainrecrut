import { UserService } from "../services/user.service";
import { CrudController } from "./crud.controller";

export class UserController extends CrudController {
  constructor() {
    super(new UserService());
  }
}

export const userController = new UserController();
