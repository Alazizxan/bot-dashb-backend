import jwt from "jsonwebtoken";
import { config } from "../config";

export function signJwt(payload: object) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function verifyJwt(token: string) {
  return jwt.verify(token, config.jwtSecret) as any;
}
