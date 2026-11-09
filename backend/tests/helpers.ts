import jwt from "jsonwebtoken";

export const tokenFor = (role: "ADMIN" | "RECRUITER", id = "u1") =>
  `Bearer ${jwt.sign({ id, role }, "test-secret")}`;

export const admin = tokenFor("ADMIN");
export const recruiter = tokenFor("RECRUITER");
