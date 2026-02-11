import jwt from "jsonwebtoken";
import { config } from "../config";

export function signJwt(payload: object) {
  if (!config.jwtSecret) throw new Error("JWT_SECRET is not defined");

  return jwt.sign(
    payload,
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as unknown as jwt.SignOptions
  );
}

export function verifyJwt(token: string) {
  if (!config.jwtSecret) throw new Error("JWT_SECRET is not defined");

  return jwt.verify(token, config.jwtSecret) as any;
}
