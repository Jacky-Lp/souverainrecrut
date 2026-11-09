import bcrypt from "bcrypt";
import { Prisma, User } from "@prisma/client";

import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../errors/app.error";
import { CrudService } from "./crud.service";

export class UserService extends CrudService<User> {
  constructor() {
    super(new UserRepository(), "Utilisateur introuvable.");
  }

  private get users() {
    return this.repository as UserRepository;
  }

  /**
   * Retourne le profil de l'utilisateur connecté.
   */
  async getProfile(id: string) {
    const user = await this.users.findProfile(id);

    if (!user) {
      throw new AppError("Utilisateur introuvable.", 404);
    }

    return user;
  }

  /**
   * Crée un utilisateur.
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    if (await this.users.findByEmail(data.email)) {
      throw new AppError("Cet email est déjà utilisé.", 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.users.create({
      ...data,
      password: hashedPassword,
    });
  }
}
